import http from 'http'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListPromptsRequestSchema,
    GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const require = createRequire(import.meta.url)

const compare = require('../src/services/compare.js')
const query = require('../src/services/query.js')

const dataDir = path.join(__dirname, '../data')
const sitesPath = path.join(dataDir, 'sites.json')
const plansPath = path.join(dataDir, 'analysis-plans.json')
const presetsPath = path.join(dataDir, 'presets.json')

const PORT = Number(process.env.MCP_PORT) || 3301
const DEFAULT_RESULT_LIMIT = Number(process.env.DEFAULT_RESULT_LIMIT) || 50
const MAX_RESULT_LIMIT = Number(process.env.MAX_RESULT_LIMIT) || 200

function readJson(filePath) {
    if (!fs.existsSync(filePath)) return []
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// Merge dimension filters: group-level overrides global for same dimension, stacks for different
function mergeFilters(globalFilters, groupFilters) {
    const gf = globalFilters || []
    const lf = groupFilters || []
    if (!gf.length) return lf
    if (!lf.length) return gf
    const groupDims = new Set(lf.map(f => f.dimension))
    return gf.filter(f => !groupDims.has(f.dimension)).concat(lf)
}

function withResultLimit(rows, limit) {
    const total = rows.length
    const cap = Math.min(Math.max(1, limit || DEFAULT_RESULT_LIMIT), MAX_RESULT_LIMIT)
    const truncated = total > cap
    return {
        rows: rows.slice(0, cap),
        _meta: {
            rowCount: total,
            showing: Math.min(total, cap),
            truncated,
            ...(truncated && {
                hint: `Showing ${cap} of ${total} rows. Refine with metricFilters (e.g. clicks >= 10, position <= 20) or add dimension filters to get more focused results. You can also increase resultLimit up to ${MAX_RESULT_LIMIT}.`
            })
        }
    }
}

function classifyError(e) {
    const msg = e.message || ''
    if (msg.includes('invalid_grant') || msg.includes('Token has been expired') || msg.includes('401') || msg.includes('403')) {
        return `Authentication failed — the OAuth2 token has expired or been revoked.\n` +
            `ACTION REQUIRED: Ask the user to restart the main GSC app (npm run dev in the project root) ` +
            `and complete the Google OAuth2 re-authorization in their browser, then restart this MCP server.\n` +
            `Original error: ${msg}`
    }
    return `Error: ${msg}`
}

const DATA_DELAY_NOTE = `GSC "final" data has a ~3-day delay in Asia/Shanghai (UTC+8). ` +
    `For dataState=final, ensure endDate ≤ today minus 3 days (e.g. if today is 2026-07-16, use endDate ≤ 2026-07-13). ` +
    `Use dataState=all to include fresh data, but note those figures may later be revised by Google.`

const TOOLS = [
    {
        name: 'list_sites',
        description: 'List all Google Search Console sites with their aliases and configuration. ' +
            'Always call this first to discover valid siteUrl values (e.g. sc-domain:example.com) before querying.',
        inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'query_performance',
        description: `Query GSC search performance data for a single period. ` +
            `Returns a static snapshot — no prior-period comparison, no delta signals. ` +
            `⚠️ Prefer compare_periods or run_preset/run_analysis_plan (comparePeriodsAdvanced) for most analyses; ` +
            `those show trend direction which is what drives actionable decisions. ` +
            `Use this only when the user explicitly wants a simple one-period lookup. ` +
            `DATA DELAY: ${DATA_DELAY_NOTE}`,
        inputSchema: {
            type: 'object',
            properties: {
                siteUrl: { type: 'string', description: 'GSC site URL (e.g. sc-domain:example.com). Use list_sites to find valid values.' },
                startDate: { type: 'string', description: 'Start date (YYYY-MM-DD). For final data, must be ≥ 16 months ago.' },
                endDate: { type: 'string', description: 'End date (YYYY-MM-DD). For final data, use ≤ today minus 3 days (Asia/Shanghai, UTC+8).' },
                dimensions: {
                    type: 'array',
                    items: { type: 'string', enum: ['query', 'page', 'country', 'device', 'date', 'searchAppearance'] },
                    description: 'Dimensions to group by',
                    default: ['query']
                },
                searchType: { type: 'string', enum: ['web', 'image', 'video', 'news', 'discover', 'googleNews'], default: 'web' },
                rowLimit: { type: 'number', description: 'Max rows fetched from GSC API (1–25000). Increase this to capture more raw data before filtering.', default: 100 },
                dataState: { type: 'string', enum: ['final', 'all'], description: 'final = verified data with ~3-day delay; all = includes today-1 day but may be revised', default: 'final' },
                orderBy: {
                    type: 'object',
                    properties: {
                        metric: { type: 'string', enum: ['clicks', 'impressions', 'ctr', 'position'] },
                        direction: { type: 'string', enum: ['ascending', 'descending'] }
                    }
                },
                filters: {
                    type: 'array',
                    description: 'Dimension filters applied at the GSC API level (e.g. country=BRA, page contains /blog/, query contains keyword).',
                    items: {
                        type: 'object',
                        properties: {
                            dimension: { type: 'string', enum: ['query', 'page', 'country', 'device', 'searchAppearance'] },
                            operator: { type: 'string', enum: ['contains', 'notContains', 'equals', 'notEquals', 'includingRegex', 'excludingRegex'] },
                            expression: { type: 'string' }
                        },
                        required: ['dimension', 'operator', 'expression']
                    },
                    default: []
                },
                resultLimit: { type: 'number', description: `Max rows to return after all filtering (default ${DEFAULT_RESULT_LIMIT}, max ${MAX_RESULT_LIMIT}). When truncated, the response includes _meta.hint with refinement suggestions.` }
            },
            required: ['siteUrl', 'startDate', 'endDate']
        }
    },
    {
        name: 'compare_periods',
        description: `Compare GSC metrics between the given date range and the equal-length prior period. ` +
            `Returns rows with current/previous metrics and computed deltas (absolute and percent change). ` +
            `Rows with no data in the previous period are marked isNew=true. ` +
            `DATA DELAY: ${DATA_DELAY_NOTE}`,
        inputSchema: {
            type: 'object',
            properties: {
                siteUrl: { type: 'string', description: 'GSC site URL. Use list_sites to find valid values.' },
                startDate: { type: 'string', description: 'Current period start (YYYY-MM-DD).' },
                endDate: { type: 'string', description: 'Current period end (YYYY-MM-DD). For final data, use ≤ today minus 3 days (UTC+8).' },
                dimensions: {
                    type: 'array',
                    items: { type: 'string', enum: ['query', 'page', 'country', 'device', 'date', 'searchAppearance'] },
                    default: ['query']
                },
                searchType: { type: 'string', enum: ['web', 'image', 'video', 'news', 'discover', 'googleNews'], default: 'web' },
                rowLimit: { type: 'number', description: 'Max rows fetched from GSC API per period (1–25000).', default: 100 },
                dataState: { type: 'string', enum: ['final', 'all'], default: 'final' },
                orderBy: {
                    type: 'object',
                    properties: {
                        metric: { type: 'string', enum: ['clicks', 'impressions', 'ctr', 'position'] },
                        direction: { type: 'string', enum: ['ascending', 'descending'] }
                    }
                },
                filters: {
                    type: 'array',
                    description: 'Dimension filters applied at the GSC API level (e.g. country=BRA to restrict to Brazil, page contains /blog/, query contains keyword).',
                    items: {
                        type: 'object',
                        properties: {
                            dimension: { type: 'string', enum: ['query', 'page', 'country', 'device', 'searchAppearance'] },
                            operator: { type: 'string', enum: ['contains', 'notContains', 'equals', 'notEquals', 'includingRegex', 'excludingRegex'] },
                            expression: { type: 'string' }
                        },
                        required: ['dimension', 'operator', 'expression']
                    },
                    default: []
                },
                metricFilters: {
                    type: 'array',
                    description: 'Filter rows by current-period metric values after comparison is computed. Use to focus on e.g. high-traffic or top-ranked queries.',
                    items: {
                        type: 'object',
                        properties: {
                            metric: { type: 'string', enum: ['clicks', 'impressions', 'ctr', 'position'] },
                            operator: { type: 'string', enum: ['>', '>=', '<', '<=', '=', '!='] },
                            value: { type: 'number' }
                        },
                        required: ['metric', 'operator', 'value']
                    },
                    default: []
                },
                resultLimit: { type: 'number', description: `Max rows to return after all filtering (default ${DEFAULT_RESULT_LIMIT}, max ${MAX_RESULT_LIMIT}). Truncated responses include _meta.hint with refinement suggestions.` }
            },
            required: ['siteUrl', 'startDate', 'endDate']
        }
    },
    {
        name: 'list_analysis_plans',
        description: 'List saved analysis plans. Each plan contains named groups, each group defining dimensions, filters and metric thresholds for compare_periods. Use plan IDs with run_analysis_plan.',
        inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'list_presets',
        description: 'List all saved query presets. Presets are reusable site-agnostic query configurations (dimensions, filters, metric thresholds) that can be applied to any site. They can also be referenced as groups within analysis plans.',
        inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'save_preset',
        description: 'Create a new query preset or overwrite an existing one. Presets are site-agnostic — do not include siteUrl. Use fn=comparePeriodsAdvanced for comparison queries or fn=queryPerformanceAdvanced for single-period queries.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Preset ID. Omit to auto-generate; provide an existing ID to overwrite.' },
                name: { type: 'string', description: 'Human-readable preset name.' },
                fn: { type: 'string', enum: ['comparePeriodsAdvanced', 'queryPerformanceAdvanced'], description: 'Which query function this preset uses.' },
                params: {
                    type: 'object',
                    description: 'Query parameters — same fields as compare_periods or query_performance. Do NOT include siteUrl (site is selected at query time).',
                    properties: {
                        dimensions: { type: 'array', items: { type: 'string', enum: ['query', 'page', 'country', 'device', 'date', 'searchAppearance'] } },
                        searchType: { type: 'string', enum: ['web', 'image', 'video', 'news', 'discover', 'googleNews'] },
                        rowLimit: { type: 'number' },
                        dataState: { type: 'string', enum: ['final', 'all'] },
                        orderBy: { type: 'object', properties: { metric: { type: 'string' }, direction: { type: 'string' } } },
                        filters: { type: 'array', items: { type: 'object' } },
                        metricFilters: { type: 'array', items: { type: 'object' } },
                        previousMetricFilters: { type: 'array', items: { type: 'object' } },
                        deltaFilters: { type: 'array', items: { type: 'object' } },
                        dateShortcut: { type: 'object', description: 'Relative date shortcut for UI use (e.g. { label: "近7天", days: 7 }). Optional, ignored by run_analysis_plan.' }
                    }
                }
            },
            required: ['name', 'fn', 'params']
        }
    },
    {
        name: 'delete_preset',
        description: 'Permanently delete a query preset by ID. Note: analysis plan groups that reference this preset via presetId will fail when run. Use list_presets to find the ID first.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Preset ID to delete.' }
            },
            required: ['id']
        }
    },
    {
        name: 'run_preset',
        description: `Execute a saved preset by ID for a given site and date range. ` +
            `The preset provides all query configuration (dimensions, filters, thresholds) — you only need to supply siteUrl and dates. ` +
            `Use list_presets to find preset IDs. ` +
            `Optionally pass filters to narrow by market/device/etc. on top of the preset's own filters (same-dimension overrides, different-dimension stacks). ` +
            `DATA DELAY: ${DATA_DELAY_NOTE}`,
        inputSchema: {
            type: 'object',
            properties: {
                presetId: { type: 'string', description: 'Preset ID from list_presets.' },
                siteUrl: { type: 'string', description: 'GSC site URL. Use list_sites to find valid values.' },
                startDate: { type: 'string', description: 'Start date (YYYY-MM-DD). For final data, use ≤ today minus 3 days (UTC+8).' },
                endDate: { type: 'string', description: 'End date (YYYY-MM-DD). For final data, use ≤ today minus 3 days (UTC+8).' },
                dataState: { type: 'string', enum: ['final', 'all'], description: 'Overrides preset\'s dataState if provided.' },
                filters: {
                    type: 'array',
                    description: 'Additional dimension filters merged with the preset\'s own filters (e.g. country=BRA to narrow to Brazil). Same-dimension entry overrides the preset\'s; different-dimension entry stacks.',
                    items: {
                        type: 'object',
                        properties: {
                            dimension: { type: 'string', enum: ['query', 'page', 'country', 'device', 'searchAppearance'] },
                            operator: { type: 'string', enum: ['contains', 'notContains', 'equals', 'notEquals', 'includingRegex', 'excludingRegex'] },
                            expression: { type: 'string' }
                        },
                        required: ['dimension', 'operator', 'expression']
                    },
                    default: []
                },
                resultLimit: { type: 'number', description: `Max rows to return (default ${DEFAULT_RESULT_LIMIT}, max ${MAX_RESULT_LIMIT}).` }
            },
            required: ['presetId', 'siteUrl', 'startDate', 'endDate']
        }
    },
    {
        name: 'save_analysis_plan',
        description: 'Create a new analysis plan or overwrite an existing one. ' +
            'Each group defines an independent compare_periods query with its own dimensions, filters, and metric thresholds. ' +
            'Returns the saved plan including auto-generated IDs. ' +
            'Tip: design groups around distinct SEO segments (e.g. top-ranked, rising, long-tail) — each group will appear as a separate result table when the plan is run.',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    description: 'Plan ID. Omit to create a new plan with an auto-generated ID; provide an existing plan ID to overwrite it.'
                },
                name: { type: 'string', description: 'Human-readable plan name.' },
                groups: {
                    type: 'array',
                    description: 'Query groups. At least one required.',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', description: 'Group ID. Omit to auto-generate.' },
                            name: { type: 'string', description: 'Group label shown in results.' },
                            presetId: { type: 'string', description: 'Reference a saved preset by ID. When set, the group uses that preset\'s params at runtime. Provide deltaFilters to add delta-based filtering on top. All other group fields are ignored when presetId is set.' },
                            dimensions: {
                                type: 'array',
                                items: { type: 'string', enum: ['query', 'page', 'country', 'device', 'date', 'searchAppearance'] },
                                default: ['query']
                            },
                            searchType: { type: 'string', enum: ['web', 'image', 'video', 'news', 'discover', 'googleNews'], default: 'web' },
                            rowLimit: { type: 'number', description: 'Max rows fetched from GSC per period.', default: 100 },
                            orderBy: {
                                type: 'object',
                                properties: {
                                    metric: { type: 'string', enum: ['clicks', 'impressions', 'ctr', 'position'] },
                                    direction: { type: 'string', enum: ['ascending', 'descending'] }
                                }
                            },
                            filters: {
                                type: 'array',
                                description: 'Dimension filters applied at the GSC API level (e.g. query contains "keyword", page equals "/blog/").',
                                items: {
                                    type: 'object',
                                    properties: {
                                        dimension: { type: 'string', enum: ['query', 'page', 'country', 'device', 'searchAppearance'] },
                                        operator: { type: 'string', enum: ['contains', 'notContains', 'equals', 'notEquals', 'includingRegex', 'excludingRegex'] },
                                        expression: { type: 'string' }
                                    },
                                    required: ['dimension', 'operator', 'expression']
                                },
                                default: []
                            },
                            metricFilters: {
                                type: 'array',
                                description: 'Filter rows by current-period metric values after the query (e.g. position <= 10, impressions >= 50).',
                                items: {
                                    type: 'object',
                                    properties: {
                                        metric: { type: 'string', enum: ['clicks', 'impressions', 'ctr', 'position'] },
                                        operator: { type: 'string', enum: ['>', '>=', '<', '<=', '=', '!='] },
                                        value: { type: 'number' }
                                    },
                                    required: ['metric', 'operator', 'value']
                                },
                                default: []
                            },
                            previousMetricFilters: {
                                type: 'array',
                                description: 'Same structure as metricFilters but applied to the previous period values.',
                                items: {
                                    type: 'object',
                                    properties: {
                                        metric: { type: 'string', enum: ['clicks', 'impressions', 'ctr', 'position'] },
                                        operator: { type: 'string', enum: ['>', '>=', '<', '<=', '=', '!='] },
                                        value: { type: 'number' }
                                    },
                                    required: ['metric', 'operator', 'value']
                                },
                                default: []
                            },
                            deltaFilters: {
                                type: 'array',
                                description: 'Filter rows by the change between periods. metric is one of clicks/impressions/ctr/position; value is absolute delta unless isPercent=true.',
                                items: {
                                    type: 'object',
                                    properties: {
                                        metric: { type: 'string', enum: ['clicks', 'impressions', 'ctr', 'position'] },
                                        operator: { type: 'string', enum: ['>', '>=', '<', '<=', '=', '!='] },
                                        value: { type: 'number' },
                                        isPercent: { type: 'boolean', default: false }
                                    },
                                    required: ['metric', 'operator', 'value']
                                },
                                default: []
                            }
                        },
                        required: ['name']
                    },
                    minItems: 1
                }
            },
            required: ['name', 'groups']
        }
    },
    {
        name: 'delete_analysis_plan',
        description: 'Permanently delete an analysis plan by ID. Use list_analysis_plans to find the ID first. This cannot be undone.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Plan ID to delete.' }
            },
            required: ['id']
        }
    },
    {
        name: 'run_analysis_plan',
        description: `Execute a saved analysis plan across multiple query groups in sequence. ` +
            `Each group runs compare_periods with its own filter configuration. ` +
            `Results are returned per group, each with its own _meta truncation info. ` +
            `DATA DELAY: ${DATA_DELAY_NOTE}`,
        inputSchema: {
            type: 'object',
            properties: {
                planId: { type: 'string', description: 'Plan ID from list_analysis_plans.' },
                siteUrl: { type: 'string', description: 'GSC site URL. Use list_sites to find valid values.' },
                startDate: { type: 'string', description: 'Current period start (YYYY-MM-DD).' },
                endDate: { type: 'string', description: 'Current period end (YYYY-MM-DD). For final data, use ≤ today minus 3 days (UTC+8).' },
                dataState: { type: 'string', enum: ['final', 'all'], default: 'final' },
                groupIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Subset of group IDs to run. Omit to run all groups in the plan.'
                },
                globalFilters: {
                    type: 'array',
                    description: 'Dimension filters applied to every group. Group-level filters for the same dimension override these; different-dimension filters stack (CSS-like). Example: [{ dimension: "country", operator: "equals", expression: "BRA" }] to narrow all groups to Brazil.',
                    items: {
                        type: 'object',
                        properties: {
                            dimension: { type: 'string', enum: ['query', 'page', 'country', 'device', 'searchAppearance'] },
                            operator: { type: 'string', enum: ['contains', 'notContains', 'equals', 'notEquals', 'includingRegex', 'excludingRegex'] },
                            expression: { type: 'string' }
                        },
                        required: ['dimension', 'operator', 'expression']
                    },
                    default: []
                },
                resultLimit: { type: 'number', description: `Max rows per group to return (default ${DEFAULT_RESULT_LIMIT}, max ${MAX_RESULT_LIMIT}). Each group result includes _meta with truncation info.` }
            },
            required: ['planId', 'siteUrl', 'startDate', 'endDate']
        }
    }
]

