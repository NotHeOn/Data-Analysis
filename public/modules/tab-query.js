import { DIMENSION_LABELS, METRIC_LABELS, DELTA_FILTER_OPTIONS, DATE_SHORTCUTS, ROWLIMIT_PRESETS, STARTROW_PRESETS, METRIC_OPTIONS } from './constants.js'
import { state } from './state.js'
import { el, mkField, siteDisplayName, buildSelectWithCustom, readSelectWithCustom, buildDimensionsCheckboxes, readDimensions } from './utils.js'
import { COUNTRY_NAMES } from './country.js'
import { dateRangeFromShortcut, computePreviousPeriod } from './dates.js'
import { buildDimFiltersEditor } from './params/dim-filters.js'
import { buildMetricFiltersEditor } from './params/metric-filters.js'
import { buildDeltaFiltersEditor } from './params/delta-filters.js'
import { renderResult } from './compare-table.js'

let _dimFiltersEd = null
let _metricFiltersEd = null
let _prevMetricFiltersEd = null
let _deltaFiltersEd = null

export function buildSiteUrlSelect(prefillSiteUrl) {
    const container = document.createElement('span')
    if (!state.cachedSites.length) {
        const input = document.createElement('input')
        input.type = 'text'
        input.id = 'field-siteUrl-text'
        input.placeholder = 'https://example.com/'
        input.value = prefillSiteUrl || ''
        container.appendChild(input)
        return container
    }
    const select = document.createElement('select')
    select.id = 'field-siteUrl-select'
    state.cachedSites.filter(function(s) { return !s.blacklisted }).forEach(function(site) {
        const opt = document.createElement('option')
        opt.value = site.siteUrl
        opt.textContent = siteDisplayName(site)
        select.appendChild(opt)
    })
    const manualOpt = document.createElement('option')
    manualOpt.value = '__manual__'
    manualOpt.textContent = '其他（手动输入）'
    select.appendChild(manualOpt)
    const manualInput = document.createElement('input')
    manualInput.type = 'text'
    manualInput.id = 'field-siteUrl-manual'
    manualInput.placeholder = 'https://example.com/'
    manualInput.style.display = 'none'
    select.addEventListener('change', function() {
        manualInput.style.display = select.value === '__manual__' ? '' : 'none'
        if (select.value !== '__manual__') onSiteChange(select.value)
    })
    if (prefillSiteUrl && state.cachedSites.filter(function(s) { return !s.blacklisted }).some(function(s) { return s.siteUrl === prefillSiteUrl })) {
        select.value = prefillSiteUrl
    } else if (prefillSiteUrl) {
        select.value = '__manual__'
        manualInput.style.display = ''
        manualInput.value = prefillSiteUrl
    }
    container.appendChild(select)
    container.appendChild(manualInput)
    return container
}

export function readSiteUrl() {
    const select = document.getElementById('field-siteUrl-select')
    if (select) {
        if (select.value === '__manual__') {
            const manual = document.getElementById('field-siteUrl-manual')
            return manual ? manual.value : ''
        }
        return select.value
    }
    const text = document.getElementById('field-siteUrl-text')
    return text ? text.value : ''
}

export function onSiteChange(siteUrl) {
    const site = state.cachedSites.find(function(s) { return s.siteUrl === siteUrl })
    if (!site) return
    const dsEl = document.getElementById('field-dataState')
    if (dsEl && site.defaultDataState) dsEl.value = site.defaultDataState
    updateComparePreview()
}

function buildDateShortcuts() {
    const container = document.createElement('div')
    container.className = 'date-shortcuts'
    DATE_SHORTCUTS.forEach(function(sc) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'date-shortcut-btn'
        btn.textContent = sc.label
        btn.addEventListener('click', function() {
            const dsEl = document.getElementById('field-dataState')
            const range = dateRangeFromShortcut(sc.days, dsEl ? dsEl.value : 'all')
            document.getElementById('field-startDate').value = range.startDate
            document.getElementById('field-endDate').value = range.endDate
            state.lastDateShortcut = { label: sc.label, days: sc.days }
            updateComparePreview()
        })
        container.appendChild(btn)
    })
    return container
}

