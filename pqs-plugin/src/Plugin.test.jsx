import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import Plugin from './Plugin.tsx'
import { clearCatalogCache } from './pqs/loadCatalog'
import { PQS_FIELD_IDS } from './pqs/pqsFieldMapping'

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
        process.env.VITE_PQS_CATALOG_URL = 'http://test.local/catalog.json'
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
            if (u.startsWith('/api/42/routes/S1CxnuYJebB/run/')) {
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
        const props = baseProps()
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
        expect(firstCall.fieldId).toBe(PQS_FIELD_IDS.pqsCode)
        expect(firstCall.value).toBe('E003-023')

        const fieldIds = props.setFieldValue.mock.calls.map((c) => c[0].fieldId)
        expect(fieldIds).toContain(PQS_FIELD_IDS.company)
        expect(fieldIds).toContain(PQS_FIELD_IDS.freezerGrossVolumeL)
        expect(fieldIds).toContain(PQS_FIELD_IDS.applianceImage)

        const imageCalls = props.setFieldValue.mock.calls.filter(
            (c) => c[0].fieldId === PQS_FIELD_IDS.applianceImage
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
        const props = baseProps()
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
        expect(fieldIds).not.toContain(PQS_FIELD_IDS.applianceImage)
    })

    it('renders read-only summary in viewMode', async () => {
        const props = baseProps({
            viewMode: true,
            values: { [PQS_FIELD_IDS.pqsCode]: 'E003-023' },
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
})
