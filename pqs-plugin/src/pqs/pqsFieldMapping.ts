/**
 * Tracker / Capture field mapping.
 *
 * In DHIS2 Capture, `setFieldValue({ fieldId })` typically expects the tracked entity attribute UID.
 * This plugin supports configuring those UIDs at runtime (DHIS2 DataStore) so nothing is hard-coded
 * in the bundle.
 *
 * | DHIS2 attribute (displayName)     | id / plugin alias | PQS JSON source |
 * |-----------------------------------|---------------------|-----------------|
 * | PQS code                          | (configured) → `pqsCode` | id / details["imd-pqs_code"] |
 * | PQS category                      | (configured) → `pqsCategory` | details.appliance_type |
 * | Type of appliance                 | (configured) → `typeOfAppliance` | details.product_description or product_name |
 * | Company                           | (configured) → `company` | details.manufacturer |
 * | Manufactured in                   | (configured) → `manufacturedIn` | details.country_of_manufacture |
 * | Manufacturer's reference          | (configured) → `manufacturersReference` | details.manufacturers_reference |
 * | Energy source                     | (configured) → `energySource` | specifications.product_specifications_main.energy_source |
 * | Vaccine storage capacity (litres) | (configured) → `vaccineStorageCapacityL` | refrigerator_vaccine_storage_capacity(l) or waterpack_storage_capacity_(litres) |
 * | Vaccine gross volume (litres)     | (configured) → `vaccineGrossVolumeL` | refrigerator's_gross_volume_(litres) |
 * | Freezer gross volume (litres)    | (configured) → `freezerGrossVolumeL` | freezer's_gross_volume_(litres) |
 * | Appliance image                   | (configured) → `applianceImage` | main_image (only when online; IMAGE type — verify on instance) |
 */
export const DEFAULT_FIELD_IDS = {
    pqsCode: 'pqsCODE',
    pqsCategory: 'pqsCAT',
    typeOfAppliance: 'typeofAPP',
    company: 'company',
    manufacturedIn: 'manufIN',
    manufacturersReference: 'manufREF',
    energySource: 'energySOURCE',
    vaccineStorageCapacityL: 'storageCAP',
    vaccineGrossVolumeL: 'vaccGROSSV',
    freezerGrossVolumeL: 'freezGROSSV',
    applianceImage: 'imageURL',
} as const

export type PqsFieldIdKey = keyof typeof DEFAULT_FIELD_IDS

export function fieldIdMapFromConfig(configFieldIds?: Record<string, string> | null | undefined) {
    if (!configFieldIds) return DEFAULT_FIELD_IDS
    const merged: Record<string, string> = { ...DEFAULT_FIELD_IDS }
    for (const [k, v] of Object.entries(configFieldIds)) {
        if (typeof v === 'string' && v.trim().length > 0) merged[k] = v.trim()
    }
    return merged as typeof DEFAULT_FIELD_IDS
}

export type PqsCatalogueDevice = {
    id: string
    title?: string
    main_image?: string
    details?: Record<string, string | number | undefined>
    specifications?: Record<string, Record<string, string | number | undefined>>
}

export type FieldUpdate = { fieldId: string; value: string | number }

function str(v: unknown): string {
    if (v == null) return ''
    return String(v).trim()
}

function parseLitres(v: unknown): number | null {
    if (v == null || v === '') return null
    const n = parseFloat(String(v).replace(/,/g, ''))
    return Number.isFinite(n) ? n : null
}

/**
 * Builds form updates for CCE enrollment attributes from one E003 catalogue row.
 * PQS code is set first so program rules can react in the same tick as subsequent setsFieldValue calls.
 */
export function getFieldUpdatesFromDevice(
    device: PqsCatalogueDevice,
    options: { includeImage: boolean; fieldIds?: Record<string, string> | null }
): FieldUpdate[] {
    const fieldIds = fieldIdMapFromConfig(options.fieldIds)
    const d = device.details ?? {}
    const main =
        device.specifications?.product_specifications_main ?? {}
    const fr =
        device.specifications?.product_specifications_additional_refrigerator ??
        {}
    const fz =
        device.specifications?.product_specifications_additional_freezer ?? {}

    const pqsCode = str(device.id || d['imd-pqs_code'])
    const typeOfAppliance = str(d.product_description || d.product_name)

    const updates: FieldUpdate[] = [
        { fieldId: fieldIds.pqsCode, value: pqsCode },
        { fieldId: fieldIds.pqsCategory, value: str(d.appliance_type) },
        { fieldId: fieldIds.typeOfAppliance, value: typeOfAppliance },
        { fieldId: fieldIds.company, value: str(d.manufacturer) },
        { fieldId: fieldIds.manufacturedIn, value: str(d.country_of_manufacture) },
        {
            fieldId: fieldIds.manufacturersReference,
            value: str(d.manufacturers_reference),
        },
        { fieldId: fieldIds.energySource, value: str(main.energy_source) },
    ]

    const vaccineStorage =
        parseLitres(fr['refrigerator_vaccine_storage_capacity(l)']) ??
        parseLitres(fz['waterpack_storage_capacity_(litres)'])
    if (vaccineStorage != null) {
        updates.push({
            fieldId: fieldIds.vaccineStorageCapacityL,
            value: vaccineStorage,
        })
    }

    const vaccineGross = parseLitres(fr["refrigerator's_gross_volume_(litres)"])
    if (vaccineGross != null) {
        updates.push({
            fieldId: fieldIds.vaccineGrossVolumeL,
            value: vaccineGross,
        })
    }

    const freezerGross = parseLitres(fz["freezer's_gross_volume_(litres)"])
    if (freezerGross != null) {
        updates.push({
            fieldId: fieldIds.freezerGrossVolumeL,
            value: freezerGross,
        })
    }

    if (options.includeImage && device.main_image) {
        updates.push({
            fieldId: fieldIds.applianceImage,
            value: str(device.main_image),
        })
    }

    return updates
}

export function deviceLabel(device: PqsCatalogueDevice): string {
    const code = str(device.id || device.details?.['imd-pqs_code'])
    const name = str(device.details?.product_name || device.details?.product_description)
    return name ? `${code} — ${name}` : code
}
