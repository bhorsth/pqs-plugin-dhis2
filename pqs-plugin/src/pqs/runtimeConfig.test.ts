import {
    apiBasePath,
    dhis2ContextPath,
    dhis2UnversionedApiBase,
    resolveDhis2BaseUrl,
    type PqsPluginRuntimeConfig,
} from './runtimeConfig'

const fixedConfig: PqsPluginRuntimeConfig = {
    routeCode: 'pqsCatalogue',
    catalogPath: '/catalog.json',
    enableImages: true,
    routeApiResource: 'routes',
    apiVersionStrategy: 'fixed',
    apiVersion: 42,
}

function setMetaBaseUrl(content: string | null) {
    document.querySelectorAll('meta[name="dhis2-base-url"]').forEach((el) => el.remove())
    if (content !== null) {
        const meta = document.createElement('meta')
        meta.setAttribute('name', 'dhis2-base-url')
        meta.setAttribute('content', content)
        document.head.appendChild(meta)
    }
}

describe('DHIS2 context path helpers', () => {
    const originalLocation = window.location

    beforeEach(() => {
        setMetaBaseUrl(null)
        delete (process.env as any).REACT_APP_DHIS2_BASE_URL
    })

    afterEach(() => {
        setMetaBaseUrl(null)
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: originalLocation,
        })
    })

    it('uses dhis2-base-url meta for context path', () => {
        setMetaBaseUrl('https://lmis.im.dhis2.org/sandbox-dev')
        expect(resolveDhis2BaseUrl()).toBe('https://lmis.im.dhis2.org/sandbox-dev')
        expect(dhis2ContextPath()).toBe('/sandbox-dev')
        expect(dhis2UnversionedApiBase()).toBe('/sandbox-dev/api')
        expect(apiBasePath(fixedConfig)).toBe('/sandbox-dev/api/42')
    })

    it('returns empty context path at domain root', () => {
        setMetaBaseUrl('https://example.com')
        expect(dhis2ContextPath()).toBe('')
        expect(dhis2UnversionedApiBase()).toBe('/api')
        expect(apiBasePath(fixedConfig)).toBe('/api/42')
    })

    it('infers context path from pathname when meta is missing', () => {
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: {
                ...originalLocation,
                origin: 'https://lmis.im.dhis2.org',
                hostname: 'lmis.im.dhis2.org',
                port: '',
                pathname: '/sandbox-dev/api/apps/pqs-plugin/index.html',
            },
        })
        expect(dhis2ContextPath()).toBe('/sandbox-dev')
        expect(dhis2UnversionedApiBase()).toBe('/sandbox-dev/api')
    })
})