export function buildBasicParams(prefill) {
    const container = el('div', { id: 'basic-params' })
    container.appendChild(mkField('站点', buildSiteUrlSelect(prefill && prefill.siteUrl)))
    const dsSelect = document.createElement('select')
    dsSelect.id = 'field-dataState'
    ;['final', 'all'].forEach(function(v) {
        const opt = document.createElement('option')
        opt.value = v
        opt.textContent = v
        dsSelect.appendChild(opt)
    })
    if (prefill && prefill.dataState) {
        dsSelect.value = prefill.dataState
    } else {
        const first = state.cachedSites.length ? state.cachedSites[0] : null
        dsSelect.value = (first && first.defaultDataState) ? first.defaultDataState : 'final'
    }
    dsSelect.addEventListener('change', updateComparePreview)
    container.appendChild(mkField('数据状态', dsSelect))
    container.appendChild(mkField('快捷日期', buildDateShortcuts()))
    const startInput = document.createElement('input')
    startInput.id = 'field-startDate'
    startInput.type = 'date'
    startInput.value = (prefill && prefill.startDate) ? prefill.startDate : ''
    startInput.addEventListener('input', function() { state.lastDateShortcut = null; updateComparePreview() })
    container.appendChild(mkField('起始日期', startInput))
    const endInput = document.createElement('input')
    endInput.id = 'field-endDate'
    endInput.type = 'date'
    endInput.value = (prefill && prefill.endDate) ? prefill.endDate : ''
    endInput.addEventListener('input', function() { state.lastDateShortcut = null; updateComparePreview() })
    container.appendChild(mkField('结束日期', endInput))
    container.appendChild(mkField('维度', buildDimensionsCheckboxes(prefill && prefill.dimensions, updateComparePreview)))
    container.appendChild(mkField('最大行数', buildSelectWithCustom({
        idPrefix: 'rowLimit', options: ROWLIMIT_PRESETS,
        current: prefill && prefill.rowLimit, customType: 'number', customLabel: '自定义'
    })))
    return container
}

export function readBasicParams() {
    const params = {}
    params.siteUrl = readSiteUrl()
    const ds = document.getElementById('field-dataState')
    if (ds) params.dataState = ds.value
    const start = document.getElementById('field-startDate')
    if (start && start.value) params.startDate = start.value
    const end = document.getElementById('field-endDate')
    if (end && end.value) params.endDate = end.value
    params.dimensions = readDimensions()
    const rl = readSelectWithCustom('rowLimit')
    if (rl !== '') params.rowLimit = parseInt(rl, 10)
    return params
}

export function buildAdvancedParams(prefill) {
    const container = el('div', { id: 'advanced-params' })
    const stSelect = document.createElement('select')
    stSelect.id = 'field-searchType'
    ;['web', 'image', 'video', 'news', 'discover', 'googleNews'].forEach(function(v) {
        const opt = document.createElement('option')
        opt.value = v
        opt.textContent = v
        stSelect.appendChild(opt)
    })
    stSelect.value = (prefill && prefill.searchType) ? prefill.searchType : 'web'
    stSelect.addEventListener('change', updateComparePreview)
    container.appendChild(mkField('搜索类型', stSelect))
    const startRowCurrent = (prefill && prefill.startRow != null) ? prefill.startRow : 0
    container.appendChild(mkField('起始行', buildSelectWithCustom({
        idPrefix: 'startRow', options: STARTROW_PRESETS,
        current: startRowCurrent, customType: 'number', customLabel: '自定义'
    })))
    const obMetSel = document.createElement('select')
    obMetSel.id = 'field-orderByMetric'
    ;['', 'clicks', 'impressions', 'ctr', 'position'].forEach(function(v) {
        const opt = document.createElement('option')
        opt.value = v
        opt.textContent = v === '' ? '(不排序)' : (METRIC_LABELS[v] || v)
        obMetSel.appendChild(opt)
    })
    obMetSel.value = (prefill && prefill.orderBy) ? prefill.orderBy.metric : ''
    const obDirSel = document.createElement('select')
    obDirSel.id = 'field-orderByDirection'
    ;['descending', 'ascending'].forEach(function(v) {
        const opt = document.createElement('option')
        opt.value = v
        opt.textContent = v === 'descending' ? '降序' : '升序'
        obDirSel.appendChild(opt)
    })
    obDirSel.value = (prefill && prefill.orderBy) ? prefill.orderBy.direction : 'descending'
    const obWrap = document.createElement('span')
    obWrap.style.cssText = 'display:flex;gap:0.5rem;align-items:center;'
    obWrap.appendChild(obMetSel)
    obWrap.appendChild(obDirSel)
    container.appendChild(mkField('排序', obWrap))

    _dimFiltersEd = buildDimFiltersEditor(prefill && prefill.filters)
    container.appendChild(mkField('筛选器（维度）', _dimFiltersEd.el))

    _metricFiltersEd = buildMetricFiltersEditor(prefill && prefill.metricFilters)
    const metWrap = document.createElement('div')
    metWrap.appendChild(el('p', { className: 'field-hint', text: '按当期指标筛选，只对已返回的行生效（受最大行数限制）' }))
    metWrap.appendChild(_metricFiltersEd.el)
    container.appendChild(mkField('筛选器（指标-当期）', metWrap))

    _prevMetricFiltersEd = buildMetricFiltersEditor(prefill && prefill.previousMetricFilters)
    const prevMetWrap = document.createElement('div')
    prevMetWrap.appendChild(el('p', { className: 'field-hint', text: '按上期指标筛选，新词上期值视为 0（如 clicks > 0 可排除新词）' }))
    prevMetWrap.appendChild(_prevMetricFiltersEd.el)
    container.appendChild(mkField('筛选器（指标-上期）', prevMetWrap))

    _deltaFiltersEd = buildDeltaFiltersEditor(prefill && prefill.deltaFilters)
    container.appendChild(mkField('筛选器（变化量）', _deltaFiltersEd.el))

    return container
}

