'use strict'

// --- Constants ---
const DIMENSION_OPTIONS = ['query', 'page', 'country', 'device', 'date', 'searchAppearance']
const FILTER_OPERATORS = ['equals', 'notEquals', 'contains', 'notContains', 'includingRegex', 'excludingRegex']
const ROWLIMIT_PRESETS = [10, 25, 50, 100, 250, 500, 1000, 2000, 5000]
const STARTROW_PRESETS = [0, 25, 50, 100, 250, 500, 1000]
const METRIC_OPTIONS = ['clicks', 'impressions', 'ctr', 'position']
const METRIC_OPERATORS = ['>', '>=', '<', '<=', '=', '!=']
const DELTA_FILTER_OPTIONS = [
    { value: 'clicks_absolute',      label: '点击变化量',   metric: 'clicks',      mode: 'absolute' },
    { value: 'impressions_absolute', label: '展现变化量',   metric: 'impressions', mode: 'absolute' },
    { value: 'ctr_absolute',         label: '点击率变化量', metric: 'ctr',         mode: 'absolute' },
    { value: 'position_absolute',    label: '排名变化量',   metric: 'position',    mode: 'absolute' },
    { value: 'clicks_relative',      label: '点击变化率',   metric: 'clicks',      mode: 'relative' },
    { value: 'impressions_relative', label: '展现变化率',   metric: 'impressions', mode: 'relative' },
    { value: 'ctr_relative',         label: '点击率变化率', metric: 'ctr',         mode: 'relative' },
    { value: 'position_relative',    label: '排名变化率',   metric: 'position',    mode: 'relative' },
]
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
const COUNTRY_NAMES = {
    abw:'阿鲁巴',afg:'阿富汗',ago:'安哥拉',aia:'安圭拉',alb:'阿尔巴尼亚',and:'安道尔',are:'阿联酋',
    arg:'阿根廷',arm:'亚美尼亚',asm:'美属萨摩亚',atg:'安提瓜和巴布达',aus:'澳大利亚',aut:'奥地利',
    aze:'阿塞拜疆',bdi:'布隆迪',bel:'比利时',ben:'贝宁',bes:'荷兰加勒比区',bfa:'布基纳法索',
    bgd:'孟加拉国',bgr:'保加利亚',bhr:'巴林',bhs:'巴哈马',bih:'波黑',blr:'白俄罗斯',blz:'伯利兹',
    bmu:'百慕大',bol:'玻利维亚',bra:'巴西',brb:'巴巴多斯',brn:'文莱',btn:'不丹',bwa:'博茨瓦纳',
    caf:'中非',can:'加拿大',che:'瑞士',chl:'智利',chn:'中国',civ:'科特迪瓦',cmr:'喀麦隆',
    cod:'刚果（金）',cog:'刚果（布）',col:'哥伦比亚',com:'科摩罗',cpv:'佛得角',cri:'哥斯达黎加',
    cub:'古巴',cuw:'库拉索',cym:'开曼群岛',cyp:'塞浦路斯',cze:'捷克',deu:'德国',dji:'吉布提',
    dma:'多米尼克',dnk:'丹麦',dom:'多米尼加',dza:'阿尔及利亚',ecu:'厄瓜多尔',egy:'埃及',
    eri:'厄立特里亚',esp:'西班牙',est:'爱沙尼亚',eth:'埃塞俄比亚',fin:'芬兰',fji:'斐济',
    fra:'法国',fro:'法罗群岛',fsm:'密克罗尼西亚',gab:'加蓬',gbr:'英国',geo:'格鲁吉亚',
    gha:'加纳',gib:'直布罗陀',gin:'几内亚',glp:'瓜德罗普',gmb:'冈比亚',gnb:'几内亚比绍',
    gnq:'赤道几内亚',grc:'希腊',grd:'格林纳达',gtm:'危地马拉',gum:'关岛',guy:'圭亚那',
    hkg:'香港',hnd:'洪都拉斯',hrv:'克罗地亚',hti:'海地',hun:'匈牙利',idn:'印度尼西亚',
    ind:'印度',irl:'爱尔兰',irn:'伊朗',irq:'伊拉克',isl:'冰岛',isr:'以色列',ita:'意大利',
    jam:'牙买加',jor:'约旦',jpn:'日本',kaz:'哈萨克斯坦',ken:'肯尼亚',kgz:'吉尔吉斯斯坦',
    khm:'柬埔寨',kir:'基里巴斯',kna:'圣基茨和尼维斯',kor:'韩国',kwt:'科威特',lao:'老挝',
    lbn:'黎巴嫩',lbr:'利比里亚',lby:'利比亚',lca:'圣卢西亚',lie:'列支敦士登',lka:'斯里兰卡',
    lso:'莱索托',ltu:'立陶宛',lux:'卢森堡',lva:'拉脱维亚',mac:'澳门',mar:'摩洛哥',mco:'摩纳哥',
    mda:'摩尔多瓦',mdg:'马达加斯加',mdv:'马尔代夫',mex:'墨西哥',mhl:'马绍尔群岛',mkd:'北马其顿',
    mli:'马里',mlt:'马耳他',mmr:'缅甸',mne:'黑山',mng:'蒙古',mnp:'北马里亚纳群岛',moz:'莫桑比克',
    mrt:'毛里塔尼亚',msr:'蒙特塞拉特',mtq:'马提尼克',mus:'毛里求斯',mwi:'马拉维',mys:'马来西亚',
    myt:'马约特',nam:'纳米比亚',ner:'尼日尔',nga:'尼日利亚',nic:'尼加拉瓜',nld:'荷兰',
    nor:'挪威',npl:'尼泊尔',nru:'瑙鲁',nzl:'新西兰',omn:'阿曼',pak:'巴基斯坦',pan:'巴拿马',
    per:'秘鲁',phl:'菲律宾',plw:'帕劳',png:'巴布亚新几内亚',pol:'波兰',pri:'波多黎各',
    prk:'朝鲜',prt:'葡萄牙',pry:'巴拉圭',pse:'巴勒斯坦',pyf:'法属波利尼西亚',qat:'卡塔尔',
    reu:'留尼汪',rou:'罗马尼亚',rus:'俄罗斯',rwa:'卢旺达',sau:'沙特阿拉伯',sdn:'苏丹',
    sen:'塞内加尔',sgp:'新加坡',shn:'圣赫勒拿',slb:'所罗门群岛',sle:'塞拉利昂',slv:'萨尔瓦多',
    smr:'圣马力诺',som:'索马里',spm:'圣皮埃尔和密克隆',srb:'塞尔维亚',ssd:'南苏丹',stp:'圣多美和普林西比',
    sur:'苏里南',svk:'斯洛伐克',svn:'斯洛文尼亚',swe:'瑞典',swz:'斯威士兰',sxm:'荷属圣马丁',
    syc:'塞舌尔',syr:'叙利亚',tca:'特克斯和凯科斯群岛',tcd:'乍得',tgo:'多哥',tha:'泰国',
    tjk:'塔吉克斯坦',tkm:'土库曼斯坦',tls:'东帝汶',ton:'汤加',tto:'特立尼达和多巴哥',
    tun:'突尼斯',tur:'土耳其',tuv:'图瓦卢',twn:'台湾',tza:'坦桑尼亚',uga:'乌干达',
    ukr:'乌克兰',ury:'乌拉圭',usa:'美国',uzb:'乌兹别克斯坦',vct:'圣文森特和格林纳丁斯',
    ven:'委内瑞拉',vgb:'英属维尔京群岛',vir:'美属维尔京群岛',vnm:'越南',vut:'瓦努阿图',
    wsm:'萨摩亚',yem:'也门',zaf:'南非',zmb:'赞比亚',zwe:'津巴布韦',zzz:'未知地区',
}

// --- State ---
let cachedSites = []
let lastDateShortcut = null
let compareMode = false
let lastQueryParams = null

// --- DOM helpers ---

function el(tag, opts) {
    opts = opts || {}
    const node = document.createElement(tag)
    if (opts.className) node.className = opts.className
    if (opts.text != null) node.textContent = opts.text
    if (opts.id) node.id = opts.id
    return node
}

function mkField(labelText, content) {
    const wrapper = document.createElement('label')
    wrapper.className = 'field'
    const span = document.createElement('span')
    span.textContent = labelText
    wrapper.appendChild(span)
    wrapper.appendChild(content)
    return wrapper
}

function formatKey(dim, value) {
    if (dim === 'country' && value) return COUNTRY_NAMES[value.toLowerCase()] || value
    return value
}

function normalizeCountryExpression(value) {
    if (!value) return value
    const lower = value.toLowerCase()
    if (COUNTRY_NAMES[lower]) return lower
    const entry = Object.entries(COUNTRY_NAMES).find(function(e) { return e[1] === value })
    return entry ? entry[0] : value
}

