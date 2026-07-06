'use strict'

const DIMENSION_OPTIONS = ['query', 'page', 'country', 'device', 'date', 'searchAppearance']
const FILTER_OPERATORS = ['equals', 'notEquals', 'contains', 'notContains', 'includingRegex', 'excludingRegex']
const ROWLIMIT_PRESETS = [10, 25, 50, 100, 250, 500, 1000, 2000, 5000]
const STARTROW_PRESETS = [0, 25, 50, 100, 250, 500, 1000]
const METRIC_OPTIONS = ['clicks', 'impressions', 'ctr', 'position']
const METRIC_OPERATORS = ['>', '>=', '<', '<=', '=', '!=']
const DATE_SHORTCUTS = [
    { label: '近3天',  days: 3  },
    { label: '近7天',  days: 7  },
    { label: '近14天', days: 14 },
    { label: '近28天', days: 28 },
    { label: '近90天', days: 90 },
]

const DIMENSION_LABELS = {
    query: '搜索词', page: '页面', country: '国家', device: '设备', date: '日期', searchAppearance: '搜索样式'
}
const METRIC_LABELS = { clicks: '点击', impressions: '展现', ctr: '点击率', position: '排名' }

const FIELD_DEFS = {
    dataState: { label: '数据状态', type: 'select', options: ['all', 'final'], default: 'all' },
    startDate: { label: '起始日期', type: 'date' },
    endDate: { label: '结束日期', type: 'date' },
    searchType: { label: '搜索类型', type: 'select', options: ['web', 'image', 'video', 'news', 'discover', 'googleNews'], default: 'web' },
    orderByMetric: { label: '排序 metric', type: 'select', options: ['', 'clicks', 'impressions', 'ctr', 'position'], default: '' },
    orderByDirection: { label: '排序方向', type: 'select', options: ['descending', 'ascending'], default: 'descending' }
}

const FUNCTIONS = {
    listSites: { fields: [] },
    queryPerformanceSimple: { fields: ['siteUrl', 'dataState', 'startDate', 'endDate', 'dimensions', 'rowLimit'] },
    queryPerformanceAdvanced: { fields: ['siteUrl', 'dataState', 'startDate', 'endDate', 'dimensions', 'searchType', 'rowLimit', 'startRow', 'orderByMetric', 'orderByDirection', 'filters', 'metricFilters'] },
    comparePeriodsSimple: { fields: ['siteUrl', 'dataState', 'startDate', 'endDate', 'dimensions', 'rowLimit'] },
    comparePeriodsAdvanced: { fields: ['siteUrl', 'dataState', 'startDate', 'endDate', 'dimensions', 'searchType', 'rowLimit', 'startRow', 'orderByMetric', 'orderByDirection', 'filters', 'metricFilters', 'previousNotExists', 'previousMetricFilters'] }
}

let cachedSites = []
let lastDateShortcut = null

function paramsToFieldValue(key, params) {
    if (key === 'orderByMetric') return params.orderBy ? params.orderBy.metric : ''
    if (key === 'orderByDirection') return params.orderBy ? params.orderBy.direction : undefined
    return params[key] != null ? params[key] : undefined
}

function fieldValue(key, prefill, fallback) {
    if (!prefill) return fallback
    const v = paramsToFieldValue(key, prefill)
    return v === undefined ? fallback : v
}

function buildSiteUrlInput(prefillSiteUrl) {
    const container = document.createElement('span')

    if (cachedSites.length) {
        const select = document.createElement('select')
        select.id = 'field-siteUrl-select'
        for (const site of cachedSites) {
            const opt = document.createElement('option')
            opt.value = site.siteUrl
            opt.textContent = site.siteUrl + (site.permissionLevel ? ' (' + site.permissionLevel + ')' : '')
            select.appendChild(opt)
        }
        const manualOpt = document.createElement('option')
        manualOpt.value = '__manual__'
        manualOpt.textContent = '其他（手动输入）'
        select.appendChild(manualOpt)

        const manualInput = document.createElement('input')
        manualInput.type = 'text'
        manualInput.id = 'field-siteUrl-manual'
        manualInput.placeholder = 'https://example.com/'
        manualInput.style.display = 'none'

        select.addEventListener('change', () => {
            manualInput.style.display = select.value === '__manual__' ? '' : 'none'
        })

        const isKnownSite = prefillSiteUrl && cachedSites.some(s => s.siteUrl === prefillSiteUrl)
        if (isKnownSite) {
            select.value = prefillSiteUrl
        } else if (prefillSiteUrl) {
            select.value = '__manual__'
            manualInput.style.display = ''
            manualInput.value = prefillSiteUrl
        }

        container.appendChild(select)
        container.appendChild(manualInput)
    } else {
        const input = document.createElement('input')
        input.type = 'text'
        input.id = 'field-siteUrl-text'
        input.placeholder = 'https://example.com/'
        input.value = prefillSiteUrl || ''
        container.appendChild(input)
    }
    return container
}

