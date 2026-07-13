import { renderSitesTab, loadCachedSites, renderSitesConfigTable, setOnSiteDataChanged } from './modules/tab-sites.js'
import { renderQueryTab, buildBasicParams, readBasicParams, readSiteUrl, onSiteChange, loadPresets } from './modules/tab-query.js'
import { renderAnalysisTab, loadAnalysisPlans, refreshAnalysisSiteSelect } from './modules/tab-analysis.js'

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

setOnSiteDataChanged(function() {
    const basicEl = document.getElementById('basic-params')
    if (basicEl) basicEl.replaceWith(buildBasicParams(readBasicParams()))
    refreshAnalysisSiteSelect()
})

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
        refreshAnalysisSiteSelect()
    } catch (e) {
        console.error('Failed to load cached sites:', e)
    }
    loadPresets()
    loadAnalysisPlans()
}

init()

;(function() {
    var token = null
    var es = new EventSource('/api/livereload')
    es.addEventListener('init', function(e) {
        if (token !== null && e.data !== token) { location.reload(); return }
        token = e.data
    })
    es.addEventListener('reload', function() { location.reload() })
})()
