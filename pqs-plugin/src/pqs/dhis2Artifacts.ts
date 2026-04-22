export type RouteManagerConfig = {
    apiVersion: number
    routeId: string
}

export const DEFAULT_ROUTE_MANAGER_API_VERSION = 42

/**
 * Build DHIS2 Route Manager "run" base path.
 * Example: /api/42/routes/<uid>/run
 */
export function buildRouteRunBase(cfg: RouteManagerConfig): string {
    return `/api/${cfg.apiVersion}/routes/${cfg.routeId}/run`
}

export type PqsSemanticFieldKey =
    | 'pqsCode'
    | 'pqsCategory'
    | 'typeOfAppliance'
    | 'company'
    | 'manufacturedIn'
    | 'manufacturersReference'
    | 'energySource'
    | 'vaccineStorageCapacityL'
    | 'vaccineGrossVolumeL'
    | 'freezerGrossVolumeL'
    | 'applianceImage'

export const REQUIRED_SEMANTIC_FIELDS: readonly PqsSemanticFieldKey[] = [
    'pqsCode',
    'pqsCategory',
    'typeOfAppliance',
    'company',
    'manufacturedIn',
    'manufacturersReference',
    'energySource',
    'vaccineStorageCapacityL',
    'vaccineGrossVolumeL',
    'freezerGrossVolumeL',
    'applianceImage',
] as const

