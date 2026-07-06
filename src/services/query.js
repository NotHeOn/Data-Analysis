'use strict'
const gsc = require('../adapters/gsc')

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

// User-facing queryPerformanceAdvanced: raw GSC query + client-side metric filtering.
// metricFilters only applies to the rows already returned (bounded by rowLimit).
async function queryPerformanceAdvanced(params) {
    const rows = await gsc.queryPerformanceAdvanced(params)
    return applyMetricFilters(rows, params.metricFilters)
}

module.exports = { queryPerformanceAdvanced }
