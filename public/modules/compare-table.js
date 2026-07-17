import { DIMENSION_LABELS, METRIC_OPTIONS, METRIC_LABELS } from './constants.js'
import { formatKey } from './country.js'
import { el, formatMetricValue, formatDelta, deltaClass } from './utils.js'
import { state } from './state.js'
import { openTrendModal } from './trend-modal.js'

export function makeTableSortable(table) {
    const ths = Array.from(table.querySelectorAll('thead tr th'))
    let sortCol = -1, sortAsc = true
    ths.forEach(function(th, colIdx) {
        th.classList.add('sortable-th')
        const ind = document.createElement('span'); ind.className = 'sort-indicator'
        th.appendChild(ind)
        th.addEventListener('click', function() {
            if (sortCol === colIdx) { sortAsc = !sortAsc } else { sortCol = colIdx; sortAsc = true }
            ths.forEach(function(t, i) {
                t.querySelector('.sort-indicator').textContent = i === sortCol ? (sortAsc ? ' ↑' : ' ↓') : ''
                t.classList.toggle('sort-active', i === sortCol)
            })
            const tbody = table.querySelector('tbody')
            Array.from(tbody.querySelectorAll('tr')).sort(function(a, b) {
                const av = (a.children[colIdx] || {}).dataset.sort
                const bv = (b.children[colIdx] || {}).dataset.sort
                if (av === '' && bv === '') return 0
                if (av === '' || av == null) return 1
                if (bv === '' || bv == null) return -1
                const an = parseFloat(av), bn = parseFloat(bv)
                if (!isNaN(an) && !isNaN(bn)) return sortAsc ? an - bn : bn - an
                return sortAsc ? av.localeCompare(bv, 'zh') : bv.localeCompare(av, 'zh')
            }).forEach(function(tr) { tbody.appendChild(tr) })
        })
    })
}

export function makePageLink(url) {
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.className = 'page-link-btn'
    a.title = '在新标签页打开'
    a.innerHTML = '<svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 1.5H1.5v8h8V6.5"/><polyline points="6.5,1.5 9.5,1.5 9.5,4.5"/><line x1="5.5" y1="5.5" x2="9.5" y2="1.5"/></svg>'
    return a
}

export function makeTrendBtn(rowKeys, dimensions, trendParams) {
    const nonDateDims = dimensions.filter(function(d) { return d !== 'date' })
    if (!nonDateDims.length) return null
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'trend-btn'
    btn.title = '查看趋势'
    btn.innerHTML = '<svg width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="0.5,8.5 3,5.5 5.5,7 9,2.5 11.5,1"/><line x1="0.5" y1="9.5" x2="11.5" y2="9.5"/></svg>'
    btn.addEventListener('click', function(e) {
        e.stopPropagation()
        const p = trendParams || state.lastQueryParams
        if (!p || !p.startDate) { alert('请先执行一次查询'); return }
        openTrendModal(rowKeys, dimensions, p)
    })
    return btn
}

export function renderRowsTable(container, rows, dimensions) {
    if (!rows || !rows.length) { container.appendChild(el('div', { className: 'result-empty', text: '无数据' })); return }
    const table = document.createElement('table')
    table.className = 'result-table'
    const thead = document.createElement('thead')
    const headRow = document.createElement('tr')
    dimensions.forEach(function(d) { headRow.appendChild(el('th', { text: DIMENSION_LABELS[d] || d })) })
    METRIC_OPTIONS.forEach(function(m) { headRow.appendChild(el('th', { text: METRIC_LABELS[m] })) })
    thead.appendChild(headRow)
    table.appendChild(thead)
    const tbody = document.createElement('tbody')
    rows.forEach(function(row) {
        const tr = document.createElement('tr')
        ;(row.keys || []).forEach(function(k, i) {
            const td = document.createElement('td')
            td.dataset.sort = k != null ? String(k).toLowerCase() : ''
            td.appendChild(document.createTextNode(formatKey(dimensions[i], k)))
            if (dimensions[i] === 'page') td.appendChild(makePageLink(k))
            if (i === 0) { const tb = makeTrendBtn(row.keys, dimensions); if (tb) td.appendChild(tb) }
            tr.appendChild(td)
        })
        METRIC_OPTIONS.forEach(function(m) {
            const td = el('td', { text: formatMetricValue(m, row[m]) })
            td.dataset.sort = row[m] != null ? row[m] : ''
            tr.appendChild(td)
        })
        tbody.appendChild(tr)
    })
    table.appendChild(tbody)
    container.appendChild(table)
    makeTableSortable(table)
}

const PCT_CHANGE_METRICS = ['clicks', 'impressions', 'ctr', 'position']
const PCT_CHANGE_LABELS = { clicks: '点击变化%', impressions: '展现变化%', ctr: '点击率变化%', position: '排名变化%' }

function calcPctChange(current, previous) {
    if (current == null || previous == null) return null
    if (previous === 0) return current === 0 ? 0 : null
    return (current - previous) / Math.abs(previous)
}

