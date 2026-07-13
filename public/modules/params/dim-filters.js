import { DIMENSION_LABELS, FILTER_OPERATORS } from '../constants.js'
import { normalizeCountryExpression, ensureCountryDatalist } from '../country.js'

export function buildDimFiltersEditor(currentFilters) {
    const container = document.createElement('div')
    const rows = document.createElement('div'); rows.className = 'filter-rows-container'
    container.appendChild(rows)
    function updateJoinVisibility() {
        Array.from(rows.querySelectorAll('.filter-row')).forEach(function(r, i) {
            const js = r.querySelector('.filter-join-sel')
            if (js) js.style.visibility = i === 0 ? 'hidden' : ''
        })
    }
    function addRow(f) {
        const row = document.createElement('div'); row.className = 'filter-row'
        const joinSel = document.createElement('select'); joinSel.className = 'filter-join-sel'
        ;[['and', 'AND'], ['or', 'OR']].forEach(function(p) {
            const opt = document.createElement('option'); opt.value = p[0]; opt.textContent = p[1]; joinSel.appendChild(opt)
        })
        joinSel.value = (f && f.joinOp) ? f.joinOp : 'and'
        const dimSel = document.createElement('select'); dimSel.className = 'filter-dim-sel'
        ;['query', 'page', 'country', 'device', 'date', 'searchAppearance'].forEach(function(d) {
            const opt = document.createElement('option'); opt.value = d; opt.textContent = DIMENSION_LABELS[d] || d; dimSel.appendChild(opt)
        })
        if (f) dimSel.value = f.dimension
        const opSel = document.createElement('select'); opSel.className = 'filter-op-sel'
        ;['equals', 'notEquals', 'contains', 'notContains', 'includingRegex', 'excludingRegex'].forEach(function(op) {
            const opt = document.createElement('option'); opt.value = op; opt.textContent = op; opSel.appendChild(opt)
        })
        if (f) opSel.value = f.operator
        const exprIn = document.createElement('input'); exprIn.type = 'text'; exprIn.className = 'filter-expression'; exprIn.placeholder = '筛选值'
        if (f) exprIn.value = f.expression || ''
        function applyDimMode(dim) {
            if (dim === 'country') {
                ensureCountryDatalist()
                exprIn.setAttribute('list', 'country-datalist')
                exprIn.placeholder = '输入国家名或代码'
            } else {
                exprIn.removeAttribute('list')
                exprIn.placeholder = '筛选值'
            }
        }
        applyDimMode(dimSel.value)
        dimSel.addEventListener('change', function() { applyDimMode(dimSel.value) })
        const rm = document.createElement('button'); rm.type = 'button'; rm.textContent = '删除'
        rm.addEventListener('click', function() { row.remove(); updateJoinVisibility() })
        row.appendChild(joinSel); row.appendChild(dimSel); row.appendChild(opSel); row.appendChild(exprIn); row.appendChild(rm)
        rows.appendChild(row)
        updateJoinVisibility()
    }
    const addBtn = document.createElement('button'); addBtn.type = 'button'; addBtn.textContent = '+ 添加维度筛选'
    addBtn.addEventListener('click', function() { addRow() })
    container.appendChild(addBtn)
    ;(currentFilters || []).forEach(addRow)
    return {
        el: container,
        read: function() {
            return Array.from(rows.querySelectorAll('.filter-row')).map(function(row, i) {
                const joinSel = row.querySelector('.filter-join-sel')
                const dimSel = row.querySelector('.filter-dim-sel')
                const opSel = row.querySelector('.filter-op-sel')
                const dim = dimSel.value
                let expression = row.querySelector('.filter-expression').value
                if (dim === 'country' && expression) expression = normalizeCountryExpression(expression)
                return { joinOp: i === 0 ? 'and' : joinSel.value, dimension: dim, operator: opSel.value, expression: expression }
            }).filter(function(f) { return f.expression })
        }
    }
}

export function filtersToFilterGroups(filters) {
    if (!filters || !filters.length) return []
    const groups = [[]]
    filters.forEach(function(f, i) {
        if (i > 0 && f.joinOp === 'or') groups.push([])
        groups[groups.length - 1].push({ dimension: f.dimension, operator: f.operator, expression: f.expression })
    })
    return groups.map(function(g) { return { groupType: 'and', filters: g } })
}

export function mergeFilterGroups(globalGroups, groupGroups) {
    if (!globalGroups.length) return groupGroups
    if (!groupGroups.length) return globalGroups
    const result = []
    globalGroups.forEach(function(gGrp) {
        groupGroups.forEach(function(grpGrp) {
            const groupDims = new Set(grpGrp.filters.map(function(f) { return f.dimension }))
            const inherited = gGrp.filters.filter(function(f) { return !groupDims.has(f.dimension) })
            result.push({ groupType: 'and', filters: inherited.concat(grpGrp.filters) })
        })
    })
    return result
}

export function buildEffectiveFilters(globalFilters, groupFilters) {
    const globalGroups = filtersToFilterGroups(globalFilters || [])
    const groupGroups = filtersToFilterGroups(groupFilters || [])
    const merged = mergeFilterGroups(globalGroups, groupGroups)
    if (!merged.length) return { filters: [] }
    if (merged.length === 1) return { filters: merged[0].filters }
    return { dimensionFilterGroups: merged }
}
