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
        const prev = prevMap.get(JSON.stringify(cur.keys || []))
        const delta = {}
        for (const m of metrics) delta[m] = (cur[m] || 0) - (prev ? (prev[m] || 0) : 0)
        return { keys: cur.keys, current: cur, previous: prev || null, delta }
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
// 3. Find current rows absent from previous batch → verify individually against previous period
// 4. Merge verified rows; rows still missing after verification are new (synthesized as zeros)
// 5. All rows now have a previous object; apply metricFilters and previousMetricFilters uniformly
//    (new words have previous = zeros, so previousMetricFilters: [clicks > 0] naturally excludes them)
function applyDeltaFilters(row, deltaFilters) {
    return deltaFilters.every(f => {
        const absDelta = row.delta ? row.delta[f.metric] : null
        if (absDelta == null) return false
        let val
        if (f.mode === 'relative') {
            const prevVal = row.previous ? (row.previous[f.metric] || 0) : 0
            if (prevVal === 0) return false
            val = absDelta / prevVal
        } else {
            val = absDelta
        }
        if (f.min != null && val < f.min) return false
        if (f.max != null && val > f.max) return false
        return true
    })
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
    previousMetricFilters = [],
    deltaFilters = []
}) {
    const previous = previousPeriod(startDate, endDate)

    const [currentRows, prevRows] = await Promise.all([
        queryPerformanceAdvanced({ siteUrl, dataState, startDate, endDate, dimensions, searchType, rowLimit, startRow, orderBy, filters }),
        queryPerformanceAdvanced({ siteUrl, dataState, startDate: previous.startDate, endDate: previous.endDate, dimensions, searchType, rowLimit, startRow, orderBy, filters })
    ])

    const prevKeySet = new Set(prevRows.map(r => JSON.stringify(r.keys || [])))
    const missingRows = currentRows.filter(r => !prevKeySet.has(JSON.stringify(r.keys || [])))

    const verifiedRows = await verifyMissingRows({
        siteUrl, dataState,
        startDate: previous.startDate, endDate: previous.endDate,
        dimensions, missingRows, userFilters: filters, searchType
    })

    const completePrevRows = [...prevRows, ...verifiedRows]

    // Track which keys are truly new (no previous data even after verification)
    const completePrevKeySet = new Set(completePrevRows.map(r => JSON.stringify(r.keys || [])))
    const newKeySet = new Set(
        missingRows
            .filter(r => !completePrevKeySet.has(JSON.stringify(r.keys || [])))
            .map(r => JSON.stringify(r.keys || []))
    )

    // Synthesize zero rows for new words so all rows have a uniform previous object
    const zeroRows = missingRows
        .filter(r => newKeySet.has(JSON.stringify(r.keys || [])))
        .map(r => ({ keys: r.keys, clicks: 0, impressions: 0, ctr: 0, position: 0 }))

    let rows = diffRows(currentRows, [...completePrevRows, ...zeroRows])

    // Mark new rows and apply uniform filters
    rows = rows.map(r => newKeySet.has(JSON.stringify(r.keys || [])) ? { ...r, isNew: true } : r)

    if (metricFilters.length) rows = rows.filter(r => applyMetricFilters([r.current], metricFilters).length > 0)
    if (previousMetricFilters.length) rows = rows.filter(r => applyMetricFilters([r.previous], previousMetricFilters).length > 0)
    if (deltaFilters.length) rows = rows.filter(r => applyDeltaFilters(r, deltaFilters))

    return { currentPeriod: { startDate, endDate }, previousPeriod: previous, rows }
}

module.exports = { comparePeriodsSimple, comparePeriodsAdvanced }