function ensureCountryDatalist() {
    if (document.getElementById('country-datalist')) return
    const dl = document.createElement('datalist')
    dl.id = 'country-datalist'
    Object.keys(COUNTRY_NAMES).forEach(function(code) {
        const opt = document.createElement('option')
        opt.value = code
        opt.textContent = COUNTRY_NAMES[code]
        dl.appendChild(opt)
    })
    document.body.appendChild(dl)
}

// --- Date helpers ---

function dateRangeFromShortcut(days, dataState) {
    const lagDays = dataState === 'final' ? 3 : 1
    const end = new Date()
    end.setDate(end.getDate() - lagDays)
    const start = new Date(end)
    start.setDate(end.getDate() - (days - 1))
    const fmt = function(d) { return d.toISOString().slice(0, 10) }
    return { startDate: fmt(start), endDate: fmt(end) }
}

function computePreviousPeriod(startDate, endDate) {
    const start = new Date(startDate + 'T00:00:00Z')
    const end = new Date(endDate + 'T00:00:00Z')
    const days = Math.round((end - start) / 86400000) + 1
    const prevEnd = new Date(start)
    prevEnd.setUTCDate(prevEnd.getUTCDate() - 1)
    const prevStart = new Date(prevEnd)
    prevStart.setUTCDate(prevStart.getUTCDate() - (days - 1))
    const fmt = function(d) { return d.toISOString().slice(0, 10) }
    return { startDate: fmt(prevStart), endDate: fmt(prevEnd) }
}

// --- Shared control builders ---

function buildSelectWithCustom(o) {
    const container = document.createElement('span')
    const select = document.createElement('select')
    select.id = 'field-' + o.idPrefix + '-select'
    for (let i = 0; i < o.options.length; i++) {
        const optEl = document.createElement('option')
        optEl.value = String(o.options[i])
        optEl.textContent = String(o.options[i])
        select.appendChild(optEl)
    }
    const customOpt = document.createElement('option')
    customOpt.value = '__custom__'
    customOpt.textContent = o.customLabel
    select.appendChild(customOpt)
    const customInput = document.createElement('input')
    customInput.type = o.customType
    customInput.id = 'field-' + o.idPrefix + '-custom'
    customInput.style.display = 'none'
    select.addEventListener('change', function() {
        customInput.style.display = select.value === '__custom__' ? '' : 'none'
    })
    const c = o.current
    const isPreset = c != null && c !== '' && o.options.map(String).indexOf(String(c)) >= 0
    if (isPreset) { select.value = String(c) }
    else if (c != null && c !== '') { select.value = '__custom__'; customInput.style.display = ''; customInput.value = c }
    else { select.value = String(o.options[0]) }
    container.appendChild(select)
    container.appendChild(customInput)
    return container
}

function readSelectWithCustom(idPrefix) {
    const select = document.getElementById('field-' + idPrefix + '-select')
    if (!select) return ''
    if (select.value === '__custom__') {
        const c = document.getElementById('field-' + idPrefix + '-custom')
        return c ? c.value : ''
    }
    return select.value
}

function buildDimensionsCheckboxes(currentValues) {
    const container = document.createElement('span')
    container.className = 'checkbox-group'
    const selected = new Set(currentValues || [])
    DIMENSION_OPTIONS.forEach(function(dim) {
        const label = document.createElement('label')
        label.className = 'checkbox-item'
        const input = document.createElement('input')
        input.type = 'checkbox'
        input.className = 'dimension-checkbox'
        input.value = dim
        input.checked = selected.has(dim)
        input.addEventListener('change', updateComparePreview)
        label.appendChild(input)
        label.appendChild(document.createTextNode(DIMENSION_LABELS[dim] || dim))
        container.appendChild(label)
    })
    return container
}

function readDimensions() {
    return Array.from(document.querySelectorAll('.dimension-checkbox:checked')).map(function(e) { return e.value })
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
        const dimSel = document.createElement('select')
        dimSel.className = 'filter-dimension'
        DIMENSION_OPTIONS.forEach(function(dim) {
            const opt = document.createElement('option')
            opt.value = dim
            opt.textContent = DIMENSION_LABELS[dim] || dim
            dimSel.appendChild(opt)
        })
        if (filter && filter.dimension) dimSel.value = filter.dimension
        const opSel = document.createElement('select')
        opSel.className = 'filter-operator'
        FILTER_OPERATORS.forEach(function(op) {
            const opt = document.createElement('option')
            opt.value = op
            opt.textContent = op
            opSel.appendChild(opt)
        })
        if (filter && filter.operator) opSel.value = filter.operator
        const exprInput = document.createElement('input')
        exprInput.type = 'text'
        exprInput.className = 'filter-expression'
        if (filter && filter.expression != null) exprInput.value = filter.expression
        function applyDimMode(dim) {
            if (dim === 'country') {
                ensureCountryDatalist()
                exprInput.setAttribute('list', 'country-datalist')
                exprInput.placeholder = '输入国家名或代码'
            } else {
                exprInput.removeAttribute('list')
                exprInput.placeholder = '筛选值'
            }
        }
        applyDimMode(dimSel.value)
        dimSel.addEventListener('change', function() { applyDimMode(dimSel.value); exprInput.value = ''; updateComparePreview() })
        opSel.addEventListener('change', updateComparePreview)
        exprInput.addEventListener('input', updateComparePreview)
        const rmBtn = document.createElement('button')
        rmBtn.type = 'button'
        rmBtn.textContent = '删除'
        rmBtn.addEventListener('click', function() { row.remove(); updateComparePreview() })
        row.appendChild(dimSel)
        row.appendChild(opSel)
        row.appendChild(exprInput)
        row.appendChild(rmBtn)
        rowsContainer.appendChild(row)
    }
    const addBtn = document.createElement('button')
    addBtn.type = 'button'
    addBtn.textContent = '+ 添加筛选条件'
    addBtn.addEventListener('click', function() { addRow() })
    container.appendChild(addBtn)
    ;(currentFilters || []).forEach(function(f) { addRow(f) })
    return container
}

function readFilters() {
    const rows = document.querySelectorAll('#filters-rows .filter-row')
    const filters = []
    rows.forEach(function(row) {
        const dimEl = row.querySelector('.filter-dimension')
        const dim = dimEl ? dimEl.value : ''
        let expression = row.querySelector('.filter-expression').value.trim()
        if (expression !== '') {
            if (dim === 'country') expression = normalizeCountryExpression(expression)
            filters.push({ dimension: dim, operator: row.querySelector('.filter-operator').value, expression: expression })
        }
    })
    return filters
}

function buildMetricFiltersEditor(idPrefix, currentFilters, hintText) {
    const container = document.createElement('div')
    container.id = idPrefix + '-editor'
    if (hintText) container.appendChild(el('div', { className: 'field-hint', text: hintText }))
    const rowsContainer = document.createElement('div')
    rowsContainer.id = idPrefix + '-rows'
    container.appendChild(rowsContainer)
    function addRow(filter) {
        const row = document.createElement('div')
        row.className = 'filter-row'
        const metSel = document.createElement('select')
        metSel.className = 'metric-filter-metric'
        METRIC_OPTIONS.forEach(function(m) {
            const opt = document.createElement('option')
            opt.value = m
            opt.textContent = METRIC_LABELS[m] || m
            metSel.appendChild(opt)
        })
        if (filter && filter.metric) metSel.value = filter.metric
        const opSel = document.createElement('select')
        opSel.className = 'metric-filter-operator'
        METRIC_OPERATORS.forEach(function(op) {
            const opt = document.createElement('option')
            opt.value = op
            opt.textContent = op
            opSel.appendChild(opt)
        })
        if (filter && filter.operator) opSel.value = filter.operator
        const valInput = document.createElement('input')
        valInput.type = 'number'
        valInput.className = 'metric-filter-value filter-expression'
        valInput.placeholder = '数值'
        if (filter && filter.value != null) valInput.value = filter.value
        metSel.addEventListener('change', updateComparePreview)
        opSel.addEventListener('change', updateComparePreview)
        valInput.addEventListener('input', updateComparePreview)
        const rmBtn = document.createElement('button')
        rmBtn.type = 'button'
        rmBtn.textContent = '删除'
        rmBtn.addEventListener('click', function() { row.remove(); updateComparePreview() })
        row.appendChild(metSel)
        row.appendChild(opSel)
        row.appendChild(valInput)
        row.appendChild(rmBtn)
        rowsContainer.appendChild(row)
    }
    const addBtn = document.createElement('button')
    addBtn.type = 'button'
    addBtn.textContent = '+ 添加指标筛选'
    addBtn.addEventListener('click', function() { addRow() })
    container.appendChild(addBtn)
    ;(currentFilters || []).forEach(function(f) { addRow(f) })
    return container
}

