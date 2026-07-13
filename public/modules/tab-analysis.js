import { DIMENSION_LABELS, METRIC_OPTIONS, METRIC_LABELS, DATE_SHORTCUTS } from './constants.js'
import { state } from './state.js'
import { el, siteDisplayName } from './utils.js'
import { dateRangeFromShortcut } from './dates.js'
import { buildDimFiltersEditor, buildEffectiveFilters } from './params/dim-filters.js'
import { buildMetricFiltersEditor } from './params/metric-filters.js'
import { buildDeltaFiltersEditor } from './params/delta-filters.js'
import { renderCompareTable } from './compare-table.js'

export async function loadAnalysisPlans() {
    const data = await fetch('/api/analysis-plans').then(function(r) { return r.json() })
    state.cachedPlans = data.plans || []
    renderAnalysisPlanSection()
}

export async function saveAnalysisPlan(plan, isNew) {
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

export function refreshAnalysisSiteSelect() {
    const analysisSiteEl = document.getElementById('analysis-site-url')
    if (!analysisSiteEl) return
    const nonBlacklisted = state.cachedSites.filter(function(s) { return !s.blacklisted })
    analysisSiteEl.innerHTML = ''
    nonBlacklisted.forEach(function(s) {
        const opt = document.createElement('option')
        opt.value = s.siteUrl
        opt.textContent = siteDisplayName(s)
        analysisSiteEl.appendChild(opt)
    })
}

export function buildAnalysisBasicParams() {
    const wrap = document.createElement('div')

    const siteField = document.createElement('div')
    siteField.className = 'field'
    siteField.appendChild(el('span', { text: '站点' }))
    const siteSelect = document.createElement('select')
    siteSelect.id = 'analysis-site-url'
    const nonBlacklisted = state.cachedSites.filter(function(s) { return !s.blacklisted })
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

    const gfDetails = document.createElement('details')
    gfDetails.className = 'analysis-global-filters-details'
    const gfSummary = document.createElement('summary')
    gfSummary.className = 'analysis-global-filters-summary'
    gfSummary.textContent = '全局维度筛选（对所有分组生效）'
    gfDetails.appendChild(gfSummary)
    state.globalFiltersEditor = buildDimFiltersEditor([])
    gfDetails.appendChild(state.globalFiltersEditor.el)
    wrap.appendChild(gfDetails)

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

export function renderAnalysisTab() {
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

    if (!state.cachedPlans.length) {
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
    state.cachedPlans.forEach(function(p) {
        const opt = document.createElement('option'); opt.value = p.id; opt.textContent = p.name
        planSel.appendChild(opt)
    })
    const editBtn = document.createElement('button')
    editBtn.type = 'button'; editBtn.textContent = '编辑方案'
    editBtn.addEventListener('click', function() {
        const plan = state.cachedPlans.find(function(p) { return p.id === planSel.value })
        if (plan) openPlanModal(plan)
    })
    const newBtn = document.createElement('button')
    newBtn.type = 'button'; newBtn.textContent = '新建方案'
    newBtn.addEventListener('click', function() { openPlanModal(null) })
    const copyBtn = document.createElement('button')
    copyBtn.type = 'button'; copyBtn.textContent = '复制方案'
    copyBtn.addEventListener('click', function() {
        const plan = state.cachedPlans.find(function(p) { return p.id === planSel.value })
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
        const plan = state.cachedPlans.find(function(p) { return p.id === planSel.value })
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
    const plan = state.cachedPlans.find(function(p) { return p.id === planSel.value })
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
    const globalFilters = state.globalFiltersEditor ? state.globalFiltersEditor.read() : []
    if (!basic.siteUrl) { alert('请先选择站点'); return }
    if (!basic.startDate || !basic.endDate) { alert('请先设置日期范围'); return }

    const planSel = document.getElementById('analysis-plan-select')
    const plan = state.cachedPlans.find(function(p) { return p.id === (planSel && planSel.value) })
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
                ...buildEffectiveFilters(globalFilters, group.filters || []),
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
                renderCompareTable(bodyEl, data.result, group.dimensions || ['query'], params)
            }
        } catch (e) {
            loadingEl.textContent = '查询失败: ' + e.message
        }
    }

    if (runBtn) { runBtn.disabled = false; runBtn.textContent = '执行分析' }
}

function openPlanModal(plan, saveAsNew) {
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

    let dragSrc = null
    groupsWrap.addEventListener('dragstart', function(e) {
        dragSrc = e.target.closest('.plan-group-accordion')
        if (!dragSrc) return
        e.dataTransfer.effectAllowed = 'move'
        setTimeout(function() { if (dragSrc) dragSrc.classList.add('dragging') }, 0)
    })
    groupsWrap.addEventListener('dragover', function(e) {
        e.preventDefault()
        if (!dragSrc) return
        const target = e.target.closest('.plan-group-accordion')
        if (!target || target === dragSrc) return
        const rect = target.getBoundingClientRect()
        if (e.clientY < rect.top + rect.height / 2) {
            groupsWrap.insertBefore(dragSrc, target)
        } else {
            groupsWrap.insertBefore(dragSrc, target.nextSibling)
        }
    })
    groupsWrap.addEventListener('dragend', function() {
        if (dragSrc) { dragSrc.classList.remove('dragging'); dragSrc.draggable = false }
        dragSrc = null
    })

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
        const groups = Array.from(groupsWrap.children).map(function(child) {
            const editor = groupEditors.find(function(e) { return e.el === child })
            return editor ? editor.read() : null
        }).filter(Boolean)
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
    const card = document.createElement('div')
    card.className = 'plan-group-accordion'

    const header = document.createElement('div')
    header.className = 'plan-group-summary'

    const dragHandle = document.createElement('span')
    dragHandle.className = 'plan-group-drag-handle'; dragHandle.title = '拖动排序'
    dragHandle.innerHTML = '<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><circle cx="3" cy="2" r="1.2"/><circle cx="7" cy="2" r="1.2"/><circle cx="3" cy="6" r="1.2"/><circle cx="7" cy="6" r="1.2"/><circle cx="3" cy="10" r="1.2"/><circle cx="7" cy="10" r="1.2"/></svg>'
    dragHandle.addEventListener('mousedown', function() { card.draggable = true })
    dragHandle.addEventListener('click', function(e) { e.stopPropagation() })

    const nameSpan = document.createElement('span')
    nameSpan.className = 'plan-group-name-span'; nameSpan.textContent = group.name || '未命名分组'

    const nameInput = document.createElement('input')
    nameInput.type = 'text'; nameInput.className = 'plan-group-name-input'; nameInput.style.display = 'none'
    nameInput.value = group.name || ''; nameInput.placeholder = '分组名称'
    nameInput.addEventListener('keydown', function(e) {
        e.stopPropagation()
        if (e.key === 'Enter' || e.key === 'Escape') nameInput.blur()
    })
    nameInput.addEventListener('blur', function() {
        const val = nameInput.value.trim() || nameSpan.textContent
        nameInput.value = val; nameSpan.textContent = val
    })

    const editIconBtn = document.createElement('button')
    editIconBtn.type = 'button'; editIconBtn.className = 'plan-group-edit-btn'; editIconBtn.title = '展开编辑'
    editIconBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 1.5 L9.5 3.5 L4 9 L1.5 9.5 L2 7 Z"/><line x1="6.5" y1="2.5" x2="8.5" y2="4.5"/></svg>'

    let isOpen = false
    function setOpen(open) {
        isOpen = open
        card.classList.toggle('is-open', open)
        if (open) {
            nameSpan.style.display = 'none'; nameInput.style.display = ''
            requestAnimationFrame(function() { nameInput.select() })
        } else {
            const val = nameInput.value.trim() || nameSpan.textContent
            nameSpan.textContent = val; nameInput.value = val
            nameSpan.style.display = ''; nameInput.style.display = 'none'
        }
    }
    editIconBtn.addEventListener('click', function(e) { e.stopPropagation(); setOpen(!isOpen) })

    header.appendChild(dragHandle); header.appendChild(nameSpan); header.appendChild(nameInput); header.appendChild(editIconBtn)
    card.appendChild(header)

    const bodyWrap = document.createElement('div'); bodyWrap.className = 'plan-group-body-wrap'
    const body = document.createElement('div'); body.className = 'plan-group-body'
    bodyWrap.appendChild(body)

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

    body.appendChild(el('div', { className: 'plan-group-section-label', text: '维度筛选' }))
    body.appendChild(el('div', { className: 'field-hint', text: '多行条件支持 AND/OR；全局筛选同维度被分组覆盖，不同维度叠加' }))
    const fe = buildDimFiltersEditor(group.filters || []); body.appendChild(fe.el)
    body.appendChild(el('div', { className: 'plan-group-section-label', text: '当期指标筛选' }))
    const mfe = buildMetricFiltersEditor(group.metricFilters || []); body.appendChild(mfe.el)
    body.appendChild(el('div', { className: 'plan-group-section-label', text: '上期指标筛选' }))
    const pmfe = buildMetricFiltersEditor(group.previousMetricFilters || []); body.appendChild(pmfe.el)
    body.appendChild(el('div', { className: 'plan-group-section-label', text: '变化筛选' }))
    const dfe = buildDeltaFiltersEditor(group.deltaFilters || []); body.appendChild(dfe.el)

    const groupFooter = document.createElement('div'); groupFooter.className = 'plan-group-body-footer'
    const removeBtn = document.createElement('button')
    removeBtn.type = 'button'; removeBtn.className = 'btn-danger-sm'; removeBtn.textContent = '删除分组'
    removeBtn.addEventListener('click', function() {
        if (confirm('删除分组"' + nameSpan.textContent + '"？')) card.remove()
    })
    const doneBtn = document.createElement('button')
    doneBtn.type = 'button'; doneBtn.className = 'btn-primary'; doneBtn.textContent = '保存'
    doneBtn.addEventListener('click', function() { setOpen(false) })
    groupFooter.appendChild(removeBtn); groupFooter.appendChild(doneBtn)
    body.appendChild(groupFooter)

    card.appendChild(bodyWrap)

    return {
        el: card,
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
