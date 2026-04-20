/**
 * Semantic field keys for the plugin. The actual field identifiers are **plugin aliases**
 * configured via Tracker Plugin Configurator (IdFromPlugin). Avoid hard-coding DHIS2 UIDs here.
 */
export type PqsFieldIds = {
    pqsCode: string
    pqsCategory: string
    typeOfAppliance: string
    company: string
    manufacturedIn: string
    manufacturersReference: string
    energySource: string
    vaccineStorageCapacityL: string
    vaccineGrossVolumeL: string
    freezerGrossVolumeL: string
    applianceImage: string
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
    fieldIds: PqsFieldIds,
    options: { includeImage: boolean }
): FieldUpdate[] {
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
