import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import Plugin from './Plugin.tsx'
import { clearCatalogCache } from './pqs/loadCatalog'

const FIELD_ALIASES = {
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
}

const minimalE003 = {
    id: 'E003-023',
    main_image: 'https://example.com/pqs-image.jpg',
    details: {
        'imd-pqs_code': 'E003-023',
        appliance_type: 'E003',
        product_description: 'Vaccine/Waterpacks freezer',
        product_name: 'MF 314',
        manufacturer: 'Vestfrost Solutions',
        country_of_manufacture: 'Denmark',
        manufacturers_reference: 'MF 314',
    },
    specifications: {
        product_specifications_main: {
            energy_source: 'Electric Mains',
        },
        product_specifications_additional_refrigerator: {},
        product_specifications_additional_freezer: {
            "freezer's_gross_volume_(litres)": '281.00',
        },
    },
}

function baseProps(overrides = {}) {
    return {
        values: {},
        errors: {},
        warnings: {},
        fieldsMetadata: {},
        setFieldValue: jest.fn(),
        setContextFieldValue: jest.fn(),
        viewMode: false,
        formSubmitted: false,
        ...overrides,
    }
}

async function flushPromises(ms = 0) {
    await act(async () => {
        await new Promise((r) => setTimeout(r, ms))
    })
}

