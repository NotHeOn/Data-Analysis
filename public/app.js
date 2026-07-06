'use strict'

// --- Constants ---
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
        exprInput.placeholder = '筛选值，如 /blog/ 或 US'
        if (filter && filter.expression != null) exprInput.value = filter.expression
        const rmBtn = document.createElement('button')
        rmBtn.type = 'button'
        rmBtn.textContent = '删除'
        rmBtn.addEventListener('click', function() { row.remove() })
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
        const expression = row.querySelector('.filter-expression').value
        if (expression !== '') filters.push({
            dimension: row.querySelector('.filter-dimension').value,
            operator: row.querySelector('.filter-operator').value,
            expression: expression
        })
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
        const rmBtn = document.createElement('button')
        rmBtn.type = 'button'
        rmBtn.textContent = '删除'
        rmBtn.addEventListener('click', function() { row.remove() })
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
    const site = cachedSites.find(function(s) { return s.siteUrl === basic.siteUrl })
    const adv = readAdvancedParams()
    preview.innerHTML = ''
    preview.appendChild(el('div', { className: 'preview-title', text: '本期（预览）' }))
    const rows = [
        ['站点', site ? siteDisplayName(site) : (basic.siteUrl || '—')],
        ['数据状态', basic.dataState || 'final'],
        ['周期', basic.startDate + ' ~ ' + basic.endDate],
        ['维度', (basic.dimensions || []).map(function(d) { return DIMENSION_LABELS[d] || d }).join('、') || '（全部）'],
        ['最大行数', basic.rowLimit || 1000],
    ]
    if (adv.searchType && adv.searchType !== 'web') rows.push(['搜索类型', adv.searchType])
    if (adv.filters && adv.filters.length) {
        rows.push(['维度筛选', adv.filters.map(function(f) {
            return f.dimension + ' ' + f.operator + ' "' + f.expression + '"'
        }).join(', ')])
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
        ;(row.keys || []).forEach(function(k, i) { tr.appendChild(el('td', { text: formatKey(dimensions[i], k) })) })
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
            const td = el('td', { text: formatKey(dimensions[i], k) })
            if (i === 0 && isNew) td.appendChild(el('span', { className: 'new-row-badge', text: '新' }))
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

async function init() {
    initTabs()
    renderSitesTab()
    renderQueryTab()
    try {
        await loadCachedSites()
        renderSitesConfigTable()
        const basicEl = document.getElementById('basic-params')
        if (basicEl) basicEl.replaceWith(buildBasicParams(null))
        const siteUrl = readSiteUrl()
        if (siteUrl) onSiteChange(siteUrl)
    } catch (e) {
        console.error('Failed to load cached sites:', e)
    }
    loadPresets()
}

init()