function readMetricFilters(idPrefix) {
    const rows = document.querySelectorAll('#' + idPrefix + '-rows .filter-row')
    const filters = []
    rows.forEach(function(row) {
        const raw = row.querySelector('.metric-filter-value').value
        if (raw !== '') filters.push({
            metric: row.querySelector('.metric-filter-metric').value,
            operator: row.querySelector('.metric-filter-operator').value,
            value: parseFloat(raw)
        })
    })
    return filters
}

function buildDeltaFiltersEditor(currentFilters) {
    const container = document.createElement('div')
    container.id = 'delta-filters-editor'
    container.appendChild(el('div', { className: 'field-hint', text: '变化量=绝对数值差；变化率填整数百分比（-20 表示 -20%）；正值=增加/排名下滑，负值=减少/排名提升；仅对比查询生效' }))
    const rowsContainer = document.createElement('div')
    rowsContainer.id = 'delta-filters-rows'
    container.appendChild(rowsContainer)
    function addRow(filter) {
        const row = document.createElement('div')
        row.className = 'filter-row'
        const comboSel = document.createElement('select')
        comboSel.className = 'delta-filter-combo'
        DELTA_FILTER_OPTIONS.forEach(function(o) {
            const opt = document.createElement('option')
            opt.value = o.value; opt.textContent = o.label
            comboSel.appendChild(opt)
        })
        if (filter && filter.metric && filter.mode) {
            const match = DELTA_FILTER_OPTIONS.find(function(o) { return o.metric === filter.metric && o.mode === filter.mode })
            if (match) comboSel.value = match.value
        }
        const opSel = document.createElement('select')
        opSel.className = 'delta-filter-operator'
        METRIC_OPERATORS.forEach(function(op) {
            const opt = document.createElement('option')
            opt.value = op; opt.textContent = op
            opSel.appendChild(opt)
        })
        if (filter && filter.operator) opSel.value = filter.operator
        const valInput = document.createElement('input')
        valInput.type = 'number'; valInput.className = 'delta-filter-value filter-expression'
        valInput.placeholder = '数值'
        const unitSpan = document.createElement('span')
        unitSpan.className = 'delta-filter-unit'
        function syncUnit() {
            const sel = DELTA_FILTER_OPTIONS.find(function(o) { return o.value === comboSel.value })
            unitSpan.textContent = (sel && sel.mode === 'relative') ? '%' : ''
        }
        syncUnit()
        if (filter && filter.value != null) {
            const sel = DELTA_FILTER_OPTIONS.find(function(o) { return o.metric === filter.metric && o.mode === filter.mode })
            valInput.value = (sel && sel.mode === 'relative') ? Math.round(filter.value * 100 * 10) / 10 : filter.value
        }
        comboSel.addEventListener('change', function() { syncUnit(); updateComparePreview() })
        opSel.addEventListener('change', updateComparePreview)
        valInput.addEventListener('input', updateComparePreview)
        const rmBtn = document.createElement('button')
        rmBtn.type = 'button'; rmBtn.textContent = '删除'
        rmBtn.addEventListener('click', function() { row.remove(); updateComparePreview() })
        row.appendChild(comboSel); row.appendChild(opSel)
        row.appendChild(valInput); row.appendChild(unitSpan); row.appendChild(rmBtn)
        rowsContainer.appendChild(row)
    }
    const addBtn = document.createElement('button')
    addBtn.type = 'button'; addBtn.textContent = '+ 添加变化筛选'
    addBtn.addEventListener('click', function() { addRow() })
    container.appendChild(addBtn)
    ;(currentFilters || []).forEach(function(f) { addRow(f) })
    return container
}

function readDeltaFilters() {
    const rows = document.querySelectorAll('#delta-filters-rows .filter-row')
    const filters = []
    rows.forEach(function(row) {
        const raw = row.querySelector('.delta-filter-value').value
        if (raw === '') return
        const combo = row.querySelector('.delta-filter-combo').value
        const opt = DELTA_FILTER_OPTIONS.find(function(o) { return o.value === combo })
        if (!opt) return
        const scale = opt.mode === 'relative' ? 0.01 : 1
        filters.push({
            metric: opt.metric,
            mode: opt.mode,
            operator: row.querySelector('.delta-filter-operator').value,
            value: parseFloat(raw) * scale
        })
    })
    return filters
}

// --- Formatting ---

function formatMetricValue(metric, value) {
    if (value == null) return '—'
    if (metric === 'ctr') return (value * 100).toFixed(2) + '%'
    if (metric === 'position') return value.toFixed(1)
    return String(value)
}

function isImproved(metric, delta) { return metric === 'position' ? delta < 0 : delta > 0 }

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

function siteDisplayName(site) {
    return site.alias ? (site.alias + '（' + site.siteUrl + '）') : site.siteUrl
}

// ============================================================
// Tab 1: Site management
// ============================================================

async function loadCachedSites() {
    const res = await fetch('/api/sites')
    const data = await res.json()
    cachedSites = data.sites || []
}

async function refreshSites() {
    const btn = document.getElementById('refresh-sites-btn')
    const status = document.getElementById('sites-status')
    btn.disabled = true
    status.textContent = '刷新中...'
    try {
        const res = await fetch('/api/sites/refresh', { method: 'POST' })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        cachedSites = data.sites || []
        status.textContent = '已缓存 ' + cachedSites.length + ' 个站点'
        renderSitesConfigTable()
        const basicEl = document.getElementById('basic-params')
        if (basicEl) {
            const prefill = readBasicParams()
            basicEl.replaceWith(buildBasicParams(prefill))
        }
    } catch (e) {
        status.textContent = '刷新失败: ' + e.message
    } finally {
        btn.disabled = false
    }
}

async function saveSiteConfig(siteUrl, patch) {
    await fetch('/api/sites/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ siteUrl: siteUrl }, patch))
    })
    const site = cachedSites.find(function(s) { return s.siteUrl === siteUrl })
    if (site) Object.assign(site, patch)
    const selectEl = document.getElementById('field-siteUrl-select')
    if (selectEl) {
        for (let i = 0; i < selectEl.options.length; i++) {
            const s = cachedSites.find(function(cs) { return cs.siteUrl === selectEl.options[i].value })
            if (s) selectEl.options[i].textContent = siteDisplayName(s)
        }
    }
}

function renderSitesConfigTable() {
    const container = document.getElementById('sites-config-container')
    if (!container) return
    container.innerHTML = ''
    if (!cachedSites.length) {
        container.appendChild(el('p', { className: 'result-empty', text: '尚无缓存站点，请点击"刷新站点列表"' }))
        return
    }
    const table = document.createElement('table')
    table.className = 'result-table'
    const thead = document.createElement('thead')
    const headRow = document.createElement('tr')
    ;['站点 URL', '权限', '别名', '默认数据状态', '黑名单'].forEach(function(t) { headRow.appendChild(el('th', { text: t })) })
    thead.appendChild(headRow)
    table.appendChild(thead)
    const tbody = document.createElement('tbody')
    cachedSites.forEach(function(site) {
        const tr = document.createElement('tr')
        tr.appendChild(el('td', { text: site.siteUrl }))
        tr.appendChild(el('td', { text: site.permissionLevel || '' }))
        const aliasInput = document.createElement('input')
        aliasInput.type = 'text'
        aliasInput.value = site.alias || ''
        aliasInput.placeholder = '设置别名'
        aliasInput.style.width = '130px'
        let aliasTimer
        aliasInput.addEventListener('input', function() {
            clearTimeout(aliasTimer)
            aliasTimer = setTimeout(function() { saveSiteConfig(site.siteUrl, { alias: aliasInput.value.trim() }) }, 600)
        })
        const aliasTd = document.createElement('td')
        aliasTd.appendChild(aliasInput)
        tr.appendChild(aliasTd)
        const dsSelect = document.createElement('select')
        ;['final', 'all'].forEach(function(v) {
            const opt = document.createElement('option')
            opt.value = v
            opt.textContent = v
            dsSelect.appendChild(opt)
        })
        dsSelect.value = site.defaultDataState || 'final'
        dsSelect.addEventListener('change', function() { saveSiteConfig(site.siteUrl, { defaultDataState: dsSelect.value }) })
        const dsTd = document.createElement('td')
        dsTd.appendChild(dsSelect)
        tr.appendChild(dsTd)
        const blacklistCb = document.createElement('input')
        blacklistCb.type = 'checkbox'
        blacklistCb.checked = !!site.blacklisted
        blacklistCb.addEventListener('change', function() {
            saveSiteConfig(site.siteUrl, { blacklisted: blacklistCb.checked })
            const basicEl = document.getElementById('basic-params')
            if (basicEl) basicEl.replaceWith(buildBasicParams(readBasicParams()))
        })
        const blTd = document.createElement('td')
        blTd.style.textAlign = 'center'
        blTd.appendChild(blacklistCb)
        tr.appendChild(blTd)
        tbody.appendChild(tr)
    })
    table.appendChild(tbody)
    container.appendChild(table)
}

