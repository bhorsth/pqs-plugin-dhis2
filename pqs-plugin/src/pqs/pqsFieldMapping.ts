/**
 * CCE program: Cold chain appliance lifecycle management (pPHkq2q2OrH).
 * TE attribute IDs from /api/programs/pPHkq2q2OrH?fields=programTrackedEntityAttributes...
 *
 * | DHIS2 attribute (displayName)     | id          | PQS JSON source |
 * |-----------------------------------|-------------|-----------------|
 * | PQS code                          | RfZORQuqk3z | id / details["imd-pqs_code"] |
 * | PQS category                      | rxgIKww28O2 | details.appliance_type |
 * | Type of appliance                 | oc5vHLl3NMW | details.product_description or product_name |
 * | Company                           | NIJQnrXOY2v | details.manufacturer |
 * | Manufactured in                   | opV7LjgIyVk | details.country_of_manufacture |
 * | Manufacturer's reference          | bmuypMIuzZV | details.manufacturers_reference |
 * | Energy source                     | u1xxerCNyuK | specifications.product_specifications_main.energy_source |
 * | Vaccine storage capacity (litres) | ykkKy8bYHpU | refrigerator_vaccine_storage_capacity(l) or waterpack_storage_capacity_(litres) |
 * | Vaccine gross volume (litres)     | tZDkrgw4MEB | refrigerator's_gross_volume_(litres) |
 * | Freezer gross volume (litres)    | KDgzfJ5dzOz | freezer's_gross_volume_(litres) |
 * | Appliance image                   | N6md61h88iS | main_image (only when online; IMAGE type — verify on instance) |
 */
export const CCE_PROGRAM_ID = 'pPHkq2q2OrH'

export const PQS_FIELD_IDS = {
    pqsCode: 'RfZORQuqk3z',
    pqsCategory: 'rxgIKww28O2',
    typeOfAppliance: 'oc5vHLl3NMW',
    company: 'NIJQnrXOY2v',
    manufacturedIn: 'opV7LjgIyVk',
    manufacturersReference: 'bmuypMIuzZV',
    energySource: 'u1xxerCNyuK',
    vaccineStorageCapacityL: 'ykkKy8bYHpU',
    vaccineGrossVolumeL: 'tZDkrgw4MEB',
    freezerGrossVolumeL: 'KDgzfJ5dzOz',
    applianceImage: 'N6md61h88iS',
} as const

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
        { fieldId: PQS_FIELD_IDS.pqsCode, value: pqsCode },
        { fieldId: PQS_FIELD_IDS.pqsCategory, value: str(d.appliance_type) },
        { fieldId: PQS_FIELD_IDS.typeOfAppliance, value: typeOfAppliance },
        { fieldId: PQS_FIELD_IDS.company, value: str(d.manufacturer) },
        { fieldId: PQS_FIELD_IDS.manufacturedIn, value: str(d.country_of_manufacture) },
        {
            fieldId: PQS_FIELD_IDS.manufacturersReference,
            value: str(d.manufacturers_reference),
        },
        { fieldId: PQS_FIELD_IDS.energySource, value: str(main.energy_source) },
    ]

    const vaccineStorage =
        parseLitres(fr['refrigerator_vaccine_storage_capacity(l)']) ??
        parseLitres(fz['waterpack_storage_capacity_(litres)'])
    if (vaccineStorage != null) {
        updates.push({
            fieldId: PQS_FIELD_IDS.vaccineStorageCapacityL,
            value: vaccineStorage,
        })
    }

    const vaccineGross = parseLitres(fr["refrigerator's_gross_volume_(litres)"])
    if (vaccineGross != null) {
        updates.push({
            fieldId: PQS_FIELD_IDS.vaccineGrossVolumeL,
            value: vaccineGross,
        })
    }

    const freezerGross = parseLitres(fz["freezer's_gross_volume_(litres)"])
    if (freezerGross != null) {
        updates.push({
            fieldId: PQS_FIELD_IDS.freezerGrossVolumeL,
            value: freezerGross,
        })
    }

    if (options.includeImage && device.main_image) {
        updates.push({
            fieldId: PQS_FIELD_IDS.applianceImage,
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
