import type { PqsCatalogueDevice } from './pqsFieldMapping'
import { apiBasePath, resolveDhis2BaseUrl, type PqsPluginRuntimeConfig } from './runtimeConfig'

const E003_KEY = 'e003'

/**
 * DHIS2 Route Manager wildcard route base.
 *
 * This plugin proxies BOTH:
 * - WHO catalogue JSON (`catalogPath` from runtime config)
 * - device images (by appending the image URL pathname)
 *
 * The Route Manager route MUST be configured as a wildcard route, ending with `/**`,
 * e.g. `https://extranet.who.int/**`, otherwise DHIS2 will reject sub-paths after `/run`.
 */
export function routeRunBase(
    config: PqsPluginRuntimeConfig,
    routeUid: string
): string {
    const base = apiBasePath(config)
    const resource = config.routeApiResource || 'routes'
    return `${base}/${resource}/${routeUid}/run`
}

/**
 * Resolves catalogue URL: optional `VITE_PQS_CATALOG_URL` (Jest/Node tooling),
 * otherwise `{baseUrl}{routeRunBase}{catalogPath}` in the browser.
 */
export function resolveCatalogUrl(
    config: PqsPluginRuntimeConfig,
    routeUid: string
): string {
    const fromEnv = (globalThis as any)?.process?.env?.VITE_PQS_CATALOG_URL
    if (typeof fromEnv === 'string' && fromEnv.length > 0) {
        return fromEnv
    }
    if (typeof window !== 'undefined') {
        const base = resolveDhis2BaseUrl() ?? window.location.origin
        const rr = routeRunBase(config, routeUid)
        const path = config.catalogPath || ''
        return new URL(`${rr}${path}`, base).href
    }
    const rr = routeRunBase(config, routeUid)
    const path = config.catalogPath || ''
    return `${rr}${path}`
}

export type LoadCatalogResult =
    | { ok: true; devices: PqsCatalogueDevice[] }
    | { ok: false; error: string }

let memoryDevices: PqsCatalogueDevice[] | null = null
let memoryUrl: string | null = null

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function normalizeDevice(raw: unknown): PqsCatalogueDevice | null {
    if (!isRecord(raw)) return null
    const id = raw.id
    if (typeof id !== 'string') return null
    const details = isRecord(raw.details) ? raw.details : undefined
    const specs = isRecord(raw.specifications) ? raw.specifications : undefined
    const stringDetails: Record<string, string | number | undefined> = {}
    if (details) {
        for (const [k, v] of Object.entries(details)) {
            if (typeof v === 'string' || typeof v === 'number') stringDetails[k] = v
        }
    }
    const stringSpecs: Record<string, Record<string, string | number | undefined>> = {}
    if (specs) {
        for (const [gk, gv] of Object.entries(specs)) {
            if (!isRecord(gv)) continue
            const inner: Record<string, string | number | undefined> = {}
            for (const [k, v] of Object.entries(gv)) {
                if (typeof v === 'string' || typeof v === 'number') inner[k] = v
            }
            stringSpecs[gk] = inner
        }
    }
    return {
        id,
        title: typeof raw.title === 'string' ? raw.title : undefined,
        main_image:
            typeof raw.main_image === 'string' ? raw.main_image : undefined,
        details: stringDetails,
        specifications: stringSpecs,
    }
}

/**
 * Fetches the full WHO catalogue JSON, keeps only `e003` (PQS type E003), caches per URL in memory.
 */
export async function loadE003Devices(catalogUrl: string): Promise<LoadCatalogResult> {
    if (memoryDevices && memoryUrl === catalogUrl) {
        return { ok: true, devices: memoryDevices }
    }

    try {
        const isCrossOrigin =
            typeof window !== 'undefined'
                ? new URL(catalogUrl, window.location.href).origin !==
                  window.location.origin
                : false

        const res = await fetch(catalogUrl, {
            // Route-manager fetch may be cross-origin in local dev (3000 -> 9099 proxy),
            // so include credentials to forward DHIS2 session cookies.
            credentials: isCrossOrigin ? 'include' : 'same-origin',
            headers: { Accept: 'application/json' },
        })
        if (!res.ok) {
            return {
                ok: false,
                error: `Catalog request failed (${res.status} ${res.statusText})`,
            }
        }
        const contentType = res.headers.get('content-type') || ''
        if (!contentType.toLowerCase().includes('application/json')) {
            const bodyPreview = (await res.text()).slice(0, 80)
            return {
                ok: false,
                error: `Catalog response is not JSON (content-type: ${contentType || 'unknown'}). ${bodyPreview}`,
            }
        }
        const json: unknown = await res.json()
        if (!isRecord(json)) {
            return { ok: false, error: 'Catalog JSON is not an object' }
        }
        const bucket = json[E003_KEY]
        if (!Array.isArray(bucket)) {
            return {
                ok: false,
                error: `Catalog has no "${E003_KEY}" array`,
            }
        }
        const devices: PqsCatalogueDevice[] = []
        for (const row of bucket) {
            const d = normalizeDevice(row)
            if (d) devices.push(d)
        }
        memoryDevices = devices
        memoryUrl = catalogUrl
        return { ok: true, devices }
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        return {
            ok: false,
            error: message || 'Failed to load catalogue',
        }
    }
}

export function clearCatalogCache(): void {
    memoryDevices = null
    memoryUrl = null
}
