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

const PORT = Number(process.env.MCP_PORT) || 3301
const DEFAULT_RESULT_LIMIT = Number(process.env.DEFAULT_RESULT_LIMIT) || 50
const MAX_RESULT_LIMIT = Number(process.env.MAX_RESULT_LIMIT) || 200

function readJson(filePath) {
    if (!fs.existsSync(filePath)) return []
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
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
        description: `Query GSC search performance data for a site and date range. ` +
            `Returns rows grouped by the requested dimensions with clicks, impressions, CTR and position. ` +
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

## Recommended Workflow

1. **list_sites** — always start here to get valid siteUrl values
2. **compare_periods** — for trend analysis; automatically computes the equal-length prior period
3. **run_analysis_plan** — to apply a saved multi-group analysis in one call
4. **query_performance** — for single-period deep dives

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
                orderBy: args.orderBy
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
                metricFilters: args.metricFilters || []
            })
            return { currentPeriod: r.currentPeriod, previousPeriod: r.previousPeriod, ...withResultLimit(r.rows || [], args.resultLimit) }
        }

        case 'list_analysis_plans':
            return readJson(plansPath)

        case 'run_analysis_plan': {
            const plans = readJson(plansPath)
            const plan = plans.find(p => p.id === args.planId)
            if (!plan) throw new Error(`Plan '${args.planId}' not found`)

            const groups = args.groupIds && args.groupIds.length
                ? plan.groups.filter(g => args.groupIds.includes(g.id))
                : plan.groups
            if (!groups.length) throw new Error('No matching groups in plan')

            const groupResults = []
            for (const group of groups) {
                const r = await compare.comparePeriodsAdvanced({
                    siteUrl: args.siteUrl,
                    startDate: args.startDate,
                    endDate: args.endDate,
                    dataState: args.dataState || 'final',
                    dimensions: group.dimensions || ['query'],
                    searchType: group.searchType || 'web',
                    rowLimit: group.rowLimit || 100,
                    orderBy: group.orderBy,
                    filters: group.filters || [],
                    metricFilters: group.metricFilters || [],
                    previousMetricFilters: group.previousMetricFilters || [],
                    deltaFilters: group.deltaFilters || []
                })
                groupResults.push({
                    group: group.name,
                    groupId: group.id,
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
1. GSC Final data has ~3 day delay (Asia/Shanghai, UTC+8). Always adjust endDate when dataState=final.
   Example: today 2026-07-16 → endDate ≤ 2026-07-13.
2. Auth errors (invalid_grant, 401, 403) mean the OAuth2 token expired. Tell the user to re-run the Google login flow.
3. Start with list_sites to discover valid siteUrl values before querying.
4. When results are truncated (_meta.truncated=true), follow _meta.hint before increasing resultLimit.

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