function formatPctChange(value) {
    if (value == null) return '—'
    const pct = (value * 100).toFixed(2)
    if (value > 0) return '+' + pct + '%'
    if (value < 0) return pct + '%'
    return '0.00%'
}

function pctChangeClass(metric, value) {
    if (value == null || value === 0) return 'neutral'
    if (metric === 'position') return value < 0 ? 'positive' : 'negative'
    return value > 0 ? 'positive' : 'negative'
}

export function renderCompareTable(container, result, dimensions, trendParams) {
    container.appendChild(el('div', { className: 'result-meta',
        text: '当期: ' + result.currentPeriod.startDate + ' ~ ' + result.currentPeriod.endDate +
              '　上期: ' + result.previousPeriod.startDate + ' ~ ' + result.previousPeriod.endDate
    }))
    const rows = result.rows || []
    if (!rows.length) { container.appendChild(el('div', { className: 'result-empty', text: '无数据' })); return }
    const table = document.createElement('table')
    table.className = 'result-table'
    const thead = document.createElement('thead')
    const headRow = document.createElement('tr')
    dimensions.forEach(function(d) { headRow.appendChild(el('th', { text: DIMENSION_LABELS[d] || d })) })
    METRIC_OPTIONS.forEach(function(m) {
        headRow.appendChild(el('th', { text: METRIC_LABELS[m] }))
        if (PCT_CHANGE_METRICS.indexOf(m) >= 0) {
            headRow.appendChild(el('th', { text: PCT_CHANGE_LABELS[m] }))
        }
    })
    thead.appendChild(headRow)
    table.appendChild(thead)
    const tbody = document.createElement('tbody')
    rows.forEach(function(row) {
        const tr = document.createElement('tr')
        const isNew = !!row.isNew
        ;(row.keys || []).forEach(function(k, i) {
            const td = document.createElement('td')
            td.dataset.sort = k != null ? String(k).toLowerCase() : ''
            td.appendChild(document.createTextNode(formatKey(dimensions[i], k)))
            if (dimensions[i] === 'page') td.appendChild(makePageLink(k))
            if (i === 0 && isNew) td.appendChild(el('span', { className: 'new-row-badge', text: '新' }))
            if (i === 0) { const tb = makeTrendBtn(row.keys, dimensions, trendParams); if (tb) td.appendChild(tb) }
            tr.appendChild(td)
        })
        METRIC_OPTIONS.forEach(function(m) {
            const td = document.createElement('td')
            td.dataset.sort = (row.current && row.current[m] != null) ? row.current[m] : ''
            const cell = el('div', { className: 'metric-cell' })
            cell.appendChild(el('span', { className: 'metric-current', text: formatMetricValue(m, row.current[m]) }))
            if (isNew && m === 'position') {
                cell.appendChild(el('span', { className: 'metric-delta neutral', text: '—' }))
            } else {
                const deltaText = formatDelta(m, row.delta[m])
                if (deltaText) cell.appendChild(el('span', { className: 'metric-delta ' + deltaClass(m, row.delta[m]), text: deltaText }))
            }
            td.appendChild(cell)
            const prevDisplay = isNew && m === 'position' ? '—' : formatMetricValue(m, row.previous ? row.previous[m] : 0)
            td.appendChild(el('div', { className: 'metric-previous', text: '上期 ' + prevDisplay }))
            tr.appendChild(td)

            if (PCT_CHANGE_METRICS.indexOf(m) >= 0) {
                const pctTd = document.createElement('td')
                const curVal = row.current ? row.current[m] : null
                const prevVal = row.previous ? row.previous[m] : null
                const pctVal = isNew ? null : calcPctChange(curVal, prevVal)
                pctTd.dataset.sort = pctVal != null ? pctVal : ''
                const pctText = isNew ? '—' : formatPctChange(pctVal)
                const cls = isNew ? 'neutral' : pctChangeClass(m, pctVal)
                pctTd.appendChild(el('span', { className: 'metric-delta ' + cls, text: pctText }))
                tr.appendChild(pctTd)
            }
        })
        tbody.appendChild(tr)
    })
    table.appendChild(tbody)
    container.appendChild(table)
    makeTableSortable(table)
}

export function renderResult(fnKey, params, data) {
    const resultEl = document.getElementById('result')
    resultEl.textContent = ''
    if (data.error) { resultEl.textContent = '请求失败: ' + data.error; return }
    const result = data.result
    const dims = params.dimensions || []
    if (fnKey === 'queryPerformanceSimple' || fnKey === 'queryPerformanceAdvanced') {
        renderRowsTable(resultEl, result, dims)
    } else if (fnKey === 'comparePeriodsSimple' || fnKey === 'comparePeriodsAdvanced') {
        renderCompareTable(resultEl, result, dims)
    } else {
        resultEl.appendChild(el('pre', { text: JSON.stringify(data, null, 2) }))
    }
}