function renderSitesTab() {
    const container = document.getElementById('tab-sites')
    container.innerHTML = ''
    const section = document.createElement('section')
    const topRow = document.createElement('div')
    topRow.className = 'site-actions'
    const refreshBtn = document.createElement('button')
    refreshBtn.id = 'refresh-sites-btn'
    refreshBtn.textContent = '刷新站点列表'
    refreshBtn.addEventListener('click', refreshSites)
    const status = el('span', { id: 'sites-status' })
    status.textContent = cachedSites.length ? ('已缓存 ' + cachedSites.length + ' 个站点') : '尚未获取站点列表'
    topRow.appendChild(refreshBtn)
    topRow.appendChild(status)
    section.appendChild(topRow)
    section.appendChild(el('div', { id: 'sites-config-container' }))
    container.appendChild(section)
    renderSitesConfigTable()
}

// ============================================================
// Tab 2: Site URL select
// ============================================================

function buildSiteUrlSelect(prefillSiteUrl) {
    const container = document.createElement('span')
    if (!cachedSites.length) {
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
    cachedSites.filter(function(s) { return !s.blacklisted }).forEach(function(site) {
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
    if (prefillSiteUrl && cachedSites.filter(function(s) { return !s.blacklisted }).some(function(s) { return s.siteUrl === prefillSiteUrl })) {
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

function readSiteUrl() {
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

function onSiteChange(siteUrl) {
    const site = cachedSites.find(function(s) { return s.siteUrl === siteUrl })
    if (!site) return
    const dsEl = document.getElementById('field-dataState')
    if (dsEl && site.defaultDataState) dsEl.value = site.defaultDataState
    updateComparePreview()
}

// ============================================================
// Tab 2: Basic params
// ============================================================

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
            lastDateShortcut = { label: sc.label, days: sc.days }
            updateComparePreview()
        })
        container.appendChild(btn)
    })
    return container
}

function buildBasicParams(prefill) {
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
        const first = cachedSites.length ? cachedSites[0] : null
        dsSelect.value = (first && first.defaultDataState) ? first.defaultDataState : 'final'
    }
    dsSelect.addEventListener('change', updateComparePreview)
    container.appendChild(mkField('数据状态', dsSelect))
    container.appendChild(mkField('快捷日期', buildDateShortcuts()))
    const startInput = document.createElement('input')
    startInput.id = 'field-startDate'
    startInput.type = 'date'
    startInput.value = (prefill && prefill.startDate) ? prefill.startDate : ''
    startInput.addEventListener('input', function() { lastDateShortcut = null; updateComparePreview() })
    container.appendChild(mkField('起始日期', startInput))
    const endInput = document.createElement('input')
    endInput.id = 'field-endDate'
    endInput.type = 'date'
    endInput.value = (prefill && prefill.endDate) ? prefill.endDate : ''
    endInput.addEventListener('input', function() { lastDateShortcut = null; updateComparePreview() })
    container.appendChild(mkField('结束日期', endInput))
    container.appendChild(mkField('维度', buildDimensionsCheckboxes(prefill && prefill.dimensions)))
    container.appendChild(mkField('最大行数', buildSelectWithCustom({
        idPrefix: 'rowLimit', options: ROWLIMIT_PRESETS,
        current: prefill && prefill.rowLimit, customType: 'number', customLabel: '自定义'
    })))
    return container
}

function readBasicParams() {
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

// ============================================================
// Tab 2: Advanced params
// ============================================================

function buildAdvancedParams(prefill) {
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
    container.appendChild(mkField('筛选器（维度）', buildFiltersEditor(prefill && prefill.filters)))
    container.appendChild(mkField('筛选器（指标-当期）', buildMetricFiltersEditor(
        'metric-filters', prefill && prefill.metricFilters,
        '按当期指标筛选，只对已返回的行生效（受最大行数限制）'
    )))
    container.appendChild(mkField('筛选器（指标-上期）', buildMetricFiltersEditor(
        'previous-metric-filters', prefill && prefill.previousMetricFilters,
        '按上期指标筛选，新词上期值视为 0（如 clicks > 0 可排除新词）'
    )))
    container.appendChild(mkField('筛选器（变化量）', buildDeltaFiltersEditor(prefill && prefill.deltaFilters)))
    return container
}

function readAdvancedParams() {
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
    params.filters = readFilters()
    params.metricFilters = readMetricFilters('metric-filters')
    params.previousMetricFilters = readMetricFilters('previous-metric-filters')
    params.deltaFilters = readDeltaFilters()
    return params
}

function isAdvancedFilled() {
    const st = document.getElementById('field-searchType')
    if (st && st.value !== 'web') return true
    const sr = readSelectWithCustom('startRow')
    if (sr !== '' && sr !== '0') return true
    const obMet = document.getElementById('field-orderByMetric')
    if (obMet && obMet.value) return true
    if (readFilters().length) return true
    if (readMetricFilters('metric-filters').length) return true
    if (readMetricFilters('previous-metric-filters').length) return true
    if (readDeltaFilters().length) return true
    return false
}

// ============================================================
// Tab 2: Compare preview
// ============================================================

function updateComparePreview() {
    const preview = document.getElementById('compare-preview')
    if (!preview || !compareMode) return
    const basic = readBasicParams()
    if (!basic.startDate || !basic.endDate) {
        preview.innerHTML = '<p class="field-hint">请先设置本期日期</p>'
        return
    }
    const prev = computePreviousPeriod(basic.startDate, basic.endDate)
    const site = cachedSites.find(function(s) { return s.siteUrl === basic.siteUrl })
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
        rows.push(['维度筛选', adv.filters.map(function(f) {
            const dimLabel = DIMENSION_LABELS[f.dimension] || f.dimension
            const expr = f.dimension === 'country' ? (COUNTRY_NAMES[f.expression] || f.expression) : f.expression
            return dimLabel + ' ' + f.operator + ' "' + expr + '"'
        }).join('; ')])
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

function setQueryMode(mode) {
    compareMode = mode === 'compare'
    document.querySelectorAll('.query-mode-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.mode === mode)
    })
    const preview = document.getElementById('compare-preview')
    const layout = document.getElementById('params-layout')
    if (compareMode) {
        if (preview) preview.hidden = false
        if (layout) layout.classList.add('compare-mode')
        updateComparePreview()
    } else {
        if (preview) preview.hidden = true
        if (layout) layout.classList.remove('compare-mode')
    }
}

function determineFn() {
    if (compareMode) return isAdvancedFilled() ? 'comparePeriodsAdvanced' : 'comparePeriodsSimple'
    return isAdvancedFilled() ? 'queryPerformanceAdvanced' : 'queryPerformanceSimple'
}

// ============================================================
// Tab 2: Query execution
// ============================================================

async function executeQuery() {
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
        if (!data.error) lastQueryParams = params
        renderResult(fn, params, data)
    } catch (e) {
        resultEl.textContent = '请求失败: ' + e.message
    } finally {
        btn.disabled = false
    }
}

// ============================================================
// Tab 2: Presets
// ============================================================

async function loadPresets() {
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

async function savePreset() {
    const nameInput = document.getElementById('preset-name')
    const name = nameInput.value.trim()
    if (!name) { alert('请输入预设名字'); return }
    const fn = determineFn()
    const params = Object.assign({}, readBasicParams(), readAdvancedParams())
    if (lastDateShortcut) {
        params.dateShortcut = lastDateShortcut
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
        lastDateShortcut = params.dateShortcut
        const range = dateRangeFromShortcut(params.dateShortcut.days, params.dataState || 'all')
        params.startDate = range.startDate
        params.endDate = range.endDate
    } else {
        lastDateShortcut = null
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

// ============================================================
// Tab 2: Results
// ============================================================

function renderResult(fnKey, params, data) {
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

function renderRowsTable(container, rows, dimensions) {
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
            td.appendChild(document.createTextNode(formatKey(dimensions[i], k)))
            if (dimensions[i] === 'page') td.appendChild(makePageLink(k))
            if (i === 0) { const tb = makeTrendBtn(row.keys, dimensions); if (tb) td.appendChild(tb) }
            tr.appendChild(td)
        })
        METRIC_OPTIONS.forEach(function(m) { tr.appendChild(el('td', { text: formatMetricValue(m, row[m]) })) })
        tbody.appendChild(tr)
    })
    table.appendChild(tbody)
    container.appendChild(table)
}

