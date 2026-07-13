import { DELTA_FILTER_OPTIONS, METRIC_OPERATORS } from '../constants.js'

export function buildDeltaFiltersEditor(currentFilters) {
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
