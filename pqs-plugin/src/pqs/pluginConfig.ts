import {
    DEFAULT_ROUTE_MANAGER_API_VERSION,
    type PqsSemanticFieldKey,
} from './dhis2Artifacts'

export type PqsPluginFieldAliases = Partial<Record<PqsSemanticFieldKey, string>>

export type PqsPluginConfig = {
    routeManager: {
        apiVersion: number
        routeId: string
    } | null
    /**
     * Catalogue URL handling:
     * - If `catalogUrl` is provided, it is used as-is.
     * - Otherwise, if `catalogPath` is provided, it is resolved under Route Manager run base.
     */
    catalogUrl: string | null
    catalogPath: string | null
    /** Catalogue bucket key, e.g. "e003". */
    catalogBucketKey: string
    /** If true, upload device image to DHIS2 fileResources when online. */
    enableImageUpload: boolean
    /** Optional explicit plugin aliases for semantic fields. */
    fieldAliases: PqsPluginFieldAliases
    /** Enables console debug logging (never sends network logs). */
    debugLogging: boolean
}

export const DEFAULT_PQS_PLUGIN_CONFIG: PqsPluginConfig = {
    routeManager: null,
    catalogUrl: null,
    catalogPath:
        '/prequal/sites/default/files/immunization_devices/json/catalogs/immunization_devices_catalogue.json',
    catalogBucketKey: 'e003',
    enableImageUpload: true,
    fieldAliases: {},
    debugLogging: false,
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function asString(v: unknown): string | null {
    return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
}

function asBoolean(v: unknown): boolean | null {
    return typeof v === 'boolean' ? v : null
}

function asNumber(v: unknown): number | null {
    return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/**
 * Capture plugin configuration is passed through props, but the exact key varies by version/shell.
 * This function is defensive: it checks a few common keys and also accepts a JSON string.
 */
export function readRawPluginConfig(props: Record<string, unknown>): unknown {
    const candidates = [
        (props as any).pluginConfig,
        (props as any).config,
        (props as any).settings,
        (props as any).customConfig,
    ]

    for (const c of candidates) {
        if (c == null) continue
        if (typeof c === 'string') {
            try {
                return JSON.parse(c)
            } catch {
                return c
            }
        }
        return c
    }

    return null
}

export function parsePqsPluginConfig(raw: unknown): PqsPluginConfig {
    const base: PqsPluginConfig = { ...DEFAULT_PQS_PLUGIN_CONFIG }
    if (!isRecord(raw)) return base

    const routeManagerRaw = raw.routeManager
    if (isRecord(routeManagerRaw)) {
        const routeId = asString(routeManagerRaw.routeId ?? (raw as any).routeManagerRouteId)
        const apiVersion =
            asNumber(routeManagerRaw.apiVersion ?? (raw as any).routeManagerApiVersion) ??
            DEFAULT_ROUTE_MANAGER_API_VERSION
        if (routeId) {
            base.routeManager = { routeId, apiVersion }
        }
    } else {
        const routeId = asString((raw as any).routeManagerRouteId)
        if (routeId) {
            base.routeManager = {
                routeId,
                apiVersion:
                    asNumber((raw as any).routeManagerApiVersion) ??
                    DEFAULT_ROUTE_MANAGER_API_VERSION,
            }
        }
    }

    base.catalogUrl = asString((raw as any).catalogUrl) ?? base.catalogUrl
    base.catalogPath = asString((raw as any).catalogPath) ?? base.catalogPath
    base.catalogBucketKey =
        asString((raw as any).catalogBucketKey) ?? base.catalogBucketKey

    base.enableImageUpload =
        asBoolean((raw as any).enableImageUpload) ?? base.enableImageUpload
    base.debugLogging = asBoolean((raw as any).debugLogging) ?? base.debugLogging

    const fa = (raw as any).fieldAliases
    if (isRecord(fa)) {
        const out: PqsPluginFieldAliases = { ...base.fieldAliases }
        for (const [k, v] of Object.entries(fa)) {
            const key = k as PqsSemanticFieldKey
            const s = asString(v)
            if (s) out[key] = s
        }
        base.fieldAliases = out
    }

    return base
}