function renderCompareTable(container, result, dimensions) {
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
    METRIC_OPTIONS.forEach(function(m) { headRow.appendChild(el('th', { text: METRIC_LABELS[m] })) })
    thead.appendChild(headRow)
    table.appendChild(thead)
    const tbody = document.createElement('tbody')
    rows.forEach(function(row) {
        const tr = document.createElement('tr')
        const isNew = !!row.isNew
        ;(row.keys || []).forEach(function(k, i) {
            const td = document.createElement('td')
            td.appendChild(document.createTextNode(formatKey(dimensions[i], k)))
            if (dimensions[i] === 'page') td.appendChild(makePageLink(k))
            if (i === 0 && isNew) td.appendChild(el('span', { className: 'new-row-badge', text: '新' }))
            if (i === 0) { const tb = makeTrendBtn(row.keys, dimensions); if (tb) td.appendChild(tb) }
            tr.appendChild(td)
        })
        METRIC_OPTIONS.forEach(function(m) {
            const td = document.createElement('td')
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
        })
        tbody.appendChild(tr)
    })
    table.appendChild(tbody)
    container.appendChild(table)
}

// ============================================================
// Tab 2: Trend chart
// ============================================================

function makePageLink(url) {
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.className = 'page-link-btn'
    a.title = '在新标签页打开'
    a.innerHTML = '<svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 1.5H1.5v8h8V6.5"/><polyline points="6.5,1.5 9.5,1.5 9.5,4.5"/><line x1="5.5" y1="5.5" x2="9.5" y2="1.5"/></svg>'
    return a
}

function makeTrendBtn(rowKeys, dimensions) {
    const nonDateDims = dimensions.filter(function(d) { return d !== 'date' })
    if (!nonDateDims.length) return null
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'trend-btn'
    btn.title = '查看趋势'
    btn.innerHTML = '<svg width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="0.5,8.5 3,5.5 5.5,7 9,2.5 11.5,1"/><line x1="0.5" y1="9.5" x2="11.5" y2="9.5"/></svg>'
    btn.addEventListener('click', function(e) {
        e.stopPropagation()
        if (!lastQueryParams || !lastQueryParams.startDate) { alert('请先执行一次查询'); return }
        openTrendModal(rowKeys, dimensions, lastQueryParams)
    })
    return btn
}

async function fetchTrendData(rowKeys, dimensions, params) {
    // Build per-row key filters (exclude date dimension)
    const keyFilters = dimensions.reduce(function(acc, dim, i) {
        if (dim !== 'date') acc.push({ dimension: dim, operator: 'equals', expression: rowKeys[i] })
        return acc
    }, [])
    const allFilters = (params.filters || []).concat(keyFilters)
    // Add date as first dimension if not already present
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
    // Fill every calendar day in the range so X axis is uniform.
    // Missing days (GSC omits zero-data dates) become {clicks:0, impressions:0, ctr:null, position:null}.
    // null tells drawLine to lift the pen rather than draw to 0 (which would distort ctr/position scales).
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

async function openTrendModal(rowKeys, dimensions, params) {
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

function drawTrendChart(canvas, currentPoints, prevPoints, metric, dpr) {
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

    // Grid + Y labels
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

    // Axes
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

    // X labels: dates from current (or prev) period
    const step = Math.max(1, Math.floor(maxLen / 5))
    ctx.fillStyle = '#bbb'; ctx.font = '9px system-ui'; ctx.textAlign = 'center'
    for (let i = 0; i < maxLen; i += step) {
        const x = xS(i)
        const dateStr = ((currentPoints[i] || prevPoints[i] || {}).date || '').slice(5) // MM-DD
        ctx.fillText(dateStr, x, mt + iH + 16)
        ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(x, mt + iH); ctx.lineTo(x, mt + iH + 3); ctx.stroke()
    }
}

// ============================================================
// Tab 2: Render structure
// ============================================================

function renderQueryTab() {
    const container = document.getElementById('tab-query')
    container.innerHTML = ''
    // Presets section
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
    // Params section
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
    // Results
    container.appendChild(el('div', { id: 'result' }))
    setQueryMode('compare')
}

// ============================================================
// Tab management & init
// ============================================================

function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active') })
            btn.classList.add('active')
            document.querySelectorAll('.tab-content').forEach(function(c) { c.hidden = true })
            document.getElementById('tab-' + btn.dataset.tab).hidden = false
        })
    })
}

// ============================================================
// Tab: 站点分析
// ============================================================

let cachedPlans = []

async function loadAnalysisPlans() {
    const data = await fetch('/api/analysis-plans').then(function(r) { return r.json() })
    cachedPlans = data.plans || []
    renderAnalysisPlanSection()
}

async function saveAnalysisPlan(plan, isNew) {
    if (isNew) {
        await fetch('/api/analysis-plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(plan) })
    } else {
        await fetch('/api/analysis-plans/' + plan.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(plan) })
    }
    await loadAnalysisPlans()
    const sel = document.getElementById('analysis-plan-select')
    if (sel) sel.value = plan.id
    renderGroupCheckboxes()
}

function buildAnalysisBasicParams() {
    const wrap = document.createElement('div')

    const siteField = document.createElement('div')
    siteField.className = 'field'
    siteField.appendChild(el('span', { text: '站点' }))
    const siteSelect = document.createElement('select')
    siteSelect.id = 'analysis-site-url'
    const nonBlacklisted = cachedSites.filter(function(s) { return !s.blacklisted })
    if (!nonBlacklisted.length) {
        const opt = document.createElement('option')
        opt.value = ''; opt.textContent = '（无可用站点，请先刷新站群）'
        siteSelect.appendChild(opt)
    } else {
        nonBlacklisted.forEach(function(s) {
            const opt = document.createElement('option')
            opt.value = s.siteUrl; opt.textContent = siteDisplayName(s)
            siteSelect.appendChild(opt)
        })
    }
    siteField.appendChild(siteSelect)
    wrap.appendChild(siteField)

    const dsField = document.createElement('div')
    dsField.className = 'field'
    dsField.appendChild(el('span', { text: '数据状态' }))
    const dsSelect = document.createElement('select')
    dsSelect.id = 'analysis-data-state'
    ;[['final', 'Final（最终）'], ['all', 'All（含临时）']].forEach(function(p) {
        const opt = document.createElement('option')
        opt.value = p[0]; opt.textContent = p[1]
        dsSelect.appendChild(opt)
    })
    dsField.appendChild(dsSelect)
    wrap.appendChild(dsField)

    const dateRow = document.createElement('div')
    dateRow.style.display = 'flex'; dateRow.style.gap = '0.5rem'; dateRow.style.flexWrap = 'wrap'; dateRow.style.alignItems = 'flex-end'
    const startField = document.createElement('div')
    startField.className = 'field'; startField.style.margin = '0'
    startField.appendChild(el('span', { text: '开始日期' }))
    const startInput = document.createElement('input')
    startInput.type = 'date'; startInput.id = 'analysis-start-date'
    startField.appendChild(startInput)
    const endField = document.createElement('div')
    endField.className = 'field'; endField.style.margin = '0'
    endField.appendChild(el('span', { text: '结束日期' }))
    const endInput = document.createElement('input')
    endInput.type = 'date'; endInput.id = 'analysis-end-date'
    endField.appendChild(endInput)
    dateRow.appendChild(startField)
    dateRow.appendChild(endField)
    wrap.appendChild(dateRow)

    const shortcuts = document.createElement('div')
    shortcuts.className = 'date-shortcuts'
    shortcuts.style.marginTop = '0.4rem'
    DATE_SHORTCUTS.forEach(function(sc) {
        const btn = document.createElement('button')
        btn.type = 'button'; btn.className = 'date-shortcut-btn'; btn.textContent = sc.label
        btn.addEventListener('click', function() {
            const range = dateRangeFromShortcut(sc.days, dsSelect.value)
            startInput.value = range.startDate; endInput.value = range.endDate
        })
        shortcuts.appendChild(btn)
    })
    wrap.appendChild(shortcuts)

    return wrap
}

function readAnalysisBasicParams() {
    return {
        siteUrl: (document.getElementById('analysis-site-url') || {}).value || '',
        dataState: (document.getElementById('analysis-data-state') || {}).value || 'final',
        startDate: (document.getElementById('analysis-start-date') || {}).value || '',
        endDate: (document.getElementById('analysis-end-date') || {}).value || ''
    }
}