function readSiteUrl() {
    if (cachedSites.length) {
        const select = document.getElementById('field-siteUrl-select')
        if (select.value === '__manual__') {
            return document.getElementById('field-siteUrl-manual').value
        }
        return select.value
    }
    return document.getElementById('field-siteUrl-text').value
}

function buildSelectWithCustom({ idPrefix, options, current, customType, customLabel }) {
    const container = document.createElement('span')

    const select = document.createElement('select')
    select.id = 'field-' + idPrefix + '-select'
    for (const opt of options) {
        const optionEl = document.createElement('option')
        optionEl.value = String(opt)
        optionEl.textContent = String(opt)
        select.appendChild(optionEl)
    }
    const customOpt = document.createElement('option')
    customOpt.value = '__custom__'
    customOpt.textContent = customLabel
    select.appendChild(customOpt)

    const customInput = document.createElement('input')
    customInput.type = customType
    customInput.id = 'field-' + idPrefix + '-custom'
    customInput.style.display = 'none'

    select.addEventListener('change', () => {
        customInput.style.display = select.value === '__custom__' ? '' : 'none'
    })

    const isPreset = current != null && current !== '' && options.map(String).includes(String(current))
    if (isPreset) {
        select.value = String(current)
    } else if (current != null && current !== '') {
        select.value = '__custom__'
        customInput.style.display = ''
        customInput.value = current
    } else {
        select.value = String(options[0])
    }

    container.appendChild(select)
    container.appendChild(customInput)

    return container
}

function readSelectWithCustom(idPrefix) {
    const select = document.getElementById('field-' + idPrefix + '-select')
    if (select.value === '__custom__') {
        return document.getElementById('field-' + idPrefix + '-custom').value
    }
    return select.value
}

function buildDimensionsCheckboxes(currentValues) {
    const container = document.createElement('span')
    container.className = 'checkbox-group'
    const selected = new Set(currentValues || [])
    for (const dim of DIMENSION_OPTIONS) {
        const label = document.createElement('label')
        label.className = 'checkbox-item'
        const input = document.createElement('input')
        input.type = 'checkbox'
        input.className = 'dimension-checkbox'
        input.value = dim
        input.checked = selected.has(dim)
        label.appendChild(input)
        label.appendChild(document.createTextNode(dim))
        container.appendChild(label)
    }
    return container
}

function readDimensions() {
    return Array.from(document.querySelectorAll('.dimension-checkbox:checked')).map(el => el.value)
}

function buildFiltersEditor(currentFilters) {
    const container = document.createElement('div')
    container.id = 'filters-editor'

    const rowsContainer = document.createElement('div')
    rowsContainer.id = 'filters-rows'
    container.appendChild(rowsContainer)

    function addRow(filter) {
        const row = document.createElement('div')
        row.className = 'filter-row'

        const dimSelect = document.createElement('select')
        dimSelect.className = 'filter-dimension'
        for (const dim of DIMENSION_OPTIONS) {
            const opt = document.createElement('option')
            opt.value = dim
            opt.textContent = dim
            dimSelect.appendChild(opt)
        }
        if (filter && filter.dimension) dimSelect.value = filter.dimension

        const opSelect = document.createElement('select')
        opSelect.className = 'filter-operator'
        for (const op of FILTER_OPERATORS) {
            const opt = document.createElement('option')
            opt.value = op
            opt.textContent = op
            opSelect.appendChild(opt)
        }
        if (filter && filter.operator) opSelect.value = filter.operator

        const exprInput = document.createElement('input')
        exprInput.type = 'text'
        exprInput.className = 'filter-expression'
        exprInput.placeholder = '筛选值，如 /blog/ 或 US'
        if (filter && filter.expression != null) exprInput.value = filter.expression

        const removeBtn = document.createElement('button')
        removeBtn.type = 'button'
        removeBtn.textContent = '删除'
        removeBtn.addEventListener('click', () => row.remove())

        row.appendChild(dimSelect)
        row.appendChild(opSelect)
        row.appendChild(exprInput)
        row.appendChild(removeBtn)
        rowsContainer.appendChild(row)
    }

    const addBtn = document.createElement('button')
    addBtn.type = 'button'
    addBtn.textContent = '+ 添加筛选条件'
    addBtn.addEventListener('click', () => addRow())
    container.appendChild(addBtn)

    for (const f of (currentFilters || [])) addRow(f)

    return container
}

