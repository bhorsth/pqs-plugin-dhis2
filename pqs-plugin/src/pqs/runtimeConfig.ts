import { DEFAULT_FIELD_IDS } from './pqsFieldMapping'

export type ApiVersionStrategy = 'auto' | 'fixed' | 'omit'

export type PqsTrackerUidsConfig = {
    /** DHIS2 Program UID (Tracker). */
    programUid?: string
    /** TrackedEntityType UID (optional; only if needed by this plugin). */
    trackedEntityTypeUid?: string
    /** ProgramStage UID (optional; only if needed by this plugin). */
    programStageUid?: string

    /**
     * Tracked entity attribute UIDs (or other Capture fieldIds) used by the plugin.
     * Keys are semantic names; values must be the DHIS2 fieldId strings used by Capture.
     */
    attributes?: Record<string, string>

    /** Optional hard-coded data element UIDs moved to config. */
    dataElements?: Record<string, string>
    /** Optional hard-coded option set UIDs moved to config. */
    optionSets?: Record<string, string>
}

export type PqsPluginRuntimeConfig = {
    routeCode: string
    catalogPath: string
    enableImages: boolean
    routeApiResource: string
    apiVersionStrategy: ApiVersionStrategy
    apiVersion?: string | number
    routeUid?: string

    /**
     * Tracker metadata UIDs and fieldIds to avoid hard-coding them in the bundle.
     * In Capture form field plugins, the `fieldId` that `setFieldValue` expects is often
     * the tracked entity attribute UID; however, some instances may use aliases.
     *
     * If `fieldIds` is provided, the plugin will use it directly.
     * Otherwise it will fall back to `trackerUids.attributes` and finally to built-in defaults.
     */
    trackerUids?: PqsTrackerUidsConfig

    /**
     * Capture fieldIds used when setting values. Prefer using TEA UIDs here.
     * Keys must match the plugin’s semantic mapping (e.g. `pqsCode`, `company`, ...).
     */
    fieldIds?: Record<string, string>
}

export const DATASTORE_NAMESPACE = 'pqsPlugin'
export const DATASTORE_KEY = 'config'

