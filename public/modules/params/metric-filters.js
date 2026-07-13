import { METRIC_OPTIONS, METRIC_LABELS, METRIC_OPERATORS } from '../constants.js'

export function buildMetricFiltersEditor(currentFilters) {
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
