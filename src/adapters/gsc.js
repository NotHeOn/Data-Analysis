'use strict'
const { authenticate } = require('../auth')
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

async function listSites() {
    const wm = await getWebmasters()
    const res = await wm.sites.list()
    return res.data.siteEntry || []
}

async function queryPerformanceSimple({ siteUrl, dataState = 'all', startDate, endDate, dimensions = [], rowLimit = 1000 }) {
    const wm = await getWebmasters()
    const res = await wm.searchanalytics.query({
        siteUrl,
        requestBody: { startDate, endDate, dimensions, rowLimit, dataState }
    })
    return res.data.rows || []
}

// dimensionFilterGroups: raw GSC format (array of groups, OR between groups, AND within group).
// If provided, takes precedence over filters.
// filters: shorthand for a single AND group (the common case).
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
    dimensionFilterGroups
}) {
    const wm = await getWebmasters()
    const requestBody = { startDate, endDate, dimensions, searchType, rowLimit, startRow, dataState }

    if (dimensionFilterGroups) {
        if (dimensionFilterGroups.length) requestBody.dimensionFilterGroups = dimensionFilterGroups
    } else if (filters.length) {
        requestBody.dimensionFilterGroups = [{ groupType: 'and', filters }]
    }

    const res = await wm.searchanalytics.query({ siteUrl, requestBody })
    let rows = res.data.rows || []

    if (orderBy && orderBy.metric) {
        const dir = orderBy.direction === 'ascending' ? 1 : -1
        rows = rows.slice().sort((a, b) => (a[orderBy.metric] - b[orderBy.metric]) * dir)
    }
    return rows
}

module.exports = { listSites, queryPerformanceSimple, queryPerformanceAdvanced }
