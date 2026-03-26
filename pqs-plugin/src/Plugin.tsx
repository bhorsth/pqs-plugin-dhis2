import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
    // DHIS2 Capture runtime can pass different prop shapes across versions.
    // Avoid crashing and log what we actually receive so we can map correctly.
    const values = (rawProps as any)?.values ?? {}
    const viewMode = Boolean((rawProps as any)?.viewMode)
    const setFieldValue = (rawProps as any)?.setFieldValue as
        | IFormFieldPluginProps['setFieldValue']
        | undefined
    const [query, setQuery] = useState('')
    const [devices, setDevices] = useState([] as PqsCatalogueDevice[])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null as string | null)

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

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return devices.slice(0, LIST_LIMIT)
        return devices
            .filter((d) => deviceLabel(d).toLowerCase().includes(q))
            .slice(0, LIST_LIMIT)
    }, [devices, query])

    const onPick = (device: PqsCatalogueDevice) => {
        if (typeof setFieldValue !== 'function') return
        applyDeviceToForm(device, setFieldValue)
        setQuery('')
    }

    if (viewMode) {
        return (
            <div className={classes.wrap}>
                <div className={classes.label}>PQS appliance (E003)</div>
                <div className={classes.readonly} data-test="pqs-readonly">
                    {selectedLabel || '—'}
                </div>
            </div>
        )
    }

    return (
        <div className={classes.wrap}>
            <div className={classes.label}>Select PQS appliance (E003)</div>
            <p className={classes.meta}>
                Sets PQS code and related attributes for program rules. PQS code
                is written to the form; hide the default &quot;PQS code&quot;
                field in Capture layout if you only want this picker visible.
            </p>
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
                    <input
                        type="search"
                        className={classes.search}
                        placeholder="Search by PQS code or product name…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        aria-label="Search PQS devices"
                    />
                    {selectedCode ? (
                        <div className={classes.meta}>
                            Selected: <strong>{selectedLabel}</strong>
                        </div>
                    ) : null}
                    <ul className={classes.list} role="listbox">
                        {filtered.map((d) => (
                            <li
                                key={d.id}
                                role="option"
                                tabIndex={0}
                                className={classes.item}
                                onClick={() => onPick(d)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        onPick(d)
                                    }
                                }}
                            >
                                {deviceLabel(d)}
                            </li>
                        ))}
                    </ul>
                    {filtered.length === 0 ? (
                        <div className={classes.meta}>No matching devices.</div>
                    ) : null}
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
