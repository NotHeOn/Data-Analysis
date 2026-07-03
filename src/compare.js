'use strict'
const { queryPerformanceSimple, queryPerformanceAdvanced } = require('./tool')

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

// 4. 简单周期对比查询
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

// 5. 复杂周期对比查询
// 维度筛选器 (filters) 用于圈定"比较哪些行"，两期共用；
// 指标筛选器分两组，各自只作用于对应那一期的原始数值：
//   - metricFilters：当期门槛（例如"这期 clicks 必须大于 X"）
//   - previousMetricFilters：上一期门槛（例如"上期 clicks 也必须大于 Y"，
//     用于要求"已有一定基础再叠加增长"，排除上期几乎为零、应继续观察养成的新词）
// 一旦指定了 previousMetricFilters，凡是在上一期查询里没有通过门槛（含压根不存在）的行，
// 会被整行剔除，而不是像默认情况那样以 previous:{} 的"新行"形式保留——
// 因为这种场景下"没上期数据"和"上期不达标"应该被同样对待：先不动它。
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
    previousMetricFilters = []
}) {
    const previous = previousPeriod(startDate, endDate)
    const [currentRows, previousRows] = await Promise.all([
        queryPerformanceAdvanced({ siteUrl, dataState, startDate, endDate, dimensions, searchType, rowLimit, startRow, orderBy, filters, metricFilters }),
        queryPerformanceAdvanced({ siteUrl, dataState, startDate: previous.startDate, endDate: previous.endDate, dimensions, searchType, rowLimit, startRow, orderBy, filters, metricFilters: previousMetricFilters })
    ])
    let rows = diffRows(currentRows, previousRows)
    if (previousMetricFilters.length) {
        rows = rows.filter(r => r.previous && r.previous.keys)
    }
    return {
        currentPeriod: { startDate, endDate },
        previousPeriod: previous,
        rows
    }
}

module.exports = {
    comparePeriodsSimple,
    comparePeriodsAdvanced
}
