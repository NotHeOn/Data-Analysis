'use strict'
const { queryPerformanceSimple, queryPerformanceAdvanced } = require('../adapters/gsc')

function previousPeriod(startDate, endDate) {
    const start = new Date(startDate + 'T00:00:00Z')
    const end = new Date(endDate + 'T00:00:00Z')
    const days = Math.round((end - start) / 86400000) + 1
    const prevEnd = new Date(start)
    prevEnd.setUTCDate(prevEnd.getUTCDate() - 1)
    const prevStart = new Date(prevEnd)
    prevStart.setUTCDate(prevStart.getUTCDate() - (days - 1))
    const fmt = d => d.toISOString().slice(0, 10)
    return { startDate: fmt(prevStart), endDate: fmt(prevEnd) }
}

function diffRows(currentRows, previousRows) {
    const metrics = ['clicks', 'impressions', 'ctr', 'position']
    const prevMap = new Map(previousRows.map(r => [JSON.stringify(r.keys || []), r]))
    return currentRows.map(cur => {
        const prev = prevMap.get(JSON.stringify(cur.keys || [])) || {}
        const delta = {}
        for (const m of metrics) {
            delta[m] = (cur[m] || 0) - (prev[m] || 0)
        }
        return { keys: cur.keys, current: cur, previous: prev, delta }
    })
}

async function comparePeriodsSimple({ siteUrl, dataState = 'all', startDate, endDate, dimensions = [], rowLimit = 1000 }) {
    const previous = previousPeriod(startDate, endDate)
    const [currentRows, previousRows] = await Promise.all([
        queryPerformanceSimple({ siteUrl, dataState, startDate, endDate, dimensions, rowLimit }),
        queryPerformanceSimple({ siteUrl, dataState, startDate: previous.startDate, endDate: previous.endDate, dimensions, rowLimit })
    ])
    return {
        currentPeriod: { startDate, endDate },
        previousPeriod: previous,
        rows: diffRows(currentRows, previousRows)
    }
}

async function comparePeriodsAdvanced({
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
    metricFilters = [],
    previousNotExists = false,
    previousMetricFilters = []
}) {
    const previous = previousPeriod(startDate, endDate)
    const [currentRows, previousRows] = await Promise.all([
        queryPerformanceAdvanced({ siteUrl, dataState, startDate, endDate, dimensions, searchType, rowLimit, startRow, orderBy, filters, metricFilters }),
        queryPerformanceAdvanced({ siteUrl, dataState, startDate: previous.startDate, endDate: previous.endDate, dimensions, searchType, rowLimit, startRow, orderBy, filters, metricFilters: previousNotExists ? [] : previousMetricFilters })
    ])
    let rows = diffRows(currentRows, previousRows)
    if (previousNotExists) {
        rows = rows.filter(r => !(r.previous && r.previous.keys))
    } else if (previousMetricFilters.length) {
        rows = rows.filter(r => r.previous && r.previous.keys)
    }
    return {
        currentPeriod: { startDate, endDate },
        previousPeriod: previous,
        rows
    }
}

module.exports = { comparePeriodsSimple, comparePeriodsAdvanced }