const PROMPTS = [
    {
        name: 'gsc_usage_guide',
        description: 'Operational guide for querying Google Search Console data — date delay rules, authentication, and best practices'
    }
]

const GSC_USAGE_GUIDE = `# GSC MCP Server — Usage Guide

## Data Freshness (IMPORTANT)

GSC "Final" data has a processing delay of approximately **3 days** in the Asia/Shanghai timezone (UTC+8).

- dataState=final → endDate must be ≤ today minus 3 days
  - Example: if today is 2026-07-16, use endDate ≤ 2026-07-13
- dataState=all → includes data up to yesterday (today-1), but Google may revise these numbers later
- When a user says "latest data" or "recent", default to final with the 3-day-adjusted date unless they explicitly say they want fresh unverified data

## Authentication Errors

If any tool returns a message containing "invalid_grant", "Token has been expired or revoked", HTTP 401, or HTTP 403:

1. Tell the user: "Your Google OAuth2 token has expired."
2. Instruct them to: restart the main GSC app (\`npm run dev\` in the project root) and complete the browser-based re-authorization flow.
3. After re-auth, they should restart the MCP server (\`node server.js\` in the \`mcp/\` directory).

## Query Strategy — Always Prefer Comparison

**Default to compare_periods, run_preset, or run_analysis_plan** for virtually all analyses.
Comparison queries return delta values (change vs prior period) which tell you whether things are improving
or declining — that directional signal is what makes analysis actionable.

query_performance returns a static snapshot with no trend context. Only use it when the user explicitly
asks for a simple lookup and has no interest in the trend (rare).

## Recommended Workflow

1. **list_sites** — always start here to get valid siteUrl values
2. **list_presets** / **list_analysis_plans** — check if a relevant preset or plan already exists before constructing parameters from scratch
3. **run_preset** or **run_analysis_plan** — execute saved configurations directly
4. **compare_periods** — for ad-hoc comparison queries not covered by existing presets
5. **query_performance** — last resort, single-period only, no trend signal

## Result Truncation

When results are large, responses include a \`_meta\` block:
\`\`\`json
{
  "_meta": {
    "rowCount": 1500,
    "showing": 50,
    "truncated": true,
    "hint": "Showing 50 of 1500 rows. Refine with metricFilters..."
  }
}
\`\`\`
Follow the hint — add metricFilters or dimension filters before increasing resultLimit.

## Rate Limits

GSC API has quotas. If you see quota errors, wait 1–2 minutes before retrying.
`