export function readAdvancedParams() {
    const params = {}
    const st = document.getElementById('field-searchType')
    if (st) params.searchType = st.value
    const sr = readSelectWithCustom('startRow')
    if (sr !== '') params.startRow = parseInt(sr, 10)
    const obMet = document.getElementById('field-orderByMetric')
    if (obMet && obMet.value) params.orderBy = {
        metric: obMet.value,
        direction: document.getElementById('field-orderByDirection').value
    }
    params.filters = _dimFiltersEd ? _dimFiltersEd.read() : []
    params.metricFilters = _metricFiltersEd ? _metricFiltersEd.read() : []
    params.previousMetricFilters = _prevMetricFiltersEd ? _prevMetricFiltersEd.read() : []
    params.deltaFilters = _deltaFiltersEd ? _deltaFiltersEd.read() : []
    return params
}

export function isAdvancedFilled() {
    const st = document.getElementById('field-searchType')
    if (st && st.value !== 'web') return true
    const sr = readSelectWithCustom('startRow')
    if (sr !== '' && sr !== '0') return true
    const obMet = document.getElementById('field-orderByMetric')
    if (obMet && obMet.value) return true
    if (_dimFiltersEd && _dimFiltersEd.read().length) return true
    if (_metricFiltersEd && _metricFiltersEd.read().length) return true
    if (_prevMetricFiltersEd && _prevMetricFiltersEd.read().length) return true
    if (_deltaFiltersEd && _deltaFiltersEd.read().length) return true
    return false
}

export function updateComparePreview() {
    const preview = document.getElementById('compare-preview')
    if (!preview || !state.compareMode) return
    const basic = readBasicParams()
    if (!basic.startDate || !basic.endDate) {
        preview.innerHTML = '<p class="field-hint">请先设置本期日期</p>'
        return
    }
    const prev = computePreviousPeriod(basic.startDate, basic.endDate)
    const site = state.cachedSites.find(function(s) { return s.siteUrl === basic.siteUrl })
    const adv = readAdvancedParams()
    preview.innerHTML = ''
    preview.appendChild(el('div', { className: 'preview-title', text: '查询预览' }))
    const rows = [
        ['站点', site ? siteDisplayName(site) : (basic.siteUrl || '—')],
        ['数据状态', basic.dataState || 'final'],
        ['本期', basic.startDate + ' ~ ' + basic.endDate],
        ['上期', prev.startDate + ' ~ ' + prev.endDate],
        ['维度', (basic.dimensions || []).map(function(d) { return DIMENSION_LABELS[d] || d }).join('、') || '（全部）'],
        ['最大行数', basic.rowLimit || 1000],
    ]
    if (adv.searchType && adv.searchType !== 'web') rows.push(['搜索类型', adv.searchType])
    if (adv.filters && adv.filters.length) {
        rows.push(['维度筛选', adv.filters.map(function(f, i) {
            const dimLabel = DIMENSION_LABELS[f.dimension] || f.dimension
            const expr = f.dimension === 'country' ? (COUNTRY_NAMES[f.expression] || f.expression) : f.expression
            const prefix = i === 0 ? '' : (f.joinOp === 'or' ? ' OR ' : ' AND ')
            return prefix + dimLabel + ' ' + f.operator + ' "' + expr + '"'
        }).join('')])
    }
    if (adv.metricFilters && adv.metricFilters.length) {
        rows.push(['当期筛选', adv.metricFilters.map(function(f) {
            return (METRIC_LABELS[f.metric] || f.metric) + ' ' + f.operator + ' ' + f.value
        }).join('; ')])
    }
    if (adv.previousMetricFilters && adv.previousMetricFilters.length) {
        rows.push(['上期筛选', adv.previousMetricFilters.map(function(f) {
            return (METRIC_LABELS[f.metric] || f.metric) + ' ' + f.operator + ' ' + f.value
        }).join('; ')])
    }
    if (adv.deltaFilters && adv.deltaFilters.length) {
        rows.push(['变化筛选', adv.deltaFilters.map(function(f) {
            const opt = DELTA_FILTER_OPTIONS.find(function(o) { return o.metric === f.metric && o.mode === f.mode })
            const label = opt ? opt.label : (METRIC_LABELS[f.metric] || f.metric)
            const valStr = f.mode === 'relative' ? (Math.round(f.value * 100 * 10) / 10) + '%' : String(f.value)
            return label + ' ' + f.operator + ' ' + valStr
        }).join('; ')])
    }
    rows.forEach(function(r) {
        const row = document.createElement('div')
        row.className = 'preview-row'
        row.appendChild(el('span', { className: 'preview-label', text: r[0] }))
        row.appendChild(el('span', { className: 'preview-value', text: String(r[1]) }))
        preview.appendChild(row)
    })
}