function readFilters() {
    const rows = document.querySelectorAll('#filters-rows .filter-row')
    const filters = []
    rows.forEach(row => {
        const dimension = row.querySelector('.filter-dimension').value
        const operator = row.querySelector('.filter-operator').value
        const expression = row.querySelector('.filter-expression').value
        if (expression !== '') filters.push({ dimension, operator, expression })
    })
    return filters
}

function buildMetricFiltersEditor(idPrefix, currentMetricFilters, hintText) {
    const container = document.createElement('div')
    container.id = idPrefix + '-editor'

    const hint = document.createElement('div')
    hint.className = 'field-hint'
    hint.textContent = hintText
    container.appendChild(hint)

    const rowsContainer = document.createElement('div')
    rowsContainer.id = idPrefix + '-rows'
    container.appendChild(rowsContainer)

    function addRow(filter) {
        const row = document.createElement('div')
        row.className = 'filter-row'

        const metricSelect = document.createElement('select')
        metricSelect.className = 'metric-filter-metric'
        for (const m of METRIC_OPTIONS) {
            const opt = document.createElement('option')
            opt.value = m
            opt.textContent = m
            metricSelect.appendChild(opt)
        }
        if (filter && filter.metric) metricSelect.value = filter.metric

        const opSelect = document.createElement('select')
        opSelect.className = 'metric-filter-operator'
        for (const op of METRIC_OPERATORS) {
            const opt = document.createElement('option')
            opt.value = op
            opt.textContent = op
            opSelect.appendChild(opt)
        }
        if (filter && filter.operator) opSelect.value = filter.operator

        const valueInput = document.createElement('input')
        valueInput.type = 'number'
        valueInput.className = 'metric-filter-value filter-expression'
        valueInput.placeholder = '数值'
        if (filter && filter.value != null) valueInput.value = filter.value

        const removeBtn = document.createElement('button')
        removeBtn.type = 'button'
        removeBtn.textContent = '删除'
        removeBtn.addEventListener('click', () => row.remove())

        row.appendChild(metricSelect)
        row.appendChild(opSelect)
        row.appendChild(valueInput)
        row.appendChild(removeBtn)
        rowsContainer.appendChild(row)
    }

    const addBtn = document.createElement('button')
    addBtn.type = 'button'
    addBtn.textContent = '+ 添加指标筛选'
    addBtn.addEventListener('click', () => addRow())
    container.appendChild(addBtn)

    for (const f of (currentMetricFilters || [])) addRow(f)

    return container
}

function readMetricFilters(idPrefix) {
    const rows = document.querySelectorAll('#' + idPrefix + '-rows .filter-row')
    const metricFilters = []
    rows.forEach(row => {
        const metric = row.querySelector('.metric-filter-metric').value
        const operator = row.querySelector('.metric-filter-operator').value
        const raw = row.querySelector('.metric-filter-value').value
        if (raw !== '') metricFilters.push({ metric, operator, value: parseFloat(raw) })
    })
    return metricFilters
}

function dateRangeFromShortcut(days, dataState) {
    const lagDays = dataState === 'final' ? 3 : 1
    const end = new Date()
    end.setDate(end.getDate() - lagDays)
    const start = new Date(end)
    start.setDate(end.getDate() - (days - 1))
    const fmt = d => d.toISOString().slice(0, 10)
    return { startDate: fmt(start), endDate: fmt(end) }
}

