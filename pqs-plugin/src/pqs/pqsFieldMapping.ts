/**
 * Tracker / Capture field mapping.
 *
 * The source reference is `/Users/breno/Downloads/OpenFn DHIS2 WHO PQS catalogue attribute mapping.csv`.
 * This table uses configured camelCase aliases as both `key` and default `fieldId`;
 * `sourcePath` remains the PQS JSON lookup path.
 */
export type PqsFieldMapping = {
    /** Stable plugin/DataStore mapping key. */
    key: string
    /** Default Capture fieldId / IdFromPlugin value. */
    fieldId: string
    /** Full path to the value inside one PQS catalogue device. */
    sourcePath: string
    /** DHIS2 display name, kept here to make the mapping auditable. */
    displayName: string
    /** Date values are normalized to YYYY-MM-DD before setting Capture. */
    valueType?: 'DATE' | 'IMAGE'
}

export const PQS_FIELD_KEYS = {
    pqsCode: 'detailsImdPqsCode',
    applianceImage: 'mainImage',
} as const

/**
 * Semantic field keys for plugin configuration (Tracker Plugin Configurator / IdFromPlugin).
 * Values are Capture field aliases, not DHIS2 UIDs.
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

export const PQS_FIELD_MAPPINGS: readonly PqsFieldMapping[] = [
    {
        key: 'detailsImdPqsCode',
        fieldId: 'detailsImdPqsCode',
        sourcePath: 'details.imd-pqs_code',
        displayName: 'Appliance PQS code',
    },
    {
        key: 'id',
        fieldId: 'id',
        sourcePath: 'id',
        displayName: 'Appliance identifier',
    },
    {
        key: 'title',
        fieldId: 'title',
        sourcePath: 'title',
        displayName: 'Title',
    },
    {
        key: 'mainImage',
        fieldId: 'mainImage',
        sourcePath: 'main_image',
        displayName: 'Appliance image',
        valueType: 'IMAGE',
    },
    {
        key: 'detailsProductName',
        fieldId: 'detailsProductName',
        sourcePath: 'details.product_name',
        displayName: 'Appliance model',
    },
    {
        key: 'detailsStatus',
        fieldId: 'detailsStatus',
        sourcePath: 'details.status',
        displayName: 'Status',
    },
    {
        key: 'detailsDateOfAcceptance',
        fieldId: 'detailsDateOfAcceptance',
        sourcePath: 'details.date_of_acceptance',
        displayName: 'Date of acceptance',
        valueType: 'DATE',
    },
    {
        key: 'detailsApplianceType',
        fieldId: 'detailsApplianceType',
        sourcePath: 'details.appliance_type',
        displayName: 'Appliance PQS device type',
    },
    {
        key: 'detailsProductDescription',
        fieldId: 'detailsProductDescription',
        sourcePath: 'details.product_description',
        displayName: 'Product description',
    },
    {
        key: 'detailsManufacturer',
        fieldId: 'detailsManufacturer',
        sourcePath: 'details.manufacturer',
        displayName: 'Appliance manufacturer',
    },
    {
        key: 'detailsManufacturersReference',
        fieldId: 'detailsManufacturersReference',
        sourcePath: 'details.manufacturers_reference',
        displayName: 'Manufacturer reference',
    },
    {
        key: 'detailsCountryOfManufacture',
        fieldId: 'detailsCountryOfManufacture',
        sourcePath: 'details.country_of_manufacture',
        displayName: 'Country of manufacture',
    },
    {
        key: 'detailsAddress',
        fieldId: 'detailsAddress',
        sourcePath: 'details.address',
        displayName: 'Address / Details',
    },
    {
        key: 'detailsTelephone',
        fieldId: 'detailsTelephone',
        sourcePath: 'details.telephone',
        displayName: 'Telephone / Details',
    },
    {
        key: 'detailsEmail',
        fieldId: 'detailsEmail',
        sourcePath: 'details.email',
        displayName: 'Email / Details',
    },
    {
        key: 'detailsWebsiteAddress',
        fieldId: 'detailsWebsiteAddress',
        sourcePath: 'details.website_address',
        displayName: 'Website address',
    },
    {
        key: 'detailsValidUntil',
        fieldId: 'detailsValidUntil',
        sourcePath: 'details.valid_until',
        displayName: 'Valid until / Details',
        valueType: 'DATE',
    },
    {
        key: 'productSitesOrganizationName',
        fieldId: 'productSitesOrganizationName',
        sourcePath: 'product_sites.organization_name',
        displayName: 'Organization name',
    },
    {
        key: 'productSitesAddress',
        fieldId: 'productSitesAddress',
        sourcePath: 'product_sites.address',
        displayName: 'Address / Product sites',
    },
    {
        key: 'statusCurrent',
        fieldId: 'statusCurrent',
        sourcePath: 'status.current',
        displayName: 'Current',
    },
    {
        key: 'statusValidUntil',
        fieldId: 'statusValidUntil',
        sourcePath: 'status.valid_until',
        displayName: 'Valid until / Status',
        valueType: 'DATE',
    },
    {
        key: 'statusNote',
        fieldId: 'statusNote',
        sourcePath: 'status.note',
        displayName: 'Note',
    },
    {
        key: 'climateZone',
        fieldId: 'climateZone',
        sourcePath: 'specifications.product_specifications_main.climate_zone',
        displayName: 'Climate zone',
    },
    {
        key: 'minimumRatedAmbientTemperature',
        fieldId: 'minimumRatedAmbientTemperature',
        sourcePath:
            'specifications.product_specifications_main.minimum_rated_ambient_temperature_(°c)',
        displayName: 'Minimum rated ambient temperature (°C)',
    },
    {
        key: 'freezeProtection',
        fieldId: 'freezeProtection',
        sourcePath: 'specifications.product_specifications_main.freeze_protection',
        displayName: 'Freeze protection',
    },
    {
        key: 'relativeHumidityMin',
        fieldId: 'relativeHumidityMin',
        sourcePath: 'specifications.product_specifications_main.relative_humidity_(min)',
        displayName: 'Relative humidity (min)',
    },
    {
        key: 'relativeHumidityMax',
        fieldId: 'relativeHumidityMax',
        sourcePath: 'specifications.product_specifications_main.relative_humidity_(max)',
        displayName: 'Relative humidity (max)',
    },
    {
        key: 'humidityControl',
        fieldId: 'humidityControl',
        sourcePath: 'specifications.product_specifications_main.humidity_control',
        displayName: 'Humidity control',
    },
    {
        key: 'holdOverTime',
        fieldId: 'holdOverTime',
        sourcePath: 'specifications.product_specifications_main.hold_over_time_(hours:mn)',
        displayName: 'Hold over time (hours:mn)',
    },
    {
        key: 'externalDimensionsLength',
        fieldId: 'externalDimensionsLength',
        sourcePath: 'specifications.product_specifications_main.external_dimensions_length_(mm)',
        displayName: 'External dimensions length (mm)',
    },
    {
        key: 'externalDimensionsWidth',
        fieldId: 'externalDimensionsWidth',
        sourcePath: 'specifications.product_specifications_main.external_dimensions_width_(mm)',
        displayName: 'External dimensions width (mm)',
    },
    {
        key: 'externalDimensionsHeight',
        fieldId: 'externalDimensionsHeight',
        sourcePath: 'specifications.product_specifications_main.external_dimensions_height_(mm)',
        displayName: 'External dimensions height_(mm)',
    },
    {
        key: 'applianceTestedAt',
        fieldId: 'applianceTestedAt',
        sourcePath: 'specifications.product_specifications_main.appliance_tested_at_(°c)',
        displayName: 'Appliance tested at (°C)',
    },
    {
        key: 'performanceAt',
        fieldId: 'performanceAt',
        sourcePath: 'specifications.product_specifications_main.performance_at_(°c)',
        displayName: 'Performance at (°C)',
    },
    {
        key: 'ambientTemperatureDuringTesting',
        fieldId: 'ambientTemperatureDuringTesting',
        sourcePath:
            'specifications.product_specifications_main.ambient_temperature_during_testing_(°c)',
        displayName: 'Ambient temperature during testing (°C)',
    },
    {
        key: 'fuelAndRefrigerationCycle',
        fieldId: 'fuelAndRefrigerationCycle',
        sourcePath: 'specifications.product_specifications_main.fuel_and_refrigeration_cycle',
        displayName: 'Fuel and refrigeration cycle',
    },
    {
        key: 'energySource',
        fieldId: 'energySource',
        sourcePath: 'specifications.product_specifications_main.energy_source',
        displayName: 'Energy source',
    },
    {
        key: 'lining',
        fieldId: 'lining',
        sourcePath: 'specifications.product_specifications_main.lining',
        displayName: 'Lining',
    },
    {
        key: 'energyConsumptionDuringFreezing',
        fieldId: 'energyConsumptionDuringFreezing',
        sourcePath:
            'specifications.product_specifications_main.energy_consumption_during_freezing_(kwh/24h)',
        displayName: 'Energy consumption during freezing (kwh/24h)',
    },
    {
        key: 'energyConsumptionIntermittentPower',
        fieldId: 'energyConsumptionIntermittentPower',
        sourcePath:
            'specifications.product_specifications_main.energy_consumption_intermittent_power_(kwh/24h)',
        displayName: 'Energy consumption intermittent power (kwh/24h)',
    },
    {
        key: 'energyConsumptionCoolDown',
        fieldId: 'energyConsumptionCoolDown',
        sourcePath:
            'specifications.product_specifications_main.energy_consumption_cool_down_(kwh/24h)',
        displayName: 'Energy consumption cool down (kwh/24h)',
    },
    {
        key: 'energyConsumptionContinuousPower',
        fieldId: 'energyConsumptionContinuousPower',
        sourcePath:
            'specifications.product_specifications_main.energy_consumption_continuous_power_(kwh/24h)',
        displayName: 'Energy consumption continuous power (kwh/24h)',
    },
    {
        key: 'refrigeratorVaccineStorageCapacity',
        fieldId: 'refrigeratorVaccineStorageCapacity',
        sourcePath:
            'specifications.product_specifications_additional_refrigerator.refrigerator_vaccine_storage_capacity(l)',
        displayName: 'Refrigerator vaccine storage capacity (l)',
    },
    {
        key: 'refrigeratorsGrossVolume',
        fieldId: 'refrigeratorsGrossVolume',
        sourcePath:
            "specifications.product_specifications_additional_refrigerator.refrigerator's_gross_volume_(litres)",
        displayName: "Refrigerator's gross volume (litres)",
    },
    {
        key: 'autonomy',
        fieldId: 'autonomy',
        sourcePath:
            'specifications.product_specifications_additional_refrigerator.autonomy_(hrs:mn)',
        displayName: 'Autonomy (hrs:mn)',
    },
    {
        key: 'refrigerantType',
        fieldId: 'refrigerantType',
        sourcePath:
            'specifications.product_specifications_additional_refrigerator.refrigerant_type',
        displayName: 'Refrigerant type',
    },
    {
        key: 'solarRadiationRefPeriod',
        fieldId: 'solarRadiationRefPeriod',
        sourcePath:
            'specifications.product_specifications_additional_refrigerator.solar_radiation_ref_period_(kwh/m2/day)',
        displayName: 'Solar radiation ref period (kwh/m2/day)',
    },
    {
        key: 'freezerType',
        fieldId: 'freezerType',
        sourcePath: 'specifications.product_specifications_additional_freezer.freezer_type',
        displayName: 'Freezer type',
    },
    {
        key: 'freezerNetVolume',
        fieldId: 'freezerNetVolume',
        sourcePath: 'specifications.product_specifications_additional_freezer.freezer_net_volume',
        displayName: 'Freezer net volume',
    },
    {
        key: 'freezersGrossVolume',
        fieldId: 'freezersGrossVolume',
        sourcePath:
            "specifications.product_specifications_additional_freezer.freezer's_gross_volume_(litres)",
        displayName: "Freezer's gross volume (litres)",
    },
    {
        key: 'waterpackFreezingCapacity',
        fieldId: 'waterpackFreezingCapacity',
        sourcePath:
            'specifications.product_specifications_additional_freezer.waterpack_freezing_capacity_(kg/24_hrs)',
        displayName: 'Waterpack freezing capacity (kg/24_hrs)',
    },
    {
        key: 'waterpackStorageCapacity',
        fieldId: 'waterpackStorageCapacity',
        sourcePath:
            'specifications.product_specifications_additional_freezer.waterpack_storage_capacity_(litres)',
        displayName: 'Waterpack storage capacity (litres)',
    },
    {
        key: 'comments',
        fieldId: 'comments',
        sourcePath: 'specifications.field_group_1.comments',
        displayName: 'Comments',
    },
    {
        key: 'listOfAccessories',
        fieldId: 'listOfAccessories',
        sourcePath: 'specifications.field_group_1.list_of_accessories',
        displayName: 'List of accessories',
    },
    {
        key: 'listOfSparePartsReferencePrice',
        fieldId: 'listOfSparePartsReferencePrice',
        sourcePath: 'specifications.field_group_1.list_of_spare_parts,_reference_&_price',
        displayName: 'List of spare parts, reference & price',
    },
    {
        key: 'shippingVolume',
        fieldId: 'shippingVolume',
        sourcePath: 'specifications.price_and_shipping.shipping_volume_(m3)',
        displayName: 'Shipping volume (m3)',
    },
    {
        key: 'shippingWeight',
        fieldId: 'shippingWeight',
        sourcePath: 'specifications.price_and_shipping.shipping_weight_(kg)',
        displayName: 'Shipping weight (kg)',
    },
    {
        key: 'minimumOrder',
        fieldId: 'minimumOrder',
        sourcePath: 'specifications.price_and_shipping.minimum_order',
        displayName: 'Minimum order',
    },
    {
        key: 'unitsPerPackage',
        fieldId: 'unitsPerPackage',
        sourcePath: 'specifications.price_and_shipping.units_per_package',
        displayName: 'Units per package',
    },
    {
        key: 'incoterms',
        fieldId: 'incoterms',
        sourcePath: 'specifications.price_and_shipping.incoterms',
        displayName: 'Incoterms',
    },
    {
        key: 'priceone',
        fieldId: 'priceone',
        sourcePath: 'specifications.price_and_shipping.price_1',
        displayName: 'Price 1',
    },
    {
        key: 'pricetwo',
        fieldId: 'pricetwo',
        sourcePath: 'specifications.price_and_shipping.price_2',
        displayName: 'Price 2',
    },
    {
        key: 'pricethree',
        fieldId: 'pricethree',
        sourcePath: 'specifications.price_and_shipping.price_3',
        displayName: 'Price 3',
    },
    {
        key: 'yearOfBasePrice',
        fieldId: 'yearOfBasePrice',
        sourcePath: 'specifications.price_and_shipping.year_of_base_price',
        displayName: 'Year of base price',
    },
    {
        key: 'qualityStandard',
        fieldId: 'qualityStandard',
        sourcePath: 'specifications.quality_standard.quality_standard',
        displayName: 'Quality standard',
    },
    {
        key: 'qualityStandardOther',
        fieldId: 'qualityStandardOther',
        sourcePath: 'specifications.quality_standard.quality_standard_(other)',
        displayName: 'Quality standard (other)',
    },
    {
        key: 'specificationReference',
        fieldId: 'specificationReference',
        sourcePath: 'specifications.quality_standard.specification_reference',
        displayName: 'Specification reference',
    },
    {
        key: 'verificationLaboratory',
        fieldId: 'verificationLaboratory',
        sourcePath: 'specifications.verification.verification_laboratory',
        displayName: 'Verification laboratory',
    },
    {
        key: 'verificationAddress',
        fieldId: 'verificationAddress',
        sourcePath: 'specifications.verification.address',
        displayName: 'Address / Verification',
    },
    {
        key: 'verificationTelephone',
        fieldId: 'verificationTelephone',
        sourcePath: 'specifications.verification.telephone',
        displayName: 'Telephone / Verification',
    },
    {
        key: 'verificationEmail',
        fieldId: 'verificationEmail',
        sourcePath: 'specifications.verification.email',
        displayName: 'Email / Verification',
    },
    {
        key: 'verificationReportReference',
        fieldId: 'verificationReportReference',
        sourcePath: 'specifications.verification.verification_report_reference',
        displayName: 'Verification report reference',
    },
    {
        key: 'organizationName',
        fieldId: 'organizationName',
        sourcePath: 'product_sites.organization_name',
        displayName: 'Organization name',
    },
    {
        key: 'address',
        fieldId: 'address',
        sourcePath: 'product_sites.address',
        displayName: 'Address / Product sites',
    },
    {
        key: 'current',
        fieldId: 'current',
        sourcePath: 'status.current',
        displayName: 'Current',
    },
    {
        key: 'validUntil',
        fieldId: 'validUntil',
        sourcePath: 'status.valid_until',
        displayName: 'Valid until / Status',
        valueType: 'DATE',
    },
    {
        key: 'note',
        fieldId: 'note',
        sourcePath: 'status.note',
        displayName: 'Note',
    },
] as const

export const DEFAULT_FIELD_IDS: Record<string, string> = Object.fromEntries(
    PQS_FIELD_MAPPINGS.map((m) => [m.key, m.fieldId])
)

const LEGACY_FIELD_KEY_ALIASES: Record<string, string> = {
    pqsCode: PQS_FIELD_KEYS.pqsCode,
    pqsCategory: 'detailsApplianceType',
    typeOfAppliance: 'detailsProductDescription',
    company: 'detailsManufacturer',
    manufacturedIn: 'detailsCountryOfManufacture',
    manufacturersReference: 'detailsManufacturersReference',
    energySource: 'energySource',
    vaccineStorageCapacityL: 'refrigeratorVaccineStorageCapacity',
    vaccineGrossVolumeL: 'refrigeratorsGrossVolume',
    freezerGrossVolumeL: 'freezersGrossVolume',
    applianceImage: PQS_FIELD_KEYS.applianceImage,
}

export type PqsFieldIdKey = keyof typeof DEFAULT_FIELD_IDS

export function fieldIdMapFromConfig(
    configFieldIds?: Record<string, string> | null | undefined
): Record<string, string> {
    if (!configFieldIds) return DEFAULT_FIELD_IDS
    const merged: Record<string, string> = { ...DEFAULT_FIELD_IDS }
    for (const [rawKey, v] of Object.entries(configFieldIds)) {
        if (typeof v !== 'string' || v.trim().length === 0) continue
        const key = LEGACY_FIELD_KEY_ALIASES[rawKey] ?? rawKey
        merged[key] = v.trim()
    }
    return merged
}

export type PqsCatalogueDevice = {
    id: string
    title?: string
    main_image?: string
    details?: Record<string, string | number | undefined>
    specifications?: Record<string, Record<string, string | number | undefined>>
    product_sites?: Record<string, string | number | undefined>
    status?: Record<string, string | number | undefined>
}

export type FieldUpdate = { fieldId: string; value: string | number }

function str(v: unknown): string {
    if (v == null) return ''
    return String(v).trim()
}

function valueAtPath(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current: unknown, part) => {
        if (current == null || typeof current !== 'object') return undefined
        return (current as Record<string, unknown>)[part]
    }, obj)
}

function isoDate(v: unknown): string {
    const value = str(v)
    if (!value) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

    const match = value.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/)
    if (!match) return value

    const months: Record<string, string> = {
        jan: '01',
        feb: '02',
        mar: '03',
        apr: '04',
        may: '05',
        jun: '06',
        jul: '07',
        aug: '08',
        sep: '09',
        oct: '10',
        nov: '11',
        dec: '12',
    }
    const month = months[match[2].toLowerCase()]
    if (!month) return value

    return `${match[3]}-${month}-${match[1].padStart(2, '0')}`
}

function mappedValue(device: PqsCatalogueDevice, mapping: PqsFieldMapping): string | number {
    const raw = valueAtPath(device, mapping.sourcePath)
    if (mapping.valueType === 'DATE') return isoDate(raw)
    if (raw == null) return ''
    if (typeof raw === 'number') return raw
    if (typeof raw === 'object') return JSON.stringify(raw)
    return str(raw)
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
    return PQS_FIELD_MAPPINGS
        .filter((mapping) => options.includeImage || mapping.valueType !== 'IMAGE')
        .map((mapping) => ({
            fieldId: fieldIds[mapping.key] ?? mapping.fieldId,
            value: mappedValue(device, mapping),
        }))
}

export function deviceLabel(device: PqsCatalogueDevice): string {
    const code = str(device.id || device.details?.['imd-pqs_code'])
    const name = str(device.details?.product_name || device.details?.product_description)
    return name ? `${code} — ${name}` : code
}
