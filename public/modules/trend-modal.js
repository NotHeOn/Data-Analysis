import { METRIC_OPTIONS, METRIC_LABELS } from './constants.js'
import { el } from './utils.js'
import { formatKey } from './country.js'
import { computePreviousPeriod } from './dates.js'

export async function fetchTrendData(rowKeys, dimensions, params) {
    const keyFilters = dimensions.reduce(function(acc, dim, i) {
        if (dim !== 'date') acc.push({ dimension: dim, operator: 'equals', expression: rowKeys[i] })
        return acc
    }, [])
    const allFilters = (params.filters || []).concat(keyFilters)
    const nonDateDims = dimensions.filter(function(d) { return d !== 'date' })
    const trendDims = ['date'].concat(nonDateDims)
    const prev = computePreviousPeriod(params.startDate, params.endDate)
    const base = {
        siteUrl: params.siteUrl, dataState: params.dataState || 'final',
        dimensions: trendDims, searchType: params.searchType || 'web',
        rowLimit: 500, filters: allFilters
    }
    const call = function(extra) {
        return fetch('/api/call', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fn: 'queryPerformanceAdvanced', params: Object.assign({}, base, extra) }) }).then(function(r) { return r.json() })
    }
    const [curData, prevData] = await Promise.all([
        call({ startDate: params.startDate, endDate: params.endDate }),
        call({ startDate: prev.startDate, endDate: prev.endDate })
    ])
    function fillRange(startDate, endDate, rows) {
        const map = new Map((rows || []).map(function(row) {
            return [row.keys[0], { date: row.keys[0], clicks: row.clicks || 0, impressions: row.impressions || 0, ctr: row.ctr, position: row.position }]
        }))
        const result = []
        const cur = new Date(startDate + 'T00:00:00Z')
        const end = new Date(endDate + 'T00:00:00Z')
        while (cur <= end) {
            const d = cur.toISOString().slice(0, 10)
            result.push(map.get(d) || { date: d, clicks: 0, impressions: 0, ctr: null, position: null })
            cur.setUTCDate(cur.getUTCDate() + 1)
        }
        return result
    }
    return {
        currentPoints: fillRange(params.startDate, params.endDate, curData.result),
        prevPoints: fillRange(prev.startDate, prev.endDate, prevData.result),
        currentPeriod: { startDate: params.startDate, endDate: params.endDate },
        previousPeriod: prev
    }
}

export async function openTrendModal(rowKeys, dimensions, params) {
    const overlay = document.createElement('div')
    overlay.className = 'trend-overlay'
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove() })
    function escHandler(e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler) } }
    document.addEventListener('keydown', escHandler)

    const modal = document.createElement('div')
    modal.className = 'trend-modal'

    const header = document.createElement('div')
    header.className = 'trend-modal-header'
    const titleEl = document.createElement('h3')
    titleEl.className = 'trend-modal-title'
    titleEl.textContent = rowKeys.map(function(k, i) { return formatKey(dimensions[i], k) }).join(' - ') + '  趋势'
    const closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.className = 'trend-modal-close'
    closeBtn.textContent = '×'
    closeBtn.addEventListener('click', function() { overlay.remove() })
    header.appendChild(titleEl)
    header.appendChild(closeBtn)
    modal.appendChild(header)

    const loadingEl = el('div', { className: 'trend-loading', text: '加载中...' })
    modal.appendChild(loadingEl)
    overlay.appendChild(modal)
    document.body.appendChild(overlay)

    try {
        const { currentPoints, prevPoints, currentPeriod, previousPeriod } = await fetchTrendData(rowKeys, dimensions, params)
        loadingEl.remove()

        const legend = document.createElement('div')
        legend.className = 'trend-legend'
        legend.innerHTML =
            '<span class="trend-leg trend-leg-cur"><span class="trend-leg-line"></span>本期 ' + currentPeriod.startDate + ' ~ ' + currentPeriod.endDate + '</span>' +
            '<span class="trend-leg trend-leg-prev"><span class="trend-leg-line"></span>上期 ' + previousPeriod.startDate + ' ~ ' + previousPeriod.endDate + '</span>'
        modal.appendChild(legend)

        const grid = document.createElement('div')
        grid.className = 'trend-charts-grid'
        METRIC_OPTIONS.forEach(function(metric) {
            const wrap = document.createElement('div')
            wrap.className = 'trend-chart-wrap'
            wrap.appendChild(el('div', { className: 'trend-chart-label', text: METRIC_LABELS[metric] }))
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            const cssW = 340, cssH = 170
            const canvas = document.createElement('canvas')
            canvas.width = cssW * dpr
            canvas.height = cssH * dpr
            canvas.style.width = cssW + 'px'
            canvas.style.height = cssH + 'px'
            wrap.appendChild(canvas)
            grid.appendChild(wrap)
            drawTrendChart(canvas, currentPoints, prevPoints, metric, dpr)
        })
        modal.appendChild(grid)
    } catch (e) {
        loadingEl.textContent = '加载失败: ' + e.message
    }
}