function calcDateRange(days) {
    const dataStateEl = document.getElementById('field-dataState')
    return dateRangeFromShortcut(days, dataStateEl ? dataStateEl.value : 'all')
}

function buildDateShortcuts() {
    const container = document.createElement('div')
    container.className = 'date-shortcuts'
    for (const { label, days } of DATE_SHORTCUTS) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'date-shortcut-btn'
        btn.textContent = label
        btn.addEventListener('click', () => {
            const { startDate, endDate } = calcDateRange(days)
            document.getElementById('field-startDate').value = startDate
            document.getElementById('field-endDate').value = endDate
            lastDateShortcut = { label, days }
        })
        container.appendChild(btn)
    }
    return container
}

function renderForm(fnKey, prefill) {
    const form = document.getElementById('param-form')
    form.innerHTML = ''
    const fields = FUNCTIONS[fnKey].fields

    for (const key of fields) {
        const wrapper = document.createElement('label')
        wrapper.className = 'field'

        if (key === 'siteUrl') {
            const labelText = document.createElement('span')
            labelText.textContent = '站点 siteUrl'
            wrapper.appendChild(labelText)
            wrapper.appendChild(buildSiteUrlInput(prefill && prefill.siteUrl))
            form.appendChild(wrapper)
            continue
        }

        if (key === 'dimensions') {
            const labelText = document.createElement('span')
            labelText.textContent = '维度'
            wrapper.appendChild(labelText)
            wrapper.appendChild(buildDimensionsCheckboxes(prefill && prefill.dimensions))
            form.appendChild(wrapper)
            continue
        }

        if (key === 'filters') {
            const labelText = document.createElement('span')
            labelText.textContent = '筛选器（维度）'
            wrapper.appendChild(labelText)
            wrapper.appendChild(buildFiltersEditor(prefill && prefill.filters))
            form.appendChild(wrapper)
            continue
        }

        if (key === 'metricFilters') {
            const isCompare = fnKey.startsWith('comparePeriods')
            const labelText = document.createElement('span')
            labelText.textContent = isCompare ? '筛选器（指标 - 当期）' : '筛选器（指标）'
            wrapper.appendChild(labelText)
            const hint = isCompare
                ? '仅按当前周期（不含对比的上一周期）的原始数值筛选，且只对本次已返回的这一页结果生效（受最大返回行数限制）'
                : '仅对本次已返回的这一页结果生效（受最大返回行数限制），不是全量筛选'
            wrapper.appendChild(buildMetricFiltersEditor('metric-filters', prefill && prefill.metricFilters, hint))
            form.appendChild(wrapper)
            continue
        }

        if (key === 'previousNotExists') {
            const labelText = document.createElement('span')
            labelText.textContent = '仅显示新词（上期无数据）'
            wrapper.appendChild(labelText)
            const checkbox = document.createElement('input')
            checkbox.type = 'checkbox'
            checkbox.id = 'field-previousNotExists'
            checkbox.checked = !!(prefill && prefill.previousNotExists)
            wrapper.appendChild(checkbox)
            form.appendChild(wrapper)
            continue
        }

        if (key === 'previousMetricFilters') {
            const labelText = document.createElement('span')
            labelText.textContent = '筛选器（指标 - 上一期）'
            wrapper.appendChild(labelText)
            const hint = '仅对上期有数据的关键词生效（Group A）；真正的新词（上期无数据）不受此筛选影响，由当期指标筛选器单独决定是否保留'
            wrapper.appendChild(buildMetricFiltersEditor('previous-metric-filters', prefill && prefill.previousMetricFilters, hint))
            form.appendChild(wrapper)
            continue
        }

        if (key === 'rowLimit' || key === 'startRow') {
            const labelText = document.createElement('span')
            labelText.textContent = key === 'rowLimit' ? '最大返回行数' : '起始行 (startRow)'
            wrapper.appendChild(labelText)
            wrapper.appendChild(buildSelectWithCustom({
                idPrefix: key,
                options: key === 'rowLimit' ? ROWLIMIT_PRESETS : STARTROW_PRESETS,
                current: prefill && prefill[key],
                customType: 'number',
                customLabel: '自定义'
            }))
            form.appendChild(wrapper)
            continue
        }

        if (key === 'startDate' && fields.includes('endDate')) {
            const shortcutWrapper = document.createElement('div')
            shortcutWrapper.className = 'field'
            const shortcutLabel = document.createElement('span')
            shortcutLabel.textContent = '快捷日期'
            shortcutWrapper.appendChild(shortcutLabel)
            shortcutWrapper.appendChild(buildDateShortcuts())
            form.appendChild(shortcutWrapper)
        }

        const def = FIELD_DEFS[key]
        const labelText = document.createElement('span')
        labelText.textContent = def.label
        wrapper.appendChild(labelText)

        if (def.type === 'select') {
            const select = document.createElement('select')
            select.id = 'field-' + key
            for (const opt of def.options) {
                const optionEl = document.createElement('option')
                optionEl.value = opt
                optionEl.textContent = opt === '' ? '(不排序)' : opt
                select.appendChild(optionEl)
            }
            select.value = fieldValue(key, prefill, def.default)
            wrapper.appendChild(select)
        } else {
            const input = document.createElement('input')
            input.id = 'field-' + key
            input.type = def.type
            input.placeholder = def.placeholder || ''
            input.value = fieldValue(key, prefill, '')
            if (key === 'startDate' || key === 'endDate') {
                input.addEventListener('input', () => { lastDateShortcut = null })
            }
            wrapper.appendChild(input)
        }
        form.appendChild(wrapper)
    }
}