export function setQueryMode(mode) {
    state.compareMode = mode === 'compare'
    document.querySelectorAll('.query-mode-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.mode === mode)
    })
    const preview = document.getElementById('compare-preview')
    const layout = document.getElementById('params-layout')
    if (state.compareMode) {
        if (preview) preview.hidden = false
        if (layout) layout.classList.add('compare-mode')
        updateComparePreview()
    } else {
        if (preview) preview.hidden = true
        if (layout) layout.classList.remove('compare-mode')
    }
}

function determineFn() {
    if (state.compareMode) return isAdvancedFilled() ? 'comparePeriodsAdvanced' : 'comparePeriodsSimple'
    return isAdvancedFilled() ? 'queryPerformanceAdvanced' : 'queryPerformanceSimple'
}

export async function executeQuery() {
    const fn = determineFn()
    const params = Object.assign({}, readBasicParams(), readAdvancedParams())
    const btn = document.getElementById('query-btn')
    const resultEl = document.getElementById('result')
    btn.disabled = true
    resultEl.textContent = '请求中...'
    try {
        const res = await fetch('/api/call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fn: fn, params: params })
        })
        const data = await res.json()
        if (!data.error) state.lastQueryParams = params
        renderResult(fn, params, data)
    } catch (e) {
        resultEl.textContent = '请求失败: ' + e.message
    } finally {
        btn.disabled = false
    }
}

export async function loadPresets() {
    const res = await fetch('/api/presets')
    const data = await res.json()
    renderPresetsList(data.presets || [])
}

function renderPresetsList(presets) {
    const ul = document.getElementById('presets-list')
    if (!ul) return
    ul.innerHTML = ''
    if (!presets.length) {
        ul.appendChild(el('li', { className: 'result-empty', text: '暂无预设' }))
        return
    }
    presets.forEach(function(preset) {
        const li = document.createElement('li')
        const shortcutTag = preset.params && preset.params.dateShortcut
            ? ' [' + preset.params.dateShortcut.label + ']' : ''
        li.appendChild(el('span', { text: preset.name + ' (' + preset.fn + ')' + shortcutTag }))
        const applyBtn = document.createElement('button')
        applyBtn.type = 'button'
        applyBtn.textContent = '应用'
        applyBtn.addEventListener('click', function() { applyPreset(preset) })
        const deleteBtn = document.createElement('button')
        deleteBtn.type = 'button'
        deleteBtn.textContent = '删除'
        deleteBtn.addEventListener('click', async function() {
            await fetch('/api/presets/' + preset.id, { method: 'DELETE' })
            loadPresets()
        })
        li.appendChild(applyBtn)
        li.appendChild(deleteBtn)
        ul.appendChild(li)
    })
}

