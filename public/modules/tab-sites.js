import { el, siteDisplayName } from './utils.js'
import { state } from './state.js'

let _onSiteDataChanged = null
export function setOnSiteDataChanged(fn) { _onSiteDataChanged = fn }

export async function loadCachedSites() {
    const res = await fetch('/api/sites')
    const data = await res.json()
    state.cachedSites = data.sites || []
}

export async function refreshSites() {
    const btn = document.getElementById('refresh-sites-btn')
    const status = document.getElementById('sites-status')
    btn.disabled = true
    status.textContent = '刷新中...'
    try {
        const res = await fetch('/api/sites/refresh', { method: 'POST' })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        state.cachedSites = data.sites || []
        status.textContent = '已缓存 ' + state.cachedSites.length + ' 个站点'
        renderSitesConfigTable()
        if (_onSiteDataChanged) _onSiteDataChanged()
    } catch (e) {
        status.textContent = '刷新失败: ' + e.message
    } finally {
        btn.disabled = false
    }
}

export async function saveSiteConfig(siteUrl, patch) {
    await fetch('/api/sites/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ siteUrl: siteUrl }, patch))
    })
    const site = state.cachedSites.find(function(s) { return s.siteUrl === siteUrl })
    if (site) Object.assign(site, patch)
    const selectEl = document.getElementById('field-siteUrl-select')
    if (selectEl) {
        for (let i = 0; i < selectEl.options.length; i++) {
            const s = state.cachedSites.find(function(cs) { return cs.siteUrl === selectEl.options[i].value })
            if (s) selectEl.options[i].textContent = siteDisplayName(s)
        }
    }
}

export function renderSitesConfigTable() {
    const container = document.getElementById('sites-config-container')
    if (!container) return
    container.innerHTML = ''
    if (!state.cachedSites.length) {
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
    state.cachedSites.forEach(function(site) {
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
            if (_onSiteDataChanged) _onSiteDataChanged()
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

export function renderSitesTab() {
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
    status.textContent = state.cachedSites.length ? ('已缓存 ' + state.cachedSites.length + ' 个站点') : '尚未获取站点列表'
    topRow.appendChild(refreshBtn)
    topRow.appendChild(status)
    section.appendChild(topRow)
    section.appendChild(el('div', { id: 'sites-config-container' }))
    container.appendChild(section)
    renderSitesConfigTable()
}
