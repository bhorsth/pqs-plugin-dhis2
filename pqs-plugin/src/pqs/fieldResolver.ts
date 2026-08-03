import type { IFormFieldPluginProps } from '../plugin.types'
import { REQUIRED_SEMANTIC_FIELDS, type PqsSemanticFieldKey } from './dhis2Artifacts'
import type { PqsPluginFieldAliases } from './pluginConfig'

export type ResolvedFieldAliases = Record<PqsSemanticFieldKey, string>

export type FieldResolutionReport = {
    resolved: Partial<ResolvedFieldAliases>
    missing: PqsSemanticFieldKey[]
    notes: string[]
}

function norm(s: string): string {
    return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

function pickBestAlias(
    fieldsMetadata: IFormFieldPluginProps['fieldsMetadata'],
    candidates: { semantic: PqsSemanticFieldKey; wantType?: string; names: string[] }[]
): Partial<ResolvedFieldAliases> {
    const entries = Object.entries(fieldsMetadata ?? {})

    const resolved: Partial<ResolvedFieldAliases> = {}
    for (const c of candidates) {
        let best: { alias: string; score: number } | null = null
        for (const [alias, meta] of entries) {
            const type = String((meta as any)?.type ?? '')
            if (c.wantType && type && norm(type) !== norm(c.wantType)) {
                // Don't hard-fail on type mismatch; just penalize.
            }
            const text = [
                (meta as any)?.name,
                (meta as any)?.shortName,
                (meta as any)?.formName,
                (meta as any)?.description,
            ]
                .filter((v) => typeof v === 'string' && v.trim().length > 0)
                .map((v) => norm(String(v)))
                .join(' | ')

            let score = 0
            for (const n of c.names) {
                const nn = norm(n)
                if (!nn) continue
                if (text === nn) score += 12
                else if (text.includes(nn)) score += 6
            }
            if (c.wantType) {
                const want = norm(c.wantType)
                if (norm(type) === want) score += 3
            }
            if (score <= 0) continue
            if (!best || score > best.score) best = { alias, score }
        }
        if (best) resolved[c.semantic] = best.alias
    }
    return resolved
}

export function resolveFieldAliases(args: {
    fieldsMetadata: IFormFieldPluginProps['fieldsMetadata']
    configured: PqsPluginFieldAliases
}): { aliases: Partial<ResolvedFieldAliases>; report: FieldResolutionReport } {
    const configured = args.configured ?? {}
    const resolved: Partial<ResolvedFieldAliases> = { ...configured }
    const notes: string[] = []

    // Auto-map only missing fields.
    const missingForAuto = REQUIRED_SEMANTIC_FIELDS.filter((k) => !resolved[k])
    if (missingForAuto.length > 0) {
        const auto = pickBestAlias(args.fieldsMetadata, [
            {
                semantic: 'pqsCode',
                names: ['pqs code', 'pqs', 'appliance pqs code'],
            },
            { semantic: 'pqsCategory', names: ['pqs category', 'category', 'pqs cat'] },
            { semantic: 'company', names: ['company', 'manufacturer'] },
            { semantic: 'manufacturedIn', names: ['manufactured in', 'country of manufacture'] },
            { semantic: 'manufacturersReference', names: ["manufacturer's reference", 'reference'] },
            { semantic: 'energySource', names: ['energy source'] },
            {
                semantic: 'vaccineStorageCapacityL',
                names: ['vaccine storage capacity', 'storage capacity'],
            },
            {
                semantic: 'vaccineGrossVolumeL',
                names: ['vaccine gross volume', 'gross volume'],
            },
            { semantic: 'applianceImage', wantType: 'IMAGE', names: ['image', 'appliance image'] },
        ])

        for (const [k, v] of Object.entries(auto)) {
            const key = k as PqsSemanticFieldKey
            if (!resolved[key] && v) {
                resolved[key] = v
                notes.push(`Auto-mapped ${key} -> "${v}"`)
            }
        }
    }

    const missing = REQUIRED_SEMANTIC_FIELDS.filter((k) => !resolved[k])
    return {
        aliases: resolved,
        report: { resolved, missing, notes },
    }
}