function collectParams(fnKey) {
    const fields = FUNCTIONS[fnKey].fields
    const params = {}

    for (const key of fields) {
        if (key === 'siteUrl') {
            params.siteUrl = readSiteUrl()
            continue
        }
        if (key === 'orderByMetric' || key === 'orderByDirection') continue

        if (key === 'dimensions') {
            params.dimensions = readDimensions()
            continue
        }
        if (key === 'filters') {
            params.filters = readFilters()
            continue
        }
        if (key === 'metricFilters') {
            params.metricFilters = readMetricFilters('metric-filters')
            continue
        }
        if (key === 'previousNotExists') {
            const cb = document.getElementById('field-previousNotExists')
            if (cb && cb.checked) params.previousNotExists = true
            continue
        }
        if (key === 'previousMetricFilters') {
            params.previousMetricFilters = readMetricFilters('previous-metric-filters')
            continue
        }
        if (key === 'rowLimit' || key === 'startRow') {
            const raw = readSelectWithCustom(key)
            if (raw !== '') params[key] = parseInt(raw, 10)
            continue
        }

        const raw = document.getElementById('field-' + key).value
        if (raw !== '') params[key] = raw
    }

    if (fields.includes('orderByMetric')) {
        const metric = document.getElementById('field-orderByMetric').value
        if (metric) {
            const direction = document.getElementById('field-orderByDirection').value
            params.orderBy = { metric, direction }
        }
    }

    return params
}

async function loadCachedSites() {
    const res = await fetch('/api/sites')
    const data = await res.json()
    cachedSites = data.sites || []
    updateSitesStatus()
}

function updateSitesStatus() {
    document.getElementById('sites-status').textContent =
        cachedSites.length ? `已缓存 ${cachedSites.length} 个站点` : '尚未获取过站点列表'
}

async function refreshSites() {
    const btn = document.getElementById('refresh-sites-btn')
    btn.disabled = true
    document.getElementById('sites-status').textContent = '刷新中...'
    try {
        const res = await fetch('/api/sites/refresh', { method: 'POST' })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        cachedSites = data.sites || []
        updateSitesStatus()
        renderForm(document.getElementById('fn-select').value)
    } catch (e) {
        document.getElementById('sites-status').textContent = '刷新失败: ' + e.message
    } finally {
        btn.disabled = false
    }
}

function el(tag, opts = {}) {
    const node = document.createElement(tag)
    if (opts.className) node.className = opts.className
    if (opts.text != null) node.textContent = opts.text
    return node
}

function formatMetricValue(metric, value) {
    if (value == null) return '—'
    if (metric === 'ctr') return (value * 100).toFixed(2) + '%'
    if (metric === 'position') return value.toFixed(1)
    return String(value)
}

function isImproved(metric, delta) {
    return metric === 'position' ? delta < 0 : delta > 0
}

