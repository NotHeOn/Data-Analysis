'use strict'
const http = require('http')
const fs = require('fs')
const path = require('path')
const { URL } = require('url')
const gsc = require('./adapters/gsc')
const query = require('./services/query')
const compare = require('./services/compare')

const PORT = 3300
const publicDir = path.join(__dirname, '../public')
const dataDir = path.join(__dirname, '../data')
const presetsPath = path.join(dataDir, 'presets.json')
const sitesPath = path.join(dataDir, 'sites.json')
const analysisPlansPath = path.join(dataDir, 'analysis-plans.json')

const DEFAULT_ANALYSIS_PLANS = [
    {
        id: 'default', name: '默认分析方案',
        groups: [
            {
                id: 'g1', name: '核心关键词', dimensions: ['query'], searchType: 'web', rowLimit: 100,
                orderBy: { metric: 'clicks', direction: 'descending' }, filters: [], deltaFilters: [],
                metricFilters: [{ metric: 'position', operator: '<=', value: 5 }, { metric: 'impressions', operator: '>=', value: 100 }],
                previousMetricFilters: []
            },
            {
                id: 'g2', name: '可冲刺关键词', dimensions: ['query'], searchType: 'web', rowLimit: 100,
                orderBy: { metric: 'impressions', direction: 'descending' }, filters: [], deltaFilters: [],
                metricFilters: [{ metric: 'position', operator: '>=', value: 6 }, { metric: 'position', operator: '<=', value: 20 }, { metric: 'impressions', operator: '>=', value: 50 }],
                previousMetricFilters: []
            },
            {
                id: 'g3', name: '长尾关键词', dimensions: ['query'], searchType: 'web', rowLimit: 200,
                orderBy: { metric: 'impressions', direction: 'descending' }, filters: [], deltaFilters: [],
                metricFilters: [{ metric: 'position', operator: '>', value: 20 }, { metric: 'impressions', operator: '>=', value: 10 }],
                previousMetricFilters: []
            }
        ]
    }
]

function readAnalysisPlans() {
    if (!fs.existsSync(analysisPlansPath)) {
        writeJsonFile(analysisPlansPath, DEFAULT_ANALYSIS_PLANS)
        return DEFAULT_ANALYSIS_PLANS
    }
    return JSON.parse(fs.readFileSync(analysisPlansPath, 'utf8'))
}

const FN_MAP = {
    listSites: gsc.listSites,
    queryPerformanceSimple: gsc.queryPerformanceSimple,
    queryPerformanceAdvanced: query.queryPerformanceAdvanced,
    ...compare
}

// --- Live reload ---
const SERVER_START_TOKEN = Date.now().toString(36)
const liveReloadClients = new Set()
try {
    fs.watch(publicDir, { recursive: true }, function (_, filename) {
        if (!filename || !/\.(js|css|html)$/.test(filename)) return
        for (const res of liveReloadClients) {
            try { res.write('event: reload\ndata: ' + filename + '\n\n') } catch (_) {}
        }
    })
} catch (e) {
    console.warn('Live reload watch failed:', e.message)
}

const CONTENT_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
}

function readJsonFile(filePath) {
    if (!fs.existsSync(filePath)) return []
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJsonFile(filePath, data) {
    fs.mkdirSync(dataDir, { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = []
        req.on('data', c => chunks.push(c))
        req.on('end', () => {
            if (!chunks.length) return resolve({})
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
            } catch (e) {
                reject(e)
            }
        })
        req.on('error', reject)
    })
}

function sendJson(res, status, data) {
    const body = JSON.stringify(data)
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(body)
}

function serveStatic(req, res, pathname) {
    const relPath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
    const filePath = path.resolve(publicDir, relPath)
    if (!filePath.startsWith(publicDir)) {
        res.writeHead(403)
        return res.end('Forbidden')
    }
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
            return res.end('Not found')
        }
        const ext = path.extname(filePath)
        res.writeHead(200, { 'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream' })
        res.end(content)
    })
}

