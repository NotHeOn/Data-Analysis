export function dateRangeFromShortcut(days, dataState) {
    const lagDays = dataState === 'final' ? 3 : 1
    const end = new Date()
    end.setDate(end.getDate() - lagDays)
    const start = new Date(end)
    start.setDate(end.getDate() - (days - 1))
    const fmt = function(d) { return d.toISOString().slice(0, 10) }
    return { startDate: fmt(start), endDate: fmt(end) }
}

export function computePreviousPeriod(startDate, endDate) {
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