function formatDelta(metric, delta) {
    if (delta == null) return ''
    if (delta === 0) {
        if (metric === 'ctr') return '0.00%'
        if (metric === 'position') return '0.0'
        return '0'
    }
    const arrow = isImproved(metric, delta) ? '↑' : '↓'
    const abs = Math.abs(delta)
    if (metric === 'ctr') return arrow + (abs * 100).toFixed(2) + '%'
    if (metric === 'position') return arrow + abs.toFixed(1)
    return arrow + abs
}

function deltaClass(metric, delta) {
    if (!delta) return 'neutral'
    return isImproved(metric, delta) ? 'positive' : 'negative'
}

function renderSitesTable(container, sites) {
    if (!sites || !sites.length) {
        container.appendChild(el('div', { className: 'result-empty', text: '无数据' }))
        return
    }
    const table = document.createElement('table')
    table.className = 'result-table'
    const thead = document.createElement('thead')
    const headRow = document.createElement('tr')
    ;['站点', '权限级别'].forEach(t => headRow.appendChild(el('th', { text: t })))
    thead.appendChild(headRow)
    table.appendChild(thead)
    const tbody = document.createElement('tbody')
    sites.forEach(s => {
        const row = document.createElement('tr')
        row.appendChild(el('td', { text: s.siteUrl }))
        row.appendChild(el('td', { text: s.permissionLevel }))
        tbody.appendChild(row)
    })
    table.appendChild(tbody)
    container.appendChild(table)
}

function renderRowsTable(container, rows, dimensions) {
    if (!rows || !rows.length) {
        container.appendChild(el('div', { className: 'result-empty', text: '无数据' }))
        return
    }
    const table = document.createElement('table')
    table.className = 'result-table'
    const thead = document.createElement('thead')
    const headRow = document.createElement('tr')
    dimensions.forEach(d => headRow.appendChild(el('th', { text: DIMENSION_LABELS[d] || d })))
    METRIC_OPTIONS.forEach(m => headRow.appendChild(el('th', { text: METRIC_LABELS[m] })))
    thead.appendChild(headRow)
    table.appendChild(thead)
    const tbody = document.createElement('tbody')
    rows.forEach(row => {
        const tr = document.createElement('tr')
        ;(row.keys || []).forEach(k => tr.appendChild(el('td', { text: k })))
        METRIC_OPTIONS.forEach(m => tr.appendChild(el('td', { text: formatMetricValue(m, row[m]) })))
        tbody.appendChild(tr)
    })
    table.appendChild(tbody)
    container.appendChild(table)
}

function renderCompareTable(container, result, dimensions) {
    const meta = el('div', {
        className: 'result-meta',
        text: `当期: ${result.currentPeriod.startDate} ~ ${result.currentPeriod.endDate}　对比上期: ${result.previousPeriod.startDate} ~ ${result.previousPeriod.endDate}`
    })
    container.appendChild(meta)

    const rows = result.rows || []
    if (!rows.length) {
        container.appendChild(el('div', { className: 'result-empty', text: '无数据' }))
        return
    }

    const table = document.createElement('table')
    table.className = 'result-table'
    const thead = document.createElement('thead')
    const headRow = document.createElement('tr')
    dimensions.forEach(d => headRow.appendChild(el('th', { text: DIMENSION_LABELS[d] || d })))
    METRIC_OPTIONS.forEach(m => headRow.appendChild(el('th', { text: METRIC_LABELS[m] })))
    thead.appendChild(headRow)
    table.appendChild(thead)

    const tbody = document.createElement('tbody')
    rows.forEach(row => {
        const tr = document.createElement('tr')
        const isNew = !(row.previous && row.previous.keys)
        ;(row.keys || []).forEach((k, i) => {
            const td = el('td', { text: k })
            if (i === 0 && isNew) td.appendChild(el('span', { className: 'new-row-badge', text: '新' }))
            tr.appendChild(td)
        })
        METRIC_OPTIONS.forEach(m => {
            const td = document.createElement('td')
            const cell = el('div', { className: 'metric-cell' })
            cell.appendChild(el('span', { className: 'metric-current', text: formatMetricValue(m, row.current[m]) }))
            if (!isNew) {
                const deltaText = formatDelta(m, row.delta[m])
                if (deltaText) cell.appendChild(el('span', { className: 'metric-delta ' + deltaClass(m, row.delta[m]), text: deltaText }))
            }
            td.appendChild(cell)
            if (!isNew) td.appendChild(el('div', { className: 'metric-previous', text: '上期 ' + formatMetricValue(m, row.previous[m]) }))
            tr.appendChild(td)
        })
        tbody.appendChild(tr)
    })
    table.appendChild(tbody)
    container.appendChild(table)
}