function renderAnalysisTab() {
    const container = document.getElementById('tab-analysis')
    container.innerHTML = ''

    const basicSection = document.createElement('section')
    basicSection.appendChild(el('h3', { className: 'section-title', text: '基础参数' }))
    basicSection.appendChild(buildAnalysisBasicParams())
    container.appendChild(basicSection)

    const planSection = document.createElement('section')
    planSection.id = 'analysis-plan-section'
    planSection.appendChild(el('h3', { className: 'section-title', text: '分析方案' }))
    container.appendChild(planSection)

    container.appendChild(el('div', { id: 'analysis-results' }))
}

function renderAnalysisPlanSection() {
    const section = document.getElementById('analysis-plan-section')
    if (!section) return
    while (section.children.length > 1) section.removeChild(section.lastChild)

    if (!cachedPlans.length) {
        section.appendChild(el('p', { className: 'field-hint', text: '暂无方案' }))
        const nb = document.createElement('button')
        nb.type = 'button'; nb.textContent = '新建方案'
        nb.addEventListener('click', function() { openPlanModal(null) })
        section.appendChild(nb)
        return
    }

    const selRow = document.createElement('div')
    selRow.className = 'analysis-plan-selector-row'
    const planSel = document.createElement('select')
    planSel.id = 'analysis-plan-select'
    cachedPlans.forEach(function(p) {
        const opt = document.createElement('option'); opt.value = p.id; opt.textContent = p.name
        planSel.appendChild(opt)
    })
    const editBtn = document.createElement('button')
    editBtn.type = 'button'; editBtn.textContent = '编辑方案'
    editBtn.addEventListener('click', function() {
        const plan = cachedPlans.find(function(p) { return p.id === planSel.value })
        if (plan) openPlanModal(plan)
    })
    const newBtn = document.createElement('button')
    newBtn.type = 'button'; newBtn.textContent = '新建方案'
    newBtn.addEventListener('click', function() { openPlanModal(null) })
    const copyBtn = document.createElement('button')
    copyBtn.type = 'button'; copyBtn.textContent = '复制方案'
    copyBtn.addEventListener('click', function() {
        const plan = cachedPlans.find(function(p) { return p.id === planSel.value })
        if (!plan) return
        const copy = JSON.parse(JSON.stringify(plan))
        copy.id = Date.now().toString(36)
        copy.name = plan.name + ' 副本'
        copy.groups = copy.groups.map(function(g, i) {
            return Object.assign({}, g, { id: 'g' + Date.now().toString(36) + i })
        })
        openPlanModal(copy, true)
    })
    const delBtn = document.createElement('button')
    delBtn.type = 'button'; delBtn.textContent = '删除方案'
    delBtn.addEventListener('click', async function() {
        const plan = cachedPlans.find(function(p) { return p.id === planSel.value })
        if (!plan || !confirm('确认删除方案"' + plan.name + '"？')) return
        await fetch('/api/analysis-plans/' + plan.id, { method: 'DELETE' })
        await loadAnalysisPlans()
    })
    selRow.appendChild(planSel); selRow.appendChild(editBtn); selRow.appendChild(newBtn); selRow.appendChild(copyBtn); selRow.appendChild(delBtn)
    section.appendChild(selRow)
    planSel.addEventListener('change', renderGroupCheckboxes)
    renderGroupCheckboxes()
}

function renderGroupCheckboxes() {
    const section = document.getElementById('analysis-plan-section')
    if (!section) return
    const old1 = document.getElementById('analysis-group-checkboxes')
    const old2 = document.getElementById('analysis-run-row')
    if (old1) old1.remove(); if (old2) old2.remove()

    const planSel = document.getElementById('analysis-plan-select')
    if (!planSel) return
    const plan = cachedPlans.find(function(p) { return p.id === planSel.value })
    if (!plan) return

    const cbWrap = document.createElement('div')
    cbWrap.id = 'analysis-group-checkboxes'; cbWrap.className = 'checkbox-group'
    plan.groups.forEach(function(g) {
        const label = document.createElement('label'); label.className = 'checkbox-item'
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = g.id; cb.checked = true
        label.appendChild(cb); label.appendChild(document.createTextNode(g.name))
        cbWrap.appendChild(label)
    })
    section.appendChild(cbWrap)

    const runRow = document.createElement('div')
    runRow.id = 'analysis-run-row'; runRow.className = 'actions'
    const runBtn = document.createElement('button')
    runBtn.type = 'button'; runBtn.className = 'btn-primary'; runBtn.textContent = '执行分析'
    runBtn.addEventListener('click', runAnalysis)
    runRow.appendChild(runBtn)
    section.appendChild(runRow)
}

async function runAnalysis() {
    const basic = readAnalysisBasicParams()
    if (!basic.siteUrl) { alert('请先选择站点'); return }
    if (!basic.startDate || !basic.endDate) { alert('请先设置日期范围'); return }

    const planSel = document.getElementById('analysis-plan-select')
    const plan = cachedPlans.find(function(p) { return p.id === (planSel && planSel.value) })
    if (!plan) { alert('请先选择分析方案'); return }

    const checkedIds = new Set(
        Array.from(document.querySelectorAll('#analysis-group-checkboxes input:checked')).map(function(cb) { return cb.value })
    )
    const groups = plan.groups.filter(function(g) { return checkedIds.has(g.id) })
    if (!groups.length) { alert('请至少勾选一个分组'); return }

    const resultsEl = document.getElementById('analysis-results')
    resultsEl.innerHTML = ''

    const runBtn = document.querySelector('#analysis-run-row .btn-primary')
    if (runBtn) { runBtn.disabled = true; runBtn.textContent = '分析中...' }

    for (var gi = 0; gi < groups.length; gi++) {
        const group = groups[gi]
        const groupEl = document.createElement('details')
        groupEl.className = 'analysis-group-result'
        if (gi === 0) groupEl.open = true

        const summaryEl = document.createElement('summary')
        summaryEl.className = 'analysis-group-summary'
        const titleEl = el('h3', { className: 'analysis-group-title', text: group.name })
        summaryEl.appendChild(titleEl)
        groupEl.appendChild(summaryEl)

        const bodyEl = document.createElement('div')
        bodyEl.className = 'analysis-group-body'
        const loadingEl = el('div', { className: 'trend-loading', text: '查询中...' })
        bodyEl.appendChild(loadingEl)
        groupEl.appendChild(bodyEl)
        resultsEl.appendChild(groupEl)
        try {
            const params = Object.assign({}, basic, {
                dimensions: group.dimensions || ['query'],
                searchType: group.searchType || 'web',
                rowLimit: group.rowLimit || 100,
                orderBy: group.orderBy,
                filters: group.filters || [],
                metricFilters: group.metricFilters || [],
                previousMetricFilters: group.previousMetricFilters || [],
                deltaFilters: group.deltaFilters || []
            })
            const resp = await fetch('/api/call', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fn: 'comparePeriodsAdvanced', params: params }) })
            const data = await resp.json()
            loadingEl.remove()
            if (data.error) {
                bodyEl.appendChild(el('div', { className: 'result-empty', text: '查询失败: ' + data.error }))
            } else {
                const count = (data.result.rows || []).length
                titleEl.appendChild(el('span', { className: 'analysis-group-count', text: count + ' 条' }))
                renderCompareTable(bodyEl, data.result, group.dimensions || ['query'])
            }
        } catch (e) {
            loadingEl.textContent = '查询失败: ' + e.message
        }
    }

    if (runBtn) { runBtn.disabled = false; runBtn.textContent = '执行分析' }
}

// ---- Plan modal ----