export function defaultRuntimeConfig(): PqsPluginRuntimeConfig {
    return {
        routeCode: 'pqsCatalogue',
        catalogPath:
            '/prequal/sites/default/files/immunization_devices/json/catalogs/immunization_devices_catalogue.json',
        enableImages: true,
        routeApiResource: 'routes',
        apiVersionStrategy: 'fixed',
        apiVersion: 42,
        fieldIds: DEFAULT_FIELD_IDS,
    }
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function parseRuntimeConfig(raw: unknown): PqsPluginRuntimeConfig | null {
    if (!isRecord(raw)) return null
    const base = defaultRuntimeConfig()
    const merged: PqsPluginRuntimeConfig = { ...base, ...(raw as any) }
    return merged
}

function envOverrideConfig(): PqsPluginRuntimeConfig | null {
    const env = (globalThis as any)?.process?.env
    const raw = env?.VITE_PQS_PLUGIN_CONFIG_JSON
    if (typeof raw !== 'string' || raw.trim().length === 0) return null
    try {
        const parsed = JSON.parse(raw)
        return parseRuntimeConfig(parsed)
    } catch {
        return null
    }
}

function contextPathFromPathname(pathname: string): string {
    const idx = pathname.indexOf('/api')
    if (idx <= 0) return ''
    return pathname.slice(0, idx)
}

/**
 * DHIS2 instance base URL, including any context path (e.g. `https://host/sandbox-dev`).
 * Used so `/api/...` requests are rooted under the instance name, not the domain root.
 */
export function resolveDhis2BaseUrl(): string | null {
    if (typeof window === 'undefined') return null

    const metaBaseUrl = window.document
        ?.querySelector?.('meta[name="dhis2-base-url"]')
        ?.getAttribute?.('content')

    if (metaBaseUrl && metaBaseUrl !== '__DHIS2_BASE_URL__') {
        return new URL(metaBaseUrl, window.location.origin).href.replace(/\/$/, '')
    }

    const shellBase = (globalThis as any)?.process?.env?.REACT_APP_DHIS2_BASE_URL
    if (typeof shellBase === 'string' && shellBase.length > 0) {
        return shellBase.replace(/\/$/, '')
    }

    const isLocalVite =
        window.location.hostname === 'localhost' &&
        (window.location.port === '3000' || window.location.port === '3001')
    if (isLocalVite) {
        return window.location.origin
    }

    const ctx = contextPathFromPathname(window.location.pathname)
    return `${window.location.origin}${ctx}`.replace(/\/$/, '') || window.location.origin
}

/** Path prefix before `/api`, e.g. `/sandbox-dev` or empty at domain root. */
export function dhis2ContextPath(): string {
    const base = resolveDhis2BaseUrl()
    if (!base) return ''
    try {
        const pathname = new URL(base).pathname.replace(/\/$/, '')
        return pathname === '' || pathname === '/' ? '' : pathname
    } catch {
        return ''
    }
}

/** Unversioned API root, e.g. `/sandbox-dev/api` or `/api`. */
export function dhis2UnversionedApiBase(): string {
    const prefix = dhis2ContextPath()
    return `${prefix}/api`
}

export function apiBasePath(config: PqsPluginRuntimeConfig): string {
    const apiRoot = dhis2UnversionedApiBase()
    const strat = config.apiVersionStrategy
    if (strat === 'omit') return apiRoot
    if (strat === 'fixed') return `${apiRoot}/${config.apiVersion ?? 42}`
    // "auto": prefer unversioned API (works across DHIS2 versions) and fall back to a configured version.
    return typeof config.apiVersion !== 'undefined' ? `${apiRoot}/${config.apiVersion}` : apiRoot
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
    const res = await fetch(url, {
        ...init,
        headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
        credentials: 'same-origin',
    })
    const text = await res.text()
    let json: unknown = null
    if (text) {
        try {
            json = JSON.parse(text)
        } catch {
            json = null
        }
    }
    if (!res.ok) {
        const msg = json && isRecord(json) && typeof (json as any).message === 'string'
            ? String((json as any).message)
            : text.slice(0, 600)
        throw new Error(`request_failed_${res.status}_${msg || res.statusText}`)
    }
    return json
}

export async function loadRuntimeConfig(): Promise<PqsPluginRuntimeConfig> {
    const fromEnv = envOverrideConfig()
    if (fromEnv) return fromEnv

    const url = `${dhis2UnversionedApiBase()}/dataStore/${DATASTORE_NAMESPACE}/${DATASTORE_KEY}`
    try {
        const json = await fetchJson(url)
        const parsed = parseRuntimeConfig(json)
        if (!parsed) throw new Error('invalid_datastore_config')

        // Migration: ensure `fieldIds` exists so admins can see/edit the mapping in DataStore.
        if (!parsed.fieldIds || Object.keys(parsed.fieldIds).length === 0) {
            const merged: PqsPluginRuntimeConfig = {
                ...parsed,
                fieldIds: DEFAULT_FIELD_IDS,
            }
            try {
                await fetch(url, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(merged),
                    credentials: 'same-origin',
                })
                return merged
            } catch {
                // If the user lacks permissions, just continue without persisting.
                return merged
            }
        }
        return parsed
    } catch (e) {
        const msg = String(e)
        // If missing, create default config so admins can edit it.
        if (msg.includes('request_failed_404')) {
            const def = defaultRuntimeConfig()
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(def),
                credentials: 'same-origin',
            })
            return def
        }
        throw e
    }
}

export type RouteDiscoveryResult =
    | { ok: true; routeUid: string }
    | { ok: false; error: string }

export async function discoverRouteUid(config: PqsPluginRuntimeConfig): Promise<RouteDiscoveryResult> {
    const routeCode = String(config.routeCode || '').trim()
    if (!routeCode) {
        return { ok: false, error: 'Missing configuration: routeCode (DataStore pqsPlugin/config).' }
    }
    if (config.routeUid) return { ok: true, routeUid: config.routeUid }

    const base = apiBasePath(config)
    const resource = config.routeApiResource || 'routes'
    const url = `${base}/${resource}?fields=id,code,name&paging=false`
    try {
        const json = await fetchJson(url)
        const routes = isRecord(json) && Array.isArray((json as any).routes) ? (json as any).routes : (json as any)
        const list = Array.isArray(routes) ? routes : []
        const exactCode = list.find((r) => isRecord(r) && (r as any).code === routeCode)
        const byName = list.find((r) => isRecord(r) && (r as any).name === routeCode)
        const match = exactCode ?? byName
        const id = match && isRecord(match) ? (match as any).id : null
        if (typeof id !== 'string' || !id) {
            return { ok: false, error: `No Route Manager route matched routeCode "${routeCode}".` }
        }
        return { ok: true, routeUid: id }
    } catch (e) {
        return { ok: false, error: `Failed to discover route UID. ${String(e)}` }
    }
}

