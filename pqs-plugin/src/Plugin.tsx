import React, {
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { createPortal } from 'react-dom'
import { IFormFieldPluginProps } from './plugin.types'
import { loadBucketDevices, resolveCatalogUrl } from './pqs/loadCatalog'
import { buildRouteRunBase } from './pqs/dhis2Artifacts'
import { dhis2UnversionedApiBase } from './pqs/runtimeConfig'
import {
    deviceLabel,
    getFieldUpdatesFromDevice,
    type PqsFieldIds,
    type PqsCatalogueDevice,
} from './pqs/pqsFieldMapping'
import { parsePqsPluginConfig, readRawPluginConfig } from './pqs/pluginConfig'
import { resolveFieldAliases } from './pqs/fieldResolver'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - CSS Modules are supported by the DHIS2/Vite toolchain, but
// Cursor's TS linter may not resolve the module typing automatically.
import classes from './Plugin.module.css'

const LIST_LIMIT = 80

/** ~10 option rows at 14px text + padding (see `.suggestionItem` min-height) */
const SUGGESTIONS_MAX_HEIGHT_PX = 360

function shouldIncludeImage(): boolean {
    if (typeof navigator === 'undefined') return false
    return navigator.onLine
}

function filenameFromUrl(url: string): string | null {
    try {
        const u = new URL(url)
        const last = u.pathname.split('/').filter(Boolean).pop()
        return last && last.includes('.') ? last : null
    } catch {
        return null
    }
}

function extFromContentType(contentType: string | null | undefined): string | null {
    if (!contentType) return null
    const t = contentType.split(';')[0]?.trim().toLowerCase()
    if (t === 'image/jpeg' || t === 'image/jpg') return 'jpg'
    if (t === 'image/png') return 'png'
    if (t === 'image/gif') return 'gif'
    if (t === 'image/webp') return 'webp'
    return null
}

async function uploadImageToFileResource(imageUrl: string): Promise<{ id: string; name: string }> {
    // Route base is configured at runtime via Tracker Plugin Configurator.
    // If missing, image upload should be disabled by config validation.
    const routeRunBase = (globalThis as any).__PQS_ROUTE_RUN_BASE as string | undefined
    if (typeof routeRunBase !== 'string' || routeRunBase.length === 0) {
        throw new Error('route_manager_not_configured')
    }

    const tryFetch = async (url: string) => {
        const res = await fetch(url)
        return res
    }

    // Always use the DHIS2 route to avoid any direct CORS fetch attempt.
    let proxiedPath = ''
    try {
        const u = new URL(imageUrl)
        proxiedPath = u.pathname.startsWith('/') ? u.pathname : `/${u.pathname}`
    } catch {
        proxiedPath = ''
    }
    const proxied = `${routeRunBase}${proxiedPath}`
    let imageRes: Response = await tryFetch(proxied)
    if (!imageRes.ok) {
        throw new Error(`image_download_failed_${imageRes.status}`)
    }
    const contentType = imageRes.headers?.get?.('content-type') ?? null
    if (contentType && !contentType.toLowerCase().startsWith('image/')) {
        let bodyTextPreview: string | null = null
        try {
            bodyTextPreview = (await imageRes.clone().text()).slice(0, 400)
        } catch {
            bodyTextPreview = null
        }
        throw new Error(`image_proxy_not_image_${contentType}`)
    }
    const blob = await imageRes.blob()
    const fromUrl = filenameFromUrl(imageUrl)
    const ext = extFromContentType(contentType) ?? extFromContentType(blob.type) ?? 'jpg'
    const name = fromUrl ?? `pqs.${ext}`
    const file = new File([blob], name, { type: blob.type || contentType || '' })

    const fd = new FormData()
    fd.append('file', file)

    const uploadRes = await fetch(`${dhis2UnversionedApiBase()}/fileResources`, {
        method: 'POST',
        body: fd,
    })
    let uploadBodyPreview: string | null = null
    try {
        uploadBodyPreview = (await uploadRes.clone().text()).slice(0, 800)
    } catch {
        uploadBodyPreview = null
    }
    if (!uploadRes.ok) {
        throw new Error(`fileResource_upload_failed_${uploadRes.status}`)
    }
    const json = await uploadRes.json()
    const id = json?.response?.fileResource?.id
    if (typeof id !== 'string' || id.length === 0) {
        throw new Error('fileResource_upload_missing_id')
    }
    return { id, name }
}

function applyDeviceToForm(
    device: PqsCatalogueDevice,
    setFieldValue: IFormFieldPluginProps['setFieldValue'],
    fieldIds: PqsFieldIds
): void {
    const updates = getFieldUpdatesFromDevice(device, {
        includeImage: false,
        fieldIds,
    })
    for (const { fieldId, value } of updates) {
        const safeValue = typeof value === 'number' ? String(value) : value
        try {
            setFieldValue({
                fieldId,
                value: safeValue,
                options: { touched: true, valid: true },
            })
        } catch (e) {
            // Ignore sandboxed write errors (unmapped field) to keep UX smooth.
            // Admins will see missing mapping via validation/report UI.
        }
    }
}

const Plugin = (rawProps: Partial<IFormFieldPluginProps> & Record<string, unknown>) => {
    const values = (rawProps as any)?.values ?? {}
    const viewMode = Boolean((rawProps as any)?.viewMode)
    const setFieldValue = (rawProps as any)?.setFieldValue as
        | IFormFieldPluginProps['setFieldValue']
        | undefined
    const fieldsMetadata = (rawProps as any)?.fieldsMetadata as
        | IFormFieldPluginProps['fieldsMetadata']
        | undefined

    const [query, setQuery] = useState('')
    const [devices, setDevices] = useState([] as PqsCatalogueDevice[])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null as string | null)
    const [panelOpen, setPanelOpen] = useState(false)
    const [highlightedIndex, setHighlightedIndex] = useState(-1)
    const [isFocused, setIsFocused] = useState(false)
    const [imageStatus, setImageStatus] = useState(
        'idle' as 'idle' | 'uploading' | 'error'
    )
    const [imageError, setImageError] = useState(null as string | null)

    const blurTimeoutRef = useRef(null as ReturnType<typeof setTimeout> | null)
    const inputRef = useRef(null as HTMLInputElement | null)
    const [panelRect, setPanelRect] = useState({ top: 0, left: 0, width: 0 })
    const imageCacheRef = useRef(new Map<string, { id: string; name: string }>())
    const mountedRef = useRef(true)
    const reactId = useId()
    const baseId = `pqs-${reactId.replace(/:/g, '')}`
    const listboxId = `${baseId}-listbox`

    const config = useMemo(() => {
        const raw = readRawPluginConfig(rawProps as any)
        return parsePqsPluginConfig(raw)
    }, [rawProps])

    const routeRunBase = useMemo(() => {
        if (!config.routeManager) return null
        return buildRouteRunBase(config.routeManager)
    }, [config.routeManager])

    const { aliases: fieldAliases, report: fieldReport } = useMemo(() => {
        return resolveFieldAliases({
            fieldsMetadata: fieldsMetadata ?? {},
            configured: config.fieldAliases,
        })
    }, [fieldsMetadata, config.fieldAliases])

    const fieldIds = useMemo((): PqsFieldIds | null => {
        const required: (keyof PqsFieldIds)[] = [
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
        ]
        for (const k of required) {
            if (!fieldAliases[k]) return null
        }
        return fieldAliases as PqsFieldIds
    }, [fieldAliases])

    // Provide route base to image uploader without threading params everywhere.
    useEffect(() => {
        ;(globalThis as any).__PQS_ROUTE_RUN_BASE = routeRunBase
        return () => {
            delete (globalThis as any).__PQS_ROUTE_RUN_BASE
        }
    }, [routeRunBase])

    const catalogUrl = useMemo(() => {
        if (config.catalogUrl) return config.catalogUrl
        if (!config.routeManager) return ''
        return resolveCatalogUrl({
            routeManager: config.routeManager,
            catalogPath: config.catalogPath || '',
        })
    }, [config])

    const load = useCallback(async () => {
        setLoading(true)
        setLoadError(null)
        if (!catalogUrl) {
            setLoadError('Plugin is not configured: missing catalogue URL / route manager settings.')
            setDevices([])
            setLoading(false)
            return
        }
        const result = await loadBucketDevices({
            catalogUrl,
            bucketKey: config.catalogBucketKey,
        })
        if (result.ok) {
            setDevices(result.devices)
        } else {
            setLoadError(result.error)
            setDevices([])
        }
        setLoading(false)
    }, [catalogUrl, config.catalogBucketKey])

    useEffect(() => {
        load()
    }, [load])

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
        }
    }, [])

    const selectedCode =
        values && typeof values === 'object'
            ? fieldIds
                ? (values as any)[fieldIds.pqsCode]
                : undefined
            : undefined

    const selectedLabel = useMemo(() => {
        if (selectedCode == null || selectedCode === '') return ''
        const match = devices.find(
            (d) =>
                String(d.id) === String(selectedCode) ||
                String(d.details?.['imd-pqs_code']) === String(selectedCode)
        )
        return match ? deviceLabel(match) : String(selectedCode)
    }, [devices, selectedCode])

    useEffect(() => {
        if (isFocused) return
        const code =
            selectedCode == null || selectedCode === '' ? '' : String(selectedCode)
        setQuery(code ? selectedLabel : '')
    }, [selectedCode, selectedLabel, isFocused])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return devices.slice(0, LIST_LIMIT)
        return devices
            .filter((d) => deviceLabel(d).toLowerCase().includes(q))
            .slice(0, LIST_LIMIT)
    }, [devices, query])

    const suggestions = useMemo(() => {
        let list = filtered
        const sel =
            selectedCode != null && selectedCode !== ''
                ? devices.find(
                      (d) =>
                          String(d.id) === String(selectedCode) ||
                          String(d.details?.['imd-pqs_code']) ===
                              String(selectedCode)
                  )
                : undefined
        if (sel && !list.some((d) => d.id === sel.id)) {
            list = [sel, ...list]
        }
        return list
    }, [filtered, devices, selectedCode])

    useEffect(() => {
        setHighlightedIndex((h) => {
            const n = suggestions.length
            if (n === 0) return -1
            if (h < 0) return 0
            if (h >= n) return n - 1
            return h
        })
    }, [suggestions])

    const onPick = useCallback(
        (device: PqsCatalogueDevice) => {
            if (typeof setFieldValue !== 'function') return
            if (!fieldIds) return
            applyDeviceToForm(device, setFieldValue, fieldIds)
            setQuery(deviceLabel(device))
            setPanelOpen(false)
            setHighlightedIndex(-1)

            const imageUrl = device?.main_image
            if (
                config.enableImageUpload &&
                shouldIncludeImage() &&
                !!routeRunBase &&
                typeof imageUrl === 'string' &&
                imageUrl.length > 0
            ) {
                setImageStatus('uploading')
                setImageError(null)

                const cached = imageCacheRef.current.get(imageUrl)
                const run = async () => {
                    try {
                        const { id, name } = cached ?? (await uploadImageToFileResource(imageUrl))
                        if (!cached) imageCacheRef.current.set(imageUrl, { id, name })
                        if (!mountedRef.current) return
                        setFieldValue({
                            fieldId: fieldIds.applianceImage,
                            value: {
                                value: id,
                                name,
                                url: imageUrl,
                                previewUrl: imageUrl,
                            },
                            options: { touched: true, valid: true },
                        })
                        setImageStatus('idle')
                    } catch (e) {
                        if (!mountedRef.current) return
                        setImageStatus('error')
                        setImageError(String(e))
                    }
                }
                void run()
            } else {
                setImageStatus('idle')
                setImageError(null)
            }
        },
        [setFieldValue, query, selectedCode, config.enableImageUpload, routeRunBase, fieldIds]
    )

    const clearBlurTimeout = () => {
        if (blurTimeoutRef.current != null) {
            clearTimeout(blurTimeoutRef.current)
            blurTimeoutRef.current = null
        }
    }

    useEffect(
        () => () => {
            if (blurTimeoutRef.current != null) {
                clearTimeout(blurTimeoutRef.current)
            }
        },
        []
    )

    const updatePanelPosition = useCallback(() => {
        const el = inputRef.current
        if (!el) return
        const r = el.getBoundingClientRect()
        setPanelRect({
            top: r.bottom + 2,
            left: r.left,
            width: r.width,
        })
    }, [])

    useLayoutEffect(() => {
        if (!panelOpen) return
        updatePanelPosition()
        const onMove = () => updatePanelPosition()
        window.addEventListener('scroll', onMove, true)
        window.addEventListener('resize', onMove)
        return () => {
            window.removeEventListener('scroll', onMove, true)
            window.removeEventListener('resize', onMove)
        }
    }, [panelOpen, updatePanelPosition])

    const handleFocus = () => {
        clearBlurTimeout()
        setIsFocused(true)
        setPanelOpen(true)
        setHighlightedIndex(suggestions.length > 0 ? 0 : -1)
    }

    const handleBlur = () => {
        blurTimeoutRef.current = setTimeout(() => {
            setIsFocused(false)
            setPanelOpen(false)
            setHighlightedIndex(-1)
            blurTimeoutRef.current = null
        }, 150)
    }

    const handleChange = (e: any) => {
        setQuery(e.target.value)
        setPanelOpen(true)
        setHighlightedIndex(0)
    }

    const pickHighlightedOrFirst = () => {
        if (suggestions.length === 0) return
        const i =
            highlightedIndex >= 0 && highlightedIndex < suggestions.length
                ? highlightedIndex
                : 0
        onPick(suggestions[i])
    }

    const onKeyDown = (e: any) => {
        if (e.key === 'Escape') {
            e.preventDefault()
            setPanelOpen(false)
            setHighlightedIndex(-1)
            return
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (!panelOpen) setPanelOpen(true)
            setHighlightedIndex((prev) => {
                const len = suggestions.length
                if (len === 0) return -1
                if (prev < 0) return 0
                return Math.min(prev + 1, len - 1)
            })
            return
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault()
            if (!panelOpen) setPanelOpen(true)
            setHighlightedIndex((prev) => {
                const len = suggestions.length
                if (len === 0) return -1
                if (prev <= 0) return 0
                return prev - 1
            })
            return
        }
        if (e.key === 'Enter') {
            e.preventDefault()
            pickHighlightedOrFirst()
        }
    }

    const activeDescendantId =
        panelOpen && highlightedIndex >= 0 && suggestions[highlightedIndex]
            ? `${baseId}-opt-${highlightedIndex}`
            : undefined

    if (viewMode) {
        return (
            <div className={classes.wrap}>
                <div className={classes.label}>PQS appliance</div>
                <div className={classes.readonly} data-test="pqs-readonly">
                    {selectedLabel || '—'}
                </div>
            </div>
        )
    }

    // Configuration/field mapping validation (hybrid):
    // - Configurator mapping (fieldAliases) is preferred.
    // - Auto-map may fill some gaps, but we still require all semantic fields to be resolvable.
    if (!fieldIds) {
        return (
            <div className={classes.wrap}>
                <div className={classes.label}>Select PQS appliance</div>
                <div className={classes.error}>
                    Plugin is not fully configured. Missing field mappings.
                </div>
                {fieldReport.notes.length > 0 ? (
                    <div className={classes.meta}>{fieldReport.notes.join(' ')}</div>
                ) : null}
                {fieldReport.missing.length > 0 ? (
                    <div className={classes.meta}>
                        Missing: {fieldReport.missing.join(', ')}
                    </div>
                ) : null}
                <div className={classes.meta}>
                    Configure these in Tracker Plugin Configurator under field mapping (IdFromPlugin).
                </div>
            </div>
        )
    }

    if (!catalogUrl) {
        return (
            <div className={classes.wrap}>
                <div className={classes.label}>Select PQS appliance</div>
                <div className={classes.error}>
                    Plugin is not configured: missing catalogue URL or Route Manager settings.
                </div>
                <div className={classes.meta}>
                    Provide `catalogUrl`, or configure Route Manager (`routeManager.routeId`) and `catalogPath`.
                </div>
            </div>
        )
    }

    return (
        <div
            className={
                panelOpen
                    ? `${classes.wrap} ${classes.wrapElevated} ${classes.wrapPanelOpen}`
                    : classes.wrap
            }
        >
            <div className={classes.label}>Select PQS appliance</div>
            {loading && <div className={classes.meta}>Loading catalogue…</div>}
            {loadError && (
                <>
                    <div className={classes.error}>{loadError}</div>
                    <button
                        type="button"
                        className={classes.retry}
                        onClick={() => load()}
                    >
                        Retry
                    </button>
                </>
            )}
            {!loading && !loadError && (
                <>
                    <div className={classes.combobox}>
                        <input
                            ref={inputRef}
                            type="search"
                            className={classes.search}
                            data-test="pqs-combobox"
                            placeholder="Search by PQS code or product name…"
                            value={query}
                            onChange={handleChange}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            onKeyDown={onKeyDown}
                            role="combobox"
                            aria-expanded={panelOpen}
                            aria-controls={listboxId}
                            aria-autocomplete="list"
                            aria-activedescendant={activeDescendantId}
                            autoComplete="off"
                        />
                    </div>
                    {imageStatus === 'uploading' ? (
                        <div className={classes.meta}>Uploading image…</div>
                    ) : null}
                    {imageStatus === 'error' && imageError ? (
                        <div className={classes.error}>Image upload failed.</div>
                    ) : null}
                    {panelOpen &&
                        typeof document !== 'undefined' &&
                        createPortal(
                            <ul
                                id={listboxId}
                                role="listbox"
                                className={classes.suggestionsPortal}
                                data-test="pqs-suggestions"
                                style={{
                                    top: panelRect.top,
                                    left: panelRect.left,
                                    width: Math.max(panelRect.width, 200),
                                    maxHeight: SUGGESTIONS_MAX_HEIGHT_PX,
                                }}
                            >
                                {suggestions.length === 0 ? (
                                    <li className={classes.suggestionEmpty}>
                                        No matching devices.
                                    </li>
                                ) : (
                                    suggestions.map((d, i) => (
                                        <li
                                            key={d.id}
                                            id={`${baseId}-opt-${i}`}
                                            role="option"
                                            aria-selected={highlightedIndex === i}
                                            className={
                                                highlightedIndex === i
                                                    ? `${classes.suggestionItem} ${classes.suggestionHighlight}`
                                                    : classes.suggestionItem
                                            }
                                            onMouseDown={(e) => {
                                                e.preventDefault()
                                                onPick(d)
                                            }}
                                        >
                                            {deviceLabel(d)}
                                        </li>
                                    ))
                                )}
                            </ul>,
                            document.body
                        )}
                    {devices.length > LIST_LIMIT && !query.trim() ? (
                        <div className={classes.meta}>
                            Showing first {LIST_LIMIT} devices — type to narrow
                            results.
                        </div>
                    ) : null}
                </>
            )}
        </div>
    )
}

export default Plugin