async function callTool(name, args) {
    switch (name) {
        case 'list_sites':
            return readJson(sitesPath)

        case 'query_performance': {
            const rows = await query.queryPerformanceAdvanced({
                siteUrl: args.siteUrl,
                startDate: args.startDate,
                endDate: args.endDate,
                dimensions: args.dimensions || ['query'],
                searchType: args.searchType || 'web',
                rowLimit: args.rowLimit || 100,
                dataState: args.dataState || 'final',
                orderBy: args.orderBy,
                filters: args.filters || []
            })
            return withResultLimit(rows, args.resultLimit)
        }

        case 'compare_periods': {
            const r = await compare.comparePeriodsAdvanced({
                siteUrl: args.siteUrl,
                startDate: args.startDate,
                endDate: args.endDate,
                dimensions: args.dimensions || ['query'],
                searchType: args.searchType || 'web',
                rowLimit: args.rowLimit || 100,
                dataState: args.dataState || 'final',
                orderBy: args.orderBy,
                filters: args.filters || [],
                metricFilters: args.metricFilters || []
            })
            return { currentPeriod: r.currentPeriod, previousPeriod: r.previousPeriod, ...withResultLimit(r.rows || [], args.resultLimit) }
        }

        case 'list_presets':
            return readJson(presetsPath)

        case 'save_preset': {
            const presets = readJson(presetsPath)
            const isNew = !args.id || !presets.some(p => p.id === args.id)
            const presetId = isNew ? generateId() : args.id
            const params = Object.assign({}, args.params)
            delete params.siteUrl
            const preset = { id: presetId, name: args.name, fn: args.fn, params }
            if (isNew) {
                presets.push(preset)
            } else {
                const idx = presets.findIndex(p => p.id === presetId)
                presets[idx] = preset
            }
            writeJson(presetsPath, presets)
            return { ok: true, action: isNew ? 'created' : 'updated', preset }
        }

        case 'delete_preset': {
            const presets = readJson(presetsPath)
            if (!presets.some(p => p.id === args.id)) throw new Error(`Preset '${args.id}' not found`)
            writeJson(presetsPath, presets.filter(p => p.id !== args.id))
            return { ok: true, deleted: args.id }
        }

        case 'run_preset': {
            const presets = readJson(presetsPath)
            const preset = presets.find(p => p.id === args.presetId)
            if (!preset) throw new Error(`Preset '${args.presetId}' not found`)

            const effectiveFilters = mergeFilters(args.filters || [], preset.params.filters || [])
            const params = Object.assign({}, preset.params, {
                siteUrl: args.siteUrl,
                startDate: args.startDate,
                endDate: args.endDate,
                dataState: args.dataState || preset.params.dataState || 'final',
                filters: effectiveFilters
            })
            delete params.dateShortcut
            delete params.startRow

            if (preset.fn === 'queryPerformanceAdvanced') {
                const rows = await query.queryPerformanceAdvanced(params)
                return withResultLimit(rows, args.resultLimit)
            } else {
                const r = await compare.comparePeriodsAdvanced(params)
                return { currentPeriod: r.currentPeriod, previousPeriod: r.previousPeriod, ...withResultLimit(r.rows || [], args.resultLimit) }
            }
        }

        case 'list_analysis_plans':
            return readJson(plansPath)

        case 'save_analysis_plan': {
            const plans = readJson(plansPath)
            const isNew = !args.id || !plans.some(p => p.id === args.id)
            const planId = isNew ? generateId() : args.id
            const plan = {
                id: planId,
                name: args.name,
                groups: (args.groups || []).map(g => {
                    if (g.presetId) {
                        return { id: g.id || generateId(), name: g.name, presetId: g.presetId, deltaFilters: g.deltaFilters || [] }
                    }
                    return {
                        id: g.id || generateId(),
                        name: g.name,
                        dimensions: g.dimensions || ['query'],
                        searchType: g.searchType || 'web',
                        rowLimit: g.rowLimit || 100,
                        orderBy: g.orderBy || undefined,
                        filters: g.filters || [],
                        metricFilters: g.metricFilters || [],
                        previousMetricFilters: g.previousMetricFilters || [],
                        deltaFilters: g.deltaFilters || []
                    }
                })
            }
            if (isNew) {
                plans.push(plan)
            } else {
                const idx = plans.findIndex(p => p.id === planId)
                plans[idx] = plan
            }
            writeJson(plansPath, plans)
            return { ok: true, action: isNew ? 'created' : 'updated', plan }
        }

        case 'delete_analysis_plan': {
            const plans = readJson(plansPath)
            const exists = plans.some(p => p.id === args.id)
            if (!exists) throw new Error(`Plan '${args.id}' not found`)
            writeJson(plansPath, plans.filter(p => p.id !== args.id))
            return { ok: true, deleted: args.id }
        }

        case 'run_analysis_plan': {
            const plans = readJson(plansPath)
            const presets = readJson(presetsPath)
            const plan = plans.find(p => p.id === args.planId)
            if (!plan) throw new Error(`Plan '${args.planId}' not found`)

            const groups = args.groupIds && args.groupIds.length
                ? plan.groups.filter(g => args.groupIds.includes(g.id))
                : plan.groups
            if (!groups.length) throw new Error('No matching groups in plan')

            const groupResults = []
            for (const group of groups) {
                let rg = group
                if (group.presetId) {
                    const preset = presets.find(p => p.id === group.presetId)
                    if (!preset) throw new Error(`Preset '${group.presetId}' not found (referenced by group '${group.name}')`)
                    rg = Object.assign({}, preset.params, { id: group.id, name: group.name, deltaFilters: group.deltaFilters || [] })
                }
                const r = await compare.comparePeriodsAdvanced({
                    siteUrl: args.siteUrl,
                    startDate: args.startDate,
                    endDate: args.endDate,
                    dataState: args.dataState || 'final',
                    dimensions: rg.dimensions || ['query'],
                    searchType: rg.searchType || 'web',
                    rowLimit: rg.rowLimit || 100,
                    orderBy: rg.orderBy,
                    filters: mergeFilters(args.globalFilters || [], rg.filters || []),
                    metricFilters: rg.metricFilters || [],
                    previousMetricFilters: rg.previousMetricFilters || [],
                    deltaFilters: rg.deltaFilters || []
                })
                groupResults.push({
                    group: rg.name,
                    groupId: rg.id,
                    ...(group.presetId && { presetId: group.presetId }),
                    currentPeriod: r.currentPeriod,
                    previousPeriod: r.previousPeriod,
                    ...withResultLimit(r.rows || [], args.resultLimit)
                })
            }
            return { plan: { id: plan.id, name: plan.name }, siteUrl: args.siteUrl, groups: groupResults }
        }

        default:
            throw new Error(`Unknown tool: ${name}`)
    }
}

