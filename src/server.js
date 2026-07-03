'use strict'
const http = require('http')
const fs = require('fs')
const path = require('path')
const { URL } = require('url')
const tool = require('./tool')
const compare = require('./compare')

const PORT = 3300
const publicDir = path.join(__dirname, '../public')
const dataDir = path.join(__dirname, '../data')
const presetsPath = path.join(dataDir, 'presets.json')
const sitesPath = path.join(dataDir, 'sites.json')

const FN_MAP = { ...tool, ...compare }

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
            const sites = await tool.listSites()
            writeJsonFile(sitesPath, sites)
            return sendJson(res, 200, { sites })
        }

        return serveStatic(req, res, pathname)
    } catch (e) {
        sendJson(res, 500, { error: e.message })
    }
})

server.listen(PORT, () => {
    console.log(`UI running at http://localhost:${PORT}`)
})