function openPlanModal(plan, saveAsNew) {
    // saveAsNew=true: save as new (POST), used for both "新建" and "复制"
    const isNew = saveAsNew || !plan
    const overlay = document.createElement('div')
    overlay.className = 'trend-overlay'
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove() })
    function escClose(e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escClose) } }
    document.addEventListener('keydown', escClose)

    const modal = document.createElement('div')
    modal.className = 'plan-modal'

    const header = document.createElement('div')
    header.className = 'trend-modal-header'
    const modalTitle = !plan ? '新建方案' : (isNew ? '复制方案' : '编辑方案')
    header.appendChild(el('h3', { className: 'trend-modal-title', text: modalTitle }))
    const closeBtn = document.createElement('button')
    closeBtn.type = 'button'; closeBtn.className = 'trend-modal-close'; closeBtn.textContent = '×'
    closeBtn.addEventListener('click', function() { overlay.remove() })
    header.appendChild(closeBtn)
    modal.appendChild(header)

    const nameField = document.createElement('div'); nameField.className = 'field'
    nameField.appendChild(el('span', { text: '方案名称' }))
    const nameInput = document.createElement('input')
    nameInput.type = 'text'; nameInput.placeholder = '输入方案名称'; nameInput.value = plan ? plan.name : ''
    nameField.appendChild(nameInput)
    modal.appendChild(nameField)

    const groupsWrap = document.createElement('div')
    groupsWrap.id = 'plan-modal-groups'
    modal.appendChild(groupsWrap)

    const groupEditors = []
    function addGroupEditor(group) {
        const editor = buildGroupAccordion(group)
        groupEditors.push(editor)
        groupsWrap.appendChild(editor.el)
    }
    ;(plan ? plan.groups : []).forEach(addGroupEditor)

    const addGroupBtn = document.createElement('button')
    addGroupBtn.type = 'button'; addGroupBtn.textContent = '+ 添加分组'
    addGroupBtn.style.marginTop = '0.5rem'
    addGroupBtn.addEventListener('click', function() {
        addGroupEditor({ id: 'g' + Date.now().toString(36), name: '新分组', dimensions: ['query'], searchType: 'web', rowLimit: 100, filters: [], metricFilters: [], previousMetricFilters: [], deltaFilters: [] })
    })
    modal.appendChild(addGroupBtn)

    const footer = document.createElement('div'); footer.className = 'plan-modal-footer'
    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'; cancelBtn.textContent = '取消'
    cancelBtn.addEventListener('click', function() { overlay.remove() })
    const saveBtn = document.createElement('button')
    saveBtn.type = 'button'; saveBtn.className = 'btn-primary'; saveBtn.textContent = '保存'
    saveBtn.addEventListener('click', async function() {
        const name = nameInput.value.trim()
        if (!name) { alert('请输入方案名称'); return }
        const groups = groupEditors.filter(function(e) { return e.el.parentNode }).map(function(e) { return e.read() })
        const planData = { id: plan ? plan.id : Date.now().toString(36), name: name, groups: groups }
        saveBtn.disabled = true; saveBtn.textContent = '保存中...'
        await saveAnalysisPlan(planData, isNew)
        overlay.remove()
    })
    footer.appendChild(cancelBtn); footer.appendChild(saveBtn)
    modal.appendChild(footer)

    overlay.appendChild(modal)
    document.body.appendChild(overlay)
}

function buildGroupAccordion(group) {
    const details = document.createElement('details')
    details.className = 'plan-group-accordion'; details.open = false

    const summary = document.createElement('summary')
    summary.className = 'plan-group-summary'

    // Click-to-edit name: pencil icon → hidden input toggle
    const editIconBtn = document.createElement('button')
    editIconBtn.type = 'button'; editIconBtn.className = 'plan-group-edit-btn'; editIconBtn.title = '重命名'
    editIconBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 1.5 L9.5 3.5 L4 9 L1.5 9.5 L2 7 Z"/><line x1="6.5" y1="2.5" x2="8.5" y2="4.5"/></svg>'
    const nameSpan = document.createElement('span')
    nameSpan.className = 'plan-group-name-span'; nameSpan.textContent = group.name || '未命名分组'
    const nameInput = document.createElement('input')
    nameInput.type = 'text'; nameInput.className = 'plan-group-name-input'; nameInput.style.display = 'none'
    nameInput.value = group.name || ''; nameInput.placeholder = '分组名称'

    function enterNameEdit(e) {
        e.stopPropagation(); e.preventDefault()
        nameSpan.style.display = 'none'; editIconBtn.style.display = 'none'
        nameInput.style.display = ''; nameInput.focus(); nameInput.select()
    }
    function exitNameEdit() {
        const val = nameInput.value.trim() || nameSpan.textContent
        nameInput.value = val; nameSpan.textContent = val
        nameInput.style.display = 'none'
        nameSpan.style.display = ''; editIconBtn.style.display = ''
    }
    editIconBtn.addEventListener('click', enterNameEdit)
    nameInput.addEventListener('blur', exitNameEdit)
    nameInput.addEventListener('click', function(e) { e.stopPropagation() })
    nameInput.addEventListener('keydown', function(e) {
        e.stopPropagation()
        if (e.key === 'Enter') { nameInput.blur() }
        if (e.key === 'Escape') { nameInput.value = nameSpan.textContent; nameInput.blur() }
    })

    const removeBtn = document.createElement('button')
    removeBtn.type = 'button'; removeBtn.textContent = '删除'
    removeBtn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation()
        if (confirm('删除分组"' + nameSpan.textContent + '"？')) details.remove()
    })
    summary.appendChild(editIconBtn); summary.appendChild(nameSpan); summary.appendChild(nameInput); summary.appendChild(removeBtn)
    details.appendChild(summary)

    const body = document.createElement('div'); body.className = 'plan-group-body'

    // Dimensions
    const dimsField = document.createElement('div'); dimsField.className = 'field'
    dimsField.appendChild(el('span', { text: '维度' }))
    const dimsCbWrap = document.createElement('div'); dimsCbWrap.className = 'checkbox-group'
    const dimCbs = []
    ;['query', 'page', 'country', 'device', 'date', 'searchAppearance'].forEach(function(d) {
        const lbl = document.createElement('label'); lbl.className = 'checkbox-item'
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = d
        cb.checked = (group.dimensions || ['query']).includes(d)
        dimCbs.push(cb)
        lbl.appendChild(cb); lbl.appendChild(document.createTextNode(DIMENSION_LABELS[d] || d))
        dimsCbWrap.appendChild(lbl)
    })
    dimsField.appendChild(dimsCbWrap); body.appendChild(dimsField)

    // SearchType + RowLimit inline
    const srRow = document.createElement('div'); srRow.style.display = 'flex'; srRow.style.gap = '1rem'
    const stField = document.createElement('div'); stField.className = 'field'; stField.style.margin = '0'
    stField.appendChild(el('span', { text: '搜索类型' }))
    const stSel = document.createElement('select')
    ;['web', 'image', 'video', 'news', 'discover', 'googleNews'].forEach(function(t) {
        const opt = document.createElement('option'); opt.value = t; opt.textContent = t; stSel.appendChild(opt)
    })
    stSel.value = group.searchType || 'web'
    stField.appendChild(stSel); srRow.appendChild(stField)
    const rlField = document.createElement('div'); rlField.className = 'field'; rlField.style.margin = '0'
    rlField.appendChild(el('span', { text: '最大行数' }))
    const rlInput = document.createElement('input'); rlInput.type = 'number'; rlInput.min = '1'; rlInput.max = '25000'
    rlInput.value = group.rowLimit || 100; rlInput.style.width = '80px'
    rlField.appendChild(rlInput); srRow.appendChild(rlField)
    body.appendChild(srRow)

    // OrderBy
    const obField = document.createElement('div'); obField.className = 'field'
    obField.appendChild(el('span', { text: '排序' }))
    const obRow = document.createElement('div'); obRow.style.display = 'flex'; obRow.style.gap = '0.5rem'
    const obMetSel = document.createElement('select')
    METRIC_OPTIONS.forEach(function(m) {
        const opt = document.createElement('option'); opt.value = m; opt.textContent = METRIC_LABELS[m] || m; obMetSel.appendChild(opt)
    })
    obMetSel.value = (group.orderBy && group.orderBy.metric) || 'clicks'
    const obDirSel = document.createElement('select')
    ;[['descending', '降序'], ['ascending', '升序']].forEach(function(p) {
        const opt = document.createElement('option'); opt.value = p[0]; opt.textContent = p[1]; obDirSel.appendChild(opt)
    })
    obDirSel.value = (group.orderBy && group.orderBy.direction) || 'descending'
    obRow.appendChild(obMetSel); obRow.appendChild(obDirSel)
    obField.appendChild(obRow); body.appendChild(obField)

    // Filter editors (closure-based)
    body.appendChild(el('div', { className: 'plan-group-section-label', text: '维度筛选' }))
    const fe = buildGroupFiltersEditor(group.filters || []); body.appendChild(fe.el)
    body.appendChild(el('div', { className: 'plan-group-section-label', text: '当期指标筛选' }))
    const mfe = buildGroupMetricFiltersEditor(group.metricFilters || []); body.appendChild(mfe.el)
    body.appendChild(el('div', { className: 'plan-group-section-label', text: '上期指标筛选' }))
    const pmfe = buildGroupMetricFiltersEditor(group.previousMetricFilters || []); body.appendChild(pmfe.el)
    body.appendChild(el('div', { className: 'plan-group-section-label', text: '变化筛选' }))
    const dfe = buildGroupDeltaFiltersEditor(group.deltaFilters || []); body.appendChild(dfe.el)

    details.appendChild(body)

    return {
        el: details,
        read: function() {
            return {
                id: group.id || Date.now().toString(36),
                name: nameInput.value.trim() || nameSpan.textContent || '未命名分组',
                dimensions: dimCbs.filter(function(cb) { return cb.checked }).map(function(cb) { return cb.value }),
                searchType: stSel.value,
                rowLimit: parseInt(rlInput.value) || 100,
                orderBy: { metric: obMetSel.value, direction: obDirSel.value },
                filters: fe.read(),
                metricFilters: mfe.read(),
                previousMetricFilters: pmfe.read(),
                deltaFilters: dfe.read()
            }
        }
    }
}