const SERVER_INSTRUCTIONS = `You are connected to a Google Search Console (GSC) MCP server.

KEY RULES:
1. ALWAYS prefer compare_periods / run_preset (comparePeriodsAdvanced) / run_analysis_plan over query_performance.
   Comparison queries show trend deltas (change vs prior period) which have real actionable value.
   query_performance returns a static snapshot with no directional signal — only use it when the user explicitly asks for a simple lookup with no trend context.
2. GSC Final data has ~3 day delay (Asia/Shanghai, UTC+8). Always adjust endDate when dataState=final.
   Example: today 2026-07-17 → endDate ≤ 2026-07-14.
3. Auth errors (invalid_grant, 401, 403) mean the OAuth2 token expired. Tell the user to re-run the Google login flow.
4. Start with list_sites to discover valid siteUrl values before querying.
5. When results are truncated (_meta.truncated=true), follow _meta.hint before increasing resultLimit.

Call the "gsc_usage_guide" prompt for the full operational guide.`

function buildMcpServer() {
    const server = new Server(
        { name: 'gsc-tools', version: '1.0.0' },
        {
            capabilities: { tools: {}, prompts: {} },
            instructions: SERVER_INSTRUCTIONS
        }
    )

    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

    server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: PROMPTS }))

    server.setRequestHandler(GetPromptRequestSchema, async (request) => {
        const { name } = request.params
        if (name !== 'gsc_usage_guide') throw new Error(`Unknown prompt: ${name}`)
        return {
            description: PROMPTS[0].description,
            messages: [
                { role: 'user', content: { type: 'text', text: GSC_USAGE_GUIDE } }
            ]
        }
    })

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params
        try {
            const result = await callTool(name, args || {})
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
        } catch (e) {
            return { content: [{ type: 'text', text: classifyError(e) }], isError: true }
        }
    })

    return server
}

const httpServer = http.createServer(async (req, res) => {
    const pathname = new URL(req.url, `http://localhost:${PORT}`).pathname

    if (pathname !== '/mcp') {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        return res.end('Not found')
    }

    try {
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
        await buildMcpServer().connect(transport)
        await transport.handleRequest(req, res)
    } catch (e) {
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: e.message }))
        }
    }
})

httpServer.listen(PORT, () => {
    console.log(`GSC MCP server listening on http://localhost:${PORT}/mcp`)
    console.log(`  DEFAULT_RESULT_LIMIT=${DEFAULT_RESULT_LIMIT}  MAX_RESULT_LIMIT=${MAX_RESULT_LIMIT}`)
})