export function drawTrendChart(canvas, currentPoints, prevPoints, metric, dpr) {
    const ctx = canvas.getContext('2d')
    const W = canvas.width / dpr, H = canvas.height / dpr
    ctx.scale(dpr, dpr)
    const ml = 50, mr = 12, mt = 12, mb = 28
    const iW = W - ml - mr, iH = H - mt - mb

    const allVals = currentPoints.concat(prevPoints).map(function(p) { return p[metric] }).filter(function(v) { return v !== null })
    if (!allVals.length) {
        ctx.fillStyle = '#bbb'; ctx.font = '11px system-ui'; ctx.textAlign = 'center'
        ctx.fillText('无数据', W / 2, H / 2); return
    }
    let minV = metric === 'position' ? Math.min.apply(null, allVals) : 0
    let maxV = Math.max.apply(null, allVals)
    if (maxV === minV) maxV = minV + (minV === 0 ? 1 : minV * 0.1)

    const maxLen = Math.max(currentPoints.length, prevPoints.length, 1)
    const xS = function(i) { return ml + (i / (maxLen - 1 || 1)) * iW }
    const yS = function(v) { return mt + iH - ((v - minV) / (maxV - minV)) * iH }

    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H)

    const TICKS = 4
    for (let t = 0; t <= TICKS; t++) {
        const v = minV + (t / TICKS) * (maxV - minV)
        const y = yS(v)
        ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(ml, y); ctx.lineTo(ml + iW, y); ctx.stroke()
        let lbl
        if (metric === 'ctr') lbl = (v * 100).toFixed(1) + '%'
        else if (metric === 'position') lbl = v.toFixed(1)
        else lbl = v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v).toString()
        ctx.fillStyle = '#aaa'; ctx.font = '9px system-ui'; ctx.textAlign = 'right'
        ctx.fillText(lbl, ml - 4, y + 3)
    }

    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(ml, mt); ctx.lineTo(ml, mt + iH); ctx.lineTo(ml + iW, mt + iH); ctx.stroke()

    function drawLine(pts, color, dash) {
        if (!pts.length) return
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'
        ctx.setLineDash(dash ? [5, 4] : [])
        ctx.beginPath()
        let penDown = false
        pts.forEach(function(p, i) {
            if (p[metric] === null) { penDown = false; return }
            if (!penDown) { ctx.moveTo(xS(i), yS(p[metric])); penDown = true }
            else { ctx.lineTo(xS(i), yS(p[metric])) }
        })
        ctx.stroke(); ctx.setLineDash([])
    }
    drawLine(prevPoints, '#bbb', true)
    drawLine(currentPoints, '#0969da', false)

    const step = Math.max(1, Math.floor(maxLen / 5))
    ctx.fillStyle = '#bbb'; ctx.font = '9px system-ui'; ctx.textAlign = 'center'
    for (let i = 0; i < maxLen; i += step) {
        const x = xS(i)
        const dateStr = ((currentPoints[i] || prevPoints[i] || {}).date || '').slice(5)
        ctx.fillText(dateStr, x, mt + iH + 16)
        ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(x, mt + iH); ctx.lineTo(x, mt + iH + 3); ctx.stroke()
    }
}