export async function savePreset() {
    const nameInput = document.getElementById('preset-name')
    const name = nameInput.value.trim()
    if (!name) { alert('请输入预设名字'); return }
    const fn = determineFn()
    const params = Object.assign({}, readBasicParams(), readAdvancedParams())
    if (state.lastDateShortcut) {
        params.dateShortcut = state.lastDateShortcut
        delete params.startDate
        delete params.endDate
    }
    await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, fn: fn, params: params })
    })
    nameInput.value = ''
    loadPresets()
}

function applyPreset(preset) {
    const params = Object.assign({}, preset.params)
    if (params.dateShortcut) {
        state.lastDateShortcut = params.dateShortcut
        const range = dateRangeFromShortcut(params.dateShortcut.days, params.dataState || 'all')
        params.startDate = range.startDate
        params.endDate = range.endDate
    } else {
        state.lastDateShortcut = null
    }
    const isCompare = preset.fn.indexOf('comparePeriods') === 0
    setQueryMode(isCompare ? 'compare' : 'simple')
    const hasAdv = (params.searchType && params.searchType !== 'web') ||
        params.orderBy ||
        (params.filters && params.filters.length) ||
        (params.metricFilters && params.metricFilters.length) ||
        (params.previousMetricFilters && params.previousMetricFilters.length)
    const advDetails = document.getElementById('advanced-details')
    if (advDetails && hasAdv) advDetails.open = true
    const basicEl = document.getElementById('basic-params')
    if (basicEl) basicEl.replaceWith(buildBasicParams(params))
    const advEl = document.getElementById('advanced-params')
    if (advEl) advEl.replaceWith(buildAdvancedParams(params))
    updateComparePreview()
}

export function renderQueryTab() {
    const container = document.getElementById('tab-query')
    container.innerHTML = ''
    const presetsSection = document.createElement('section')
    presetsSection.id = 'presets-section'
    presetsSection.appendChild(el('h3', { className: 'section-title', text: '预设' }))
    presetsSection.appendChild(el('ul', { id: 'presets-list' }))
    const saveRow = document.createElement('div')
    saveRow.className = 'actions'
    const presetNameInput = document.createElement('input')
    presetNameInput.type = 'text'
    presetNameInput.id = 'preset-name'
    presetNameInput.placeholder = '预设名称'
    const saveBtn = document.createElement('button')
    saveBtn.type = 'button'
    saveBtn.textContent = '保存当前为预设'
    saveBtn.addEventListener('click', savePreset)
    saveRow.appendChild(presetNameInput)
    saveRow.appendChild(saveBtn)
    presetsSection.appendChild(saveRow)
    container.appendChild(presetsSection)
    const paramsSection = document.createElement('section')
    paramsSection.id = 'params-section'
    const paramsLayout = el('div', { id: 'params-layout' })
    const paramsLeft = el('div', { id: 'params-left' })
    paramsLeft.appendChild(buildBasicParams(null))
    const advDetails = document.createElement('details')
    advDetails.id = 'advanced-details'
    const advSummary = document.createElement('summary')
    advSummary.textContent = '高级设置'
    advDetails.appendChild(advSummary)
    advDetails.appendChild(buildAdvancedParams(null))
    paramsLeft.appendChild(advDetails)
    paramsLayout.appendChild(paramsLeft)
    const comparePreview = el('div', { id: 'compare-preview' })
    comparePreview.hidden = true
    paramsLayout.appendChild(comparePreview)
    const queryModeTabs = document.createElement('nav')
    queryModeTabs.className = 'query-mode-tabs'
    ;[['compare', '对比查询'], ['simple', '普通查询']].forEach(function(pair) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'query-mode-btn'
        btn.dataset.mode = pair[0]
        btn.textContent = pair[1]
        btn.addEventListener('click', function() { setQueryMode(pair[0]) })
        queryModeTabs.appendChild(btn)
    })
    paramsSection.appendChild(queryModeTabs)
    paramsSection.appendChild(paramsLayout)
    const actionsRow = document.createElement('div')
    actionsRow.className = 'actions'
    const queryBtn = document.createElement('button')
    queryBtn.type = 'button'
    queryBtn.id = 'query-btn'
    queryBtn.className = 'btn-primary'
    queryBtn.textContent = '查询'
    queryBtn.addEventListener('click', executeQuery)
    actionsRow.appendChild(queryBtn)
    paramsSection.appendChild(actionsRow)
    container.appendChild(paramsSection)
    container.appendChild(el('div', { id: 'result' }))
    setQueryMode('compare')
}
