'use strict'
const { authenticate } = require('./auth')
const { google } = require('googleapis')

const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']

let webmasters = null
async function getWebmasters() {
    if (!webmasters) {
        await authenticate(SCOPES)
        webmasters = google.webmasters({ version: 'v3' })
    }
    return webmasters
}

function applyMetricFilters(rows, metricFilters) {
    if (!metricFilters || !metricFilters.length) return rows
    return rows.filter(row => metricFilters.every(f => {
        const val = row[f.metric]
        switch (f.operator) {
            case '>': return val > f.value
            case '>=': return val >= f.value
            case '<': return val < f.value
            case '<=': return val <= f.value
            case '=': return val === f.value
            case '!=': return val !== f.value
            default: return true
        }
    }))
}

// 1. 查询所有站点基本信息
async function listSites() {
    const wm = await getWebmasters()
    const res = await wm.sites.list()
    return res.data.siteEntry || []
}

// 2. 简单查询站点表现情况
async function queryPerformanceSimple({ siteUrl, dataState = 'all', startDate, endDate, dimensions = [], rowLimit = 1000 }) {
    const wm = await getWebmasters()
    const res = await wm.searchanalytics.query({
        siteUrl,
        requestBody: { startDate, endDate, dimensions, rowLimit, dataState }
    })
    return res.data.rows || []
}

// 3. 复杂查询站点表现情况
async function queryPerformanceAdvanced({
    siteUrl,
    dataState = 'all',
    startDate,
    endDate,
    dimensions = [],
    searchType = 'web',
    rowLimit = 1000,
    startRow = 0,
    orderBy,
    filters = [],
    metricFilters = []
}) {
    const wm = await getWebmasters()
    const requestBody = { startDate, endDate, dimensions, searchType, rowLimit, startRow, dataState }
    if (filters.length) {
        requestBody.dimensionFilterGroups = [{ groupType: 'and', filters }]
    }
    const res = await wm.searchanalytics.query({ siteUrl, requestBody })
    let rows = res.data.rows || []
    rows = applyMetricFilters(rows, metricFilters)
    if (orderBy && orderBy.metric) {
        const dir = orderBy.direction === 'ascending' ? 1 : -1
        rows = rows.slice().sort((a, b) => (a[orderBy.metric] - b[orderBy.metric]) * dir)
    }
    return rows
}

module.exports = {
    listSites,
    queryPerformanceSimple,
    queryPerformanceAdvanced
}
