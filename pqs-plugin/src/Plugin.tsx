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
import { loadE003Devices, resolveCatalogUrl } from './pqs/loadCatalog'
import {
    PQS_FIELD_IDS,
    deviceLabel,
    getFieldUpdatesFromDevice,
    type PqsCatalogueDevice,
} from './pqs/pqsFieldMapping'
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

function applyDeviceToForm(
    device: PqsCatalogueDevice,
    setFieldValue: IFormFieldPluginProps['setFieldValue']
): void {
    const updates = getFieldUpdatesFromDevice(device, {
        includeImage: shouldIncludeImage(),
    })
    for (const { fieldId, value } of updates) {
        setFieldValue({
            fieldId,
            value,
            options: { touched: true, valid: true },
        })
    }
}

const Plugin = (rawProps: Partial<IFormFieldPluginProps> & Record<string, unknown>) => {
    const values = (rawProps as any)?.values ?? {}
    const viewMode = Boolean((rawProps as any)?.viewMode)
    const setFieldValue = (rawProps as any)?.setFieldValue as
        | IFormFieldPluginProps['setFieldValue']
        | undefined

    const [query, setQuery] = useState('')
    const [devices, setDevices] = useState([] as PqsCatalogueDevice[])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null as string | null)
    const [panelOpen, setPanelOpen] = useState(false)
    const [highlightedIndex, setHighlightedIndex] = useState(-1)
    const [isFocused, setIsFocused] = useState(false)

    const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const [panelRect, setPanelRect] = useState({ top: 0, left: 0, width: 0 })
    const reactId = useId()
    const baseId = `pqs-${reactId.replace(/:/g, '')}`
    const listboxId = `${baseId}-listbox`

    const catalogUrl = resolveCatalogUrl()

    const load = useCallback(async () => {
        setLoading(true)
        setLoadError(null)
        const result = await loadE003Devices(catalogUrl)
        if (result.ok) {
            setDevices(result.devices)
        } else {
            setLoadError(result.error)
            setDevices([])
        }
        setLoading(false)
    }, [catalogUrl])

    useEffect(() => {
        load()
    }, [load])

    const selectedCode =
        values && typeof values === 'object'
            ? (values as any)[PQS_FIELD_IDS.pqsCode]
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
            applyDeviceToForm(device, setFieldValue)
            setQuery(deviceLabel(device))
            setPanelOpen(false)
            setHighlightedIndex(-1)
        },
        [setFieldValue]
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

    return (
        <div
            className={
                panelOpen
                    ? `${classes.wrap} ${classes.wrapElevated}`
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