// ---- Closure-based filter builders for modal (no global IDs) ----

function buildGroupFiltersEditor(currentFilters) {
    const container = document.createElement('div')
    const rows = document.createElement('div'); rows.className = 'filter-rows-container'
    container.appendChild(rows)
    function addRow(f) {
        const row = document.createElement('div'); row.className = 'filter-row'
        const dimSel = document.createElement('select')
        ;['query', 'page', 'country', 'device', 'date', 'searchAppearance'].forEach(function(d) {
            const opt = document.createElement('option'); opt.value = d; opt.textContent = DIMENSION_LABELS[d] || d; dimSel.appendChild(opt)
        })
        if (f) dimSel.value = f.dimension
        const opSel = document.createElement('select')
        ;['equals', 'notEquals', 'contains', 'notContains', 'includingRegex', 'excludingRegex'].forEach(function(op) {
            const opt = document.createElement('option'); opt.value = op; opt.textContent = op; opSel.appendChild(opt)
        })
        if (f) opSel.value = f.operator
        const exprIn = document.createElement('input'); exprIn.type = 'text'; exprIn.className = 'filter-expression'; exprIn.placeholder = '筛选值'
        if (f) exprIn.value = f.expression || ''
        const rm = document.createElement('button'); rm.type = 'button'; rm.textContent = '删除'
        rm.addEventListener('click', function() { row.remove() })
        row.appendChild(dimSel); row.appendChild(opSel); row.appendChild(exprIn); row.appendChild(rm)
        rows.appendChild(row)
    }
    const addBtn = document.createElement('button'); addBtn.type = 'button'; addBtn.textContent = '+ 添加维度筛选'
    addBtn.addEventListener('click', function() { addRow() })
    container.appendChild(addBtn)
    ;(currentFilters || []).forEach(addRow)
    return {
        el: container,
        read: function() {
            return Array.from(rows.querySelectorAll('.filter-row')).map(function(row) {
                const sels = row.querySelectorAll('select')
                return { dimension: sels[0].value, operator: sels[1].value, expression: row.querySelector('.filter-expression').value }
            }).filter(function(f) { return f.expression })
        }
    }
}

function buildGroupMetricFiltersEditor(currentFilters) {
    const container = document.createElement('div')
    const rows = document.createElement('div'); rows.className = 'filter-rows-container'
    container.appendChild(rows)
    function addRow(f) {
        const row = document.createElement('div'); row.className = 'filter-row'
        const metSel = document.createElement('select')
        METRIC_OPTIONS.forEach(function(m) {
            const opt = document.createElement('option'); opt.value = m; opt.textContent = METRIC_LABELS[m] || m; metSel.appendChild(opt)
        })
        if (f) metSel.value = f.metric
        const opSel = document.createElement('select')
        METRIC_OPERATORS.forEach(function(op) {
            const opt = document.createElement('option'); opt.value = op; opt.textContent = op; opSel.appendChild(opt)
        })
        if (f) opSel.value = f.operator
        const valIn = document.createElement('input'); valIn.type = 'number'; valIn.className = 'filter-expression'; valIn.placeholder = '数值'
        if (f && f.value != null) valIn.value = f.value
        const rm = document.createElement('button'); rm.type = 'button'; rm.textContent = '删除'
        rm.addEventListener('click', function() { row.remove() })
        row.appendChild(metSel); row.appendChild(opSel); row.appendChild(valIn); row.appendChild(rm)
        rows.appendChild(row)
    }
    const addBtn = document.createElement('button'); addBtn.type = 'button'; addBtn.textContent = '+ 添加指标筛选'
    addBtn.addEventListener('click', function() { addRow() })
    container.appendChild(addBtn)
    ;(currentFilters || []).forEach(addRow)
    return {
        el: container,
        read: function() {
            return Array.from(rows.querySelectorAll('.filter-row')).map(function(row) {
                const raw = row.querySelector('.filter-expression').value
                if (raw === '') return null
                const sels = row.querySelectorAll('select')
                return { metric: sels[0].value, operator: sels[1].value, value: parseFloat(raw) }
            }).filter(Boolean)
        }
    }
}

function buildGroupDeltaFiltersEditor(currentFilters) {
    const container = document.createElement('div')
    const rows = document.createElement('div'); rows.className = 'filter-rows-container'
    container.appendChild(rows)
    function addRow(f) {
        const row = document.createElement('div'); row.className = 'filter-row'
        const comboSel = document.createElement('select'); comboSel.className = 'delta-filter-combo'
        DELTA_FILTER_OPTIONS.forEach(function(o) {
            const opt = document.createElement('option'); opt.value = o.value; opt.textContent = o.label; comboSel.appendChild(opt)
        })
        const opSel = document.createElement('select')
        METRIC_OPERATORS.forEach(function(op) {
            const opt = document.createElement('option'); opt.value = op; opt.textContent = op; opSel.appendChild(opt)
        })
        const valIn = document.createElement('input'); valIn.type = 'number'; valIn.className = 'filter-expression'; valIn.placeholder = '数值'
        const unitSpan = document.createElement('span'); unitSpan.className = 'delta-filter-unit'
        function syncUnit() {
            const sel = DELTA_FILTER_OPTIONS.find(function(o) { return o.value === comboSel.value })
            unitSpan.textContent = (sel && sel.mode === 'relative') ? '%' : ''
        }
        if (f) {
            const match = DELTA_FILTER_OPTIONS.find(function(o) { return o.metric === f.metric && o.mode === f.mode })
            if (match) comboSel.value = match.value
            if (f.operator) opSel.value = f.operator
            if (f.value != null) valIn.value = f.mode === 'relative' ? Math.round(f.value * 100 * 10) / 10 : f.value
        }
        syncUnit()
        comboSel.addEventListener('change', syncUnit)
        const rm = document.createElement('button'); rm.type = 'button'; rm.textContent = '删除'
        rm.addEventListener('click', function() { row.remove() })
        row.appendChild(comboSel); row.appendChild(opSel); row.appendChild(valIn); row.appendChild(unitSpan); row.appendChild(rm)
        rows.appendChild(row)
    }
    const addBtn = document.createElement('button'); addBtn.type = 'button'; addBtn.textContent = '+ 添加变化筛选'
    addBtn.addEventListener('click', function() { addRow() })
    container.appendChild(addBtn)
    ;(currentFilters || []).forEach(addRow)
    return {
        el: container,
        read: function() {
            return Array.from(rows.querySelectorAll('.filter-row')).map(function(row) {
                const raw = row.querySelector('.filter-expression').value
                if (raw === '') return null
                const combo = row.querySelector('select').value
                const opt = DELTA_FILTER_OPTIONS.find(function(o) { return o.value === combo })
                if (!opt) return null
                return { metric: opt.metric, mode: opt.mode, operator: row.querySelectorAll('select')[1].value, value: parseFloat(raw) * (opt.mode === 'relative' ? 0.01 : 1) }
            }).filter(Boolean)
        }
    }
}

async function init() {
    initTabs()
    renderSitesTab()
    renderAnalysisTab()
    renderQueryTab()
    try {
        await loadCachedSites()
        renderSitesConfigTable()
        const basicEl = document.getElementById('basic-params')
        if (basicEl) basicEl.replaceWith(buildBasicParams(null))
        const siteUrl = readSiteUrl()
        if (siteUrl) onSiteChange(siteUrl)
        // Refresh analysis site dropdown with loaded sites
        const analysisSiteEl = document.getElementById('analysis-site-url')
        if (analysisSiteEl) {
            const nonBlacklisted = cachedSites.filter(function(s) { return !s.blacklisted })
            analysisSiteEl.innerHTML = ''
            nonBlacklisted.forEach(function(s) {
                const opt = document.createElement('option'); opt.value = s.siteUrl; opt.textContent = siteDisplayName(s)
                analysisSiteEl.appendChild(opt)
            })
        }
    } catch (e) {
        console.error('Failed to load cached sites:', e)
    }
    loadPresets()
    loadAnalysisPlans()
}

init()

// Live reload: public file changes → reload; server restart (new token) → reload
;(function () {
    var token = null
    var es = new EventSource('/api/livereload')
    es.addEventListener('init', function (e) {
        if (token !== null && e.data !== token) { location.reload(); return }
        token = e.data
    })
    es.addEventListener('reload', function () { location.reload() })
})()
