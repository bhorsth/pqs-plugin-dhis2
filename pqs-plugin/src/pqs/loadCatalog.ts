import type { PqsCatalogueDevice } from './pqsFieldMapping'

const E003_KEY = 'e003'

/**
 * Same-origin path for Route Manager on the DHIS2 instance (e.g. http://localhost:8080).
 * Map this path to the WHO catalogue URL in Route Manager.
 */
export const PQS_CATALOG_PATH =
    '/pqs-catalog/immunization_devices_catalogue.json'

/**
 * Resolves catalogue URL: optional `process.env.VITE_PQS_CATALOG_URL` (tests / tooling),
 * otherwise `{origin}{PQS_CATALOG_PATH}` in the browser.
 */
export function resolveCatalogUrl(): string {
    const fromEnv =
        typeof process !== 'undefined' &&
        process.env &&
        typeof process.env.VITE_PQS_CATALOG_URL === 'string' &&
        process.env.VITE_PQS_CATALOG_URL.length > 0
            ? process.env.VITE_PQS_CATALOG_URL
            : undefined
    if (fromEnv) return fromEnv
    if (typeof window !== 'undefined' && window.location?.origin) {
        return new URL(PQS_CATALOG_PATH, window.location.origin).href
    }
    return PQS_CATALOG_PATH
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
        const res = await fetch(catalogUrl, {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
        })
        if (!res.ok) {
            return {
                ok: false,
                error: `Catalog request failed (${res.status} ${res.statusText})`,
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
