import { DIMENSION_OPTIONS, DIMENSION_LABELS } from './constants.js'

export function el(tag, opts) {
    opts = opts || {}
    const node = document.createElement(tag)
    if (opts.className) node.className = opts.className
    if (opts.text != null) node.textContent = opts.text
    if (opts.id) node.id = opts.id
    return node
}

export function mkField(labelText, content) {
    const wrapper = document.createElement('label')
    wrapper.className = 'field'
    const span = document.createElement('span')
    span.textContent = labelText
    wrapper.appendChild(span)
    wrapper.appendChild(content)
    return wrapper
}

export function formatMetricValue(metric, value) {
    if (value == null) return '—'
    if (metric === 'ctr') return (value * 100).toFixed(2) + '%'
    if (metric === 'position') return value.toFixed(1)
    return String(value)
}

export function isImproved(metric, delta) { return metric === 'position' ? delta < 0 : delta > 0 }

export function formatDelta(metric, delta) {
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

export function deltaClass(metric, delta) {
    if (!delta) return 'neutral'
    return isImproved(metric, delta) ? 'positive' : 'negative'
}

export function siteDisplayName(site) {
    return site.alias ? (site.alias + '（' + site.siteUrl + '）') : site.siteUrl
}

export function buildSelectWithCustom(o) {
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

export function readSelectWithCustom(idPrefix) {
    const select = document.getElementById('field-' + idPrefix + '-select')
    if (!select) return ''
    if (select.value === '__custom__') {
        const c = document.getElementById('field-' + idPrefix + '-custom')
        return c ? c.value : ''
    }
    return select.value
}

export function buildDimensionsCheckboxes(currentValues, onChange) {
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
        if (onChange) input.addEventListener('change', onChange)
        label.appendChild(input)
        label.appendChild(document.createTextNode(DIMENSION_LABELS[dim] || dim))
        container.appendChild(label)
    })
    return container
}

export function readDimensions() {
    return Array.from(document.querySelectorAll('.dimension-checkbox:checked')).map(function(e) { return e.value })
}