function renderResult(fnKey, params, data) {
    const resultEl = document.getElementById('result')
    resultEl.textContent = ''

    if (data.error) {
        resultEl.textContent = '请求失败: ' + data.error
        return
    }

    const result = data.result

    if (fnKey === 'listSites') {
        return renderSitesTable(resultEl, result)
    }
    if (fnKey === 'queryPerformanceSimple' || fnKey === 'queryPerformanceAdvanced') {
        return renderRowsTable(resultEl, result, params.dimensions || [])
    }
    if (fnKey === 'comparePeriodsSimple' || fnKey === 'comparePeriodsAdvanced') {
        return renderCompareTable(resultEl, result, params.dimensions || [])
    }

    resultEl.appendChild(el('pre', { text: JSON.stringify(data, null, 2) }))
}

async function callFunction() {
    const fnKey = document.getElementById('fn-select').value
    const params = collectParams(fnKey)

    const btn = document.getElementById('call-btn')
    const resultEl = document.getElementById('result')
    btn.disabled = true
    resultEl.textContent = '请求中...'
    try {
        const res = await fetch('/api/call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fn: fnKey, params })
        })
        const data = await res.json()
        renderResult(fnKey, params, data)
    } catch (e) {
        resultEl.textContent = '请求失败: ' + e.message
    } finally {
        btn.disabled = false
    }
}

function renderPresetsList(presets) {
    const ul = document.getElementById('presets-list')
    ul.innerHTML = ''
    for (const preset of presets) {
        const li = document.createElement('li')

        const label = document.createElement('span')
        const shortcutTag = preset.params.dateShortcut ? ` [${preset.params.dateShortcut.label}]` : ''
        label.textContent = `${preset.name} (${preset.fn})${shortcutTag}`

        const applyBtn = document.createElement('button')
        applyBtn.type = 'button'
        applyBtn.textContent = '应用'
        applyBtn.addEventListener('click', () => {
            document.getElementById('fn-select').value = preset.fn
            const params = Object.assign({}, preset.params)
            if (params.dateShortcut) {
                lastDateShortcut = params.dateShortcut
                const { startDate, endDate } = dateRangeFromShortcut(params.dateShortcut.days, params.dataState)
                params.startDate = startDate
                params.endDate = endDate
            }
            renderForm(preset.fn, params)
        })

        const deleteBtn = document.createElement('button')
        deleteBtn.type = 'button'
        deleteBtn.textContent = '删除'
        deleteBtn.addEventListener('click', async () => {
            await fetch('/api/presets/' + preset.id, { method: 'DELETE' })
            loadPresets()
        })

        li.appendChild(label)
        li.appendChild(applyBtn)
        li.appendChild(deleteBtn)
        ul.appendChild(li)
    }
}

async function loadPresets() {
    const res = await fetch('/api/presets')
    const data = await res.json()
    renderPresetsList(data.presets || [])
}

async function savePreset() {
    const fnKey = document.getElementById('fn-select').value
    const nameInput = document.getElementById('preset-name')
    const name = nameInput.value.trim()
    if (!name) {
        alert('请输入预设名字')
        return
    }
    const params = collectParams(fnKey)
    if (lastDateShortcut) {
        params.dateShortcut = lastDateShortcut
        delete params.startDate
        delete params.endDate
    }
    await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, fn: fnKey, params })
    })
    nameInput.value = ''
    loadPresets()
}

document.getElementById('refresh-sites-btn').addEventListener('click', refreshSites)
document.getElementById('fn-select').addEventListener('change', e => renderForm(e.target.value))
document.getElementById('call-btn').addEventListener('click', callFunction)
document.getElementById('save-preset-btn').addEventListener('click', savePreset)

renderForm('listSites')
loadCachedSites()
loadPresets()