describe('PQS Capture plugin', () => {
    beforeAll(() => {
        globalThis.IS_REACT_ACT_ENVIRONMENT = true
    })

    beforeEach(() => {
        clearCatalogCache()
        delete process.env.VITE_PQS_CATALOG_URL
        global.fetch = jest.fn().mockImplementation(async (url) => {
            const u = String(url)
            if (u === 'http://test.local/catalog.json') {
                return {
                    ok: true,
                    headers: {
                        get: (name) =>
                            name?.toLowerCase() === 'content-type'
                                ? 'application/json'
                                : null,
                    },
                    json: async () => ({ e003: [minimalE003] }),
                }
            }
            if (u.startsWith('/api/42/routes/TESTROUTE01/run/')) {
                return {
                    ok: true,
                    headers: {
                        get: (name) =>
                            name?.toLowerCase() === 'content-type'
                                ? 'image/jpeg'
                                : null,
                    },
                    blob: async () => new Blob(['x'], { type: 'image/jpeg' }),
                }
            }
            if (u === '/api/fileResources') {
                return {
                    ok: true,
                    json: async () => ({
                        response: { fileResource: { id: 'abc123xyz' } },
                    }),
                }
            }
            throw new Error(`Unexpected fetch URL: ${u}`)
        })
        Object.defineProperty(navigator, 'onLine', {
            configurable: true,
            value: true,
        })
    })

    afterEach(() => {
        delete global.fetch
    })

    /**
     * Verifies multi-attribute updates: Capture should receive setFieldValue for
     * PQS code first (program rules), then other mapped TE attributes in one interaction.
     */
    it('calls setFieldValue starting with PQS code and includes mapped fields when a device is picked', async () => {
        const props = baseProps({
            pluginConfig: {
                catalogUrl: 'http://test.local/catalog.json',
                catalogBucketKey: 'e003',
                enableImageUpload: true,
                routeManager: { apiVersion: 42, routeId: 'TESTROUTE01' },
                fieldAliases: FIELD_ALIASES,
            },
        })
        const div = document.createElement('div')
        document.body.appendChild(div)
        const root = createRoot(div)
        await act(async () => {
            root.render(<Plugin {...props} />)
        })
        await flushPromises(80)

        const input = div.querySelector('[data-test="pqs-combobox"]')
        expect(input).toBeTruthy()

        await act(async () => {
            input.focus()
        })
        await flushPromises(20)

        const item = document.querySelector('[data-test="pqs-suggestions"] [role="option"]')
        expect(item).toBeTruthy()

        await act(async () => {
            item.dispatchEvent(
                new MouseEvent('mousedown', { bubbles: true, cancelable: true })
            )
        })
        await flushPromises(0)

        document.body.removeChild(div)

        expect(props.setFieldValue).toHaveBeenCalled()
        const firstCall = props.setFieldValue.mock.calls[0][0]
        expect(firstCall.fieldId).toBe(FIELD_ALIASES.pqsCode)
        expect(firstCall.value).toBe('E003-023')

        const fieldIds = props.setFieldValue.mock.calls.map((c) => c[0].fieldId)
        expect(fieldIds).toContain(FIELD_ALIASES.company)
        expect(fieldIds).toContain(FIELD_ALIASES.freezerGrossVolumeL)
        expect(fieldIds).toContain(FIELD_ALIASES.applianceImage)

        const imageCalls = props.setFieldValue.mock.calls.filter(
            (c) => c[0].fieldId === FIELD_ALIASES.applianceImage
        )
        expect(imageCalls.length).toBe(1)
        expect(imageCalls[0][0].value).toEqual(
            expect.objectContaining({ value: 'abc123xyz' })
        )
    })

    it('does not set appliance image when offline', async () => {
        Object.defineProperty(navigator, 'onLine', {
            configurable: true,
            value: false,
        })
        const props = baseProps({
            pluginConfig: {
                catalogUrl: 'http://test.local/catalog.json',
                catalogBucketKey: 'e003',
                enableImageUpload: true,
                routeManager: { apiVersion: 42, routeId: 'TESTROUTE01' },
                fieldAliases: FIELD_ALIASES,
            },
        })
        const div = document.createElement('div')
        document.body.appendChild(div)
        const root = createRoot(div)
        await act(async () => {
            root.render(<Plugin {...props} />)
        })
        await flushPromises(80)

        const input = div.querySelector('[data-test="pqs-combobox"]')
        await act(async () => {
            input.focus()
        })
        await flushPromises(20)

        await act(async () => {
            const item = document.querySelector(
                '[data-test="pqs-suggestions"] [role="option"]'
            )
            item.dispatchEvent(
                new MouseEvent('mousedown', { bubbles: true, cancelable: true })
            )
        })

        document.body.removeChild(div)

        const fieldIds = props.setFieldValue.mock.calls.map((c) => c[0].fieldId)
        expect(fieldIds).not.toContain(FIELD_ALIASES.applianceImage)
    })

    it('renders read-only summary in viewMode', async () => {
        const props = baseProps({
            viewMode: true,
            pluginConfig: {
                catalogUrl: 'http://test.local/catalog.json',
                catalogBucketKey: 'e003',
                enableImageUpload: true,
                routeManager: { apiVersion: 42, routeId: 'TESTROUTE01' },
                fieldAliases: FIELD_ALIASES,
            },
            values: { [FIELD_ALIASES.pqsCode]: 'E003-023' },
        })
        const div = document.createElement('div')
        const root = createRoot(div)
        await act(async () => {
            root.render(<Plugin {...props} />)
        })
        await flushPromises(30)

        const ro = div.querySelector('[data-test="pqs-readonly"]')
        expect(ro).toBeTruthy()
        expect(ro.textContent).toContain('E003-023')
    })

    it('auto-maps fields from fieldsMetadata when fieldAliases are missing', async () => {
        const props = baseProps({
            pluginConfig: {
                catalogUrl: 'http://test.local/catalog.json',
                catalogBucketKey: 'e003',
                enableImageUpload: false,
                routeManager: { apiVersion: 42, routeId: 'TESTROUTE01' },
                fieldAliases: {}, // force auto-map
            },
            fieldsMetadata: {
                pqsCodeAlias: {
                    id: 'x',
                    name: 'PQS code',
                    shortName: 'PQS code',
                    formName: 'PQS code',
                    disabled: false,
                    compulsory: false,
                    description: '',
                    type: 'TEXT',
                    optionSet: null,
                    displayInForms: true,
                    displayInReports: false,
                    icon: null,
                    unique: null,
                    searchable: true,
                    url: undefined,
                },
                companyAlias: {
                    id: 'y',
                    name: 'Company',
                    shortName: 'Company',
                    formName: 'Company',
                    disabled: false,
                    compulsory: false,
                    description: '',
                    type: 'TEXT',
                    optionSet: null,
                    displayInForms: true,
                    displayInReports: false,
                    icon: null,
                    unique: null,
                    searchable: true,
                    url: undefined,
                },
                imageAlias: {
                    id: 'z',
                    name: 'Appliance image',
                    shortName: 'Image',
                    formName: 'Appliance image',
                    disabled: false,
                    compulsory: false,
                    description: '',
                    type: 'IMAGE',
                    optionSet: null,
                    displayInForms: true,
                    displayInReports: false,
                    icon: null,
                    unique: null,
                    searchable: false,
                    url: undefined,
                },
            },
        })

        const div = document.createElement('div')
        document.body.appendChild(div)
        const root = createRoot(div)
        await act(async () => {
            root.render(<Plugin {...props} />)
        })
        await flushPromises(80)

        // With incomplete auto-map (only 3 semantic fields present), plugin should show a config error.
        expect(div.textContent).toContain('Missing field mappings')

        document.body.removeChild(div)
    })
})