const server = http.createServer(async (req, res) => {
    const { pathname } = new URL(req.url, `http://localhost:${PORT}`)

    try {
        if (req.method === 'POST' && pathname === '/api/call') {
            const { fn, params } = await readBody(req)
            const handler = FN_MAP[fn]
            if (!handler) return sendJson(res, 400, { error: `unknown fn: ${fn}` })
            const result = fn === 'listSites' ? await handler() : await handler(params || {})
            return sendJson(res, 200, { result })
        }

        if (req.method === 'GET' && pathname === '/api/presets') {
            return sendJson(res, 200, { presets: readJsonFile(presetsPath) })
        }

        if (req.method === 'POST' && pathname === '/api/presets') {
            const body = await readBody(req)
            const presets = readJsonFile(presetsPath)
            const preset = {
                id: Date.now().toString(36) + Math.random().toString(36).slice(2),
                name: body.name,
                fn: body.fn,
                params: body.params
            }
            presets.push(preset)
            writeJsonFile(presetsPath, presets)
            return sendJson(res, 200, { preset })
        }

        if (req.method === 'DELETE' && pathname.startsWith('/api/presets/')) {
            const id = pathname.slice('/api/presets/'.length)
            const presets = readJsonFile(presetsPath).filter(p => p.id !== id)
            writeJsonFile(presetsPath, presets)
            return sendJson(res, 200, { ok: true })
        }

        if (req.method === 'GET' && pathname === '/api/sites') {
            return sendJson(res, 200, { sites: readJsonFile(sitesPath) })
        }

        if (req.method === 'POST' && pathname === '/api/sites/refresh') {
            const freshSites = await gsc.listSites()
            const existing = readJsonFile(sitesPath)
            const existingMap = new Map(existing.map(s => [s.siteUrl, s]))
            const merged = freshSites.map(s => {
                const e = existingMap.get(s.siteUrl) || {}
                return { ...s, alias: e.alias || '', defaultDataState: e.defaultDataState || 'final' }
            })
            writeJsonFile(sitesPath, merged)
            return sendJson(res, 200, { sites: merged })
        }

        if (req.method === 'PUT' && pathname === '/api/sites/config') {
            const { siteUrl, ...patch } = await readBody(req)
            const sites = readJsonFile(sitesPath)
            const site = sites.find(s => s.siteUrl === siteUrl)
            if (site) {
                Object.assign(site, patch)
                writeJsonFile(sitesPath, sites)
            }
            return sendJson(res, 200, { ok: true })
        }

        if (req.method === 'GET' && pathname === '/api/analysis-plans') {
            return sendJson(res, 200, { plans: readAnalysisPlans() })
        }

        if (req.method === 'POST' && pathname === '/api/analysis-plans') {
            const plan = await readBody(req)
            const plans = readAnalysisPlans()
            plans.push(plan)
            writeJsonFile(analysisPlansPath, plans)
            return sendJson(res, 200, { plan })
        }

        if (req.method === 'PUT' && pathname.startsWith('/api/analysis-plans/')) {
            const id = pathname.slice('/api/analysis-plans/'.length)
            const plan = await readBody(req)
            const plans = readAnalysisPlans()
            const idx = plans.findIndex(p => p.id === id)
            if (idx >= 0) plans[idx] = plan
            writeJsonFile(analysisPlansPath, plans)
            return sendJson(res, 200, { ok: true })
        }

        if (req.method === 'DELETE' && pathname.startsWith('/api/analysis-plans/')) {
            const id = pathname.slice('/api/analysis-plans/'.length)
            const plans = readAnalysisPlans().filter(p => p.id !== id)
            writeJsonFile(analysisPlansPath, plans)
            return sendJson(res, 200, { ok: true })
        }

        if (req.method === 'GET' && pathname === '/api/livereload') {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            })
            res.write('event: init\ndata: ' + SERVER_START_TOKEN + '\n\n')
            liveReloadClients.add(res)
            req.on('close', function () { liveReloadClients.delete(res) })
            return
        }

        return serveStatic(req, res, pathname)
    } catch (e) {
        sendJson(res, 500, { error: e.message })
    }
})

server.listen(PORT, () => {
    console.log(`UI running at http://localhost:${PORT}`)
})
