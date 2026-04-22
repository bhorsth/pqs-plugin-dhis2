import type { PqsCatalogueDevice } from './pqsFieldMapping'
import { buildRouteRunBase, type RouteManagerConfig } from './dhis2Artifacts'

/**
 * Resolves a base URL for this browser/session.
 * - Prefers injected `meta[name="dhis2-base-url"]` when present.
 * - Falls back to app-shell env var when available.
 * - In local dev, keeps `/api` requests same-origin so Vite proxy can forward.
 */
export function resolveBaseUrl(): string {
    if (typeof window === 'undefined') return ''

    const metaBaseUrl = window.document
        ?.querySelector?.('meta[name="dhis2-base-url"]')
        ?.getAttribute?.('content')

    const injectedBase =
        metaBaseUrl && metaBaseUrl !== '__DHIS2_BASE_URL__'
            ? new URL(metaBaseUrl, window.location.origin).href
            : null

    // In development, the app-shell injects DHIS2_BASE_URL via env vars
    const shellBase = (globalThis as any)?.process?.env?.REACT_APP_DHIS2_BASE_URL
    const envBase = typeof shellBase === 'string' && shellBase.length > 0 ? shellBase : null

    const isLocalVite =
        window.location.hostname === 'localhost' &&
        (window.location.port === '3000' || window.location.port === '3001')

    const devProxyBase = isLocalVite ? window.location.origin : null

    return injectedBase ?? envBase ?? devProxyBase ?? window.location.origin
}

export function buildCatalogUrl(args: {
    baseUrl: string
    routeManager: RouteManagerConfig
    catalogPath: string
}): string {
    const runBase = buildRouteRunBase(args.routeManager)
    const p = args.catalogPath.startsWith('/') ? args.catalogPath : `/${args.catalogPath}`
    return new URL(`${runBase}${p}`, args.baseUrl).href
}

/**
 * Resolves catalogue URL:
 * - Optional `VITE_PQS_CATALOG_URL` (Jest/Node tooling)
 * - Otherwise use Route Manager run base + `catalogPath`
 */
export function resolveCatalogUrl(args: {
    routeManager: RouteManagerConfig
    catalogPath: string
}): string {
    const fromEnv = (globalThis as any)?.process?.env?.VITE_PQS_CATALOG_URL
    if (typeof fromEnv === 'string' && fromEnv.length > 0) {
        return fromEnv
    }
    const baseUrl = resolveBaseUrl()
    return buildCatalogUrl({
        baseUrl,
        routeManager: args.routeManager,
        catalogPath: args.catalogPath,
    })
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
 * Fetches WHO catalogue JSON, keeps only a configured bucket key, caches per URL in memory.
 */
export async function loadBucketDevices(args: {
    catalogUrl: string
    bucketKey: string
}): Promise<LoadCatalogResult> {
    const { catalogUrl, bucketKey } = args
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
        const bucket = json[bucketKey]
        if (!Array.isArray(bucket)) {
            return {
                ok: false,
                error: `Catalog has no "${bucketKey}" array`,
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
