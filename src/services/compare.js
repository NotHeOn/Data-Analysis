'use strict'
const { queryPerformanceAdvanced } = require('../adapters/gsc')

function applyMetricFilters(rows, filters) {
    if (!filters || !filters.length) return rows
    return rows.filter(row => filters.every(f => {
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
        for (const m of metrics) delta[m] = (cur[m] || 0) - (prev[m] || 0)
        return { keys: cur.keys, current: cur, previous: prev, delta }
    })
}

// For rows in currentRows that weren't found in the previous-period batch,
// individually verify each one against the previous period.
// GSC does not support OR between dimensionFilterGroups, so one call per row.
// Capped at VERIFY_LIMIT to avoid excessive API usage.
const VERIFY_LIMIT = 100

async function verifyMissingRows({ siteUrl, dataState, startDate, endDate, dimensions, missingRows, userFilters, searchType }) {
    if (!missingRows.length || !dimensions.length) return []
    const toVerify = missingRows.slice(0, VERIFY_LIMIT)
    const results = await Promise.all(toVerify.map(row => {
        const filters = [
            ...row.keys.map((val, idx) => ({ dimension: dimensions[idx], operator: 'equals', expression: val })),
            ...userFilters
        ]
        return queryPerformanceAdvanced({
            siteUrl, dataState, startDate, endDate, dimensions,
            searchType, rowLimit: 1, startRow: 0, filters
        })
    }))
    return results.flat()
}

async function comparePeriodsSimple({ siteUrl, dataState = 'all', startDate, endDate, dimensions = [], rowLimit = 1000 }) {
    const previous = previousPeriod(startDate, endDate)
    const [currentRows, previousRows] = await Promise.all([
        queryPerformanceAdvanced({ siteUrl, dataState, startDate, endDate, dimensions, rowLimit }),
        queryPerformanceAdvanced({ siteUrl, dataState, startDate: previous.startDate, endDate: previous.endDate, dimensions, rowLimit })
    ])
    return {
        currentPeriod: { startDate, endDate },
        previousPeriod: previous,
        rows: diffRows(currentRows, previousRows)
    }
}

// Compare algorithm:
// 1. Query current period (rowLimit rows)
// 2. Query previous period (same rowLimit)
// 3. Find current rows absent from previous results
// 4. Verify those rows against the previous period (may have been cut off by rowLimit)
// 5. Merge verified rows into previous period data for a complete picture
// 6. Apply filters per group:
//    Group A (previous data exists)  → apply previousMetricFilters on previous values
//    Group B (truly new, no prev)    → skip previousMetricFilters; apply only metricFilters
//    metricFilters (current period)  → applied to ALL rows after group split
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

    // Steps 1 & 2
    const [currentRows, prevRows] = await Promise.all([
        queryPerformanceAdvanced({ siteUrl, dataState, startDate, endDate, dimensions, searchType, rowLimit, startRow, orderBy, filters }),
        queryPerformanceAdvanced({ siteUrl, dataState, startDate: previous.startDate, endDate: previous.endDate, dimensions, searchType, rowLimit, startRow, orderBy, filters })
    ])

    // Step 3
    const prevKeySet = new Set(prevRows.map(r => JSON.stringify(r.keys || [])))
    const missingRows = currentRows.filter(r => !prevKeySet.has(JSON.stringify(r.keys || [])))

    // Step 4
    const verifiedRows = await verifyMissingRows({
        siteUrl, dataState,
        startDate: previous.startDate, endDate: previous.endDate,
        dimensions, missingRows, userFilters: filters, searchType
    })

    // Step 5
    const completePrevRows = [...prevRows, ...verifiedRows]

    // Diff
    let rows = diffRows(currentRows, completePrevRows)

    // Step 6a: group-level filter
    rows = rows.filter(r => {
        const hasPrev = !!(r.previous && r.previous.keys)
        if (hasPrev) {
            if (previousNotExists) return false
            return applyMetricFilters([r.previous], previousMetricFilters).length > 0
        }
        // Group B (truly new): previousMetricFilters doesn't apply
        return true
    })

    // Step 6b: current-period metric filter applies to all remaining rows
    if (metricFilters.length) {
        rows = rows.filter(r => applyMetricFilters([r.current], metricFilters).length > 0)
    }

    return { currentPeriod: { startDate, endDate }, previousPeriod: previous, rows }
}

module.exports = { comparePeriodsSimple, comparePeriodsAdvanced }
