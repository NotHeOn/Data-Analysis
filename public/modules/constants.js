export const DIMENSION_OPTIONS = ['query', 'page', 'country', 'device', 'date', 'searchAppearance']
export const FILTER_OPERATORS = ['equals', 'notEquals', 'contains', 'notContains', 'includingRegex', 'excludingRegex']
export const ROWLIMIT_PRESETS = [10, 25, 50, 100, 250, 500, 1000, 2000, 5000]
export const STARTROW_PRESETS = [0, 25, 50, 100, 250, 500, 1000]
export const METRIC_OPTIONS = ['clicks', 'impressions', 'ctr', 'position']
export const METRIC_OPERATORS = ['>', '>=', '<', '<=', '=', '!=']
export const DELTA_FILTER_OPTIONS = [
    { value: 'clicks_absolute',      label: '点击变化量',   metric: 'clicks',      mode: 'absolute' },
    { value: 'impressions_absolute', label: '展现变化量',   metric: 'impressions', mode: 'absolute' },
    { value: 'ctr_absolute',         label: '点击率变化量', metric: 'ctr',         mode: 'absolute' },
    { value: 'position_absolute',    label: '排名变化量',   metric: 'position',    mode: 'absolute' },
    { value: 'clicks_relative',      label: '点击变化率',   metric: 'clicks',      mode: 'relative' },
    { value: 'impressions_relative', label: '展现变化率',   metric: 'impressions', mode: 'relative' },
    { value: 'ctr_relative',         label: '点击率变化率', metric: 'ctr',         mode: 'relative' },
    { value: 'position_relative',    label: '排名变化率',   metric: 'position',    mode: 'relative' },
]
export const DATE_SHORTCUTS = [
    { label: '近3天',  days: 3  },
    { label: '近7天',  days: 7  },
    { label: '近14天', days: 14 },
    { label: '近28天', days: 28 },
    { label: '近90天', days: 90 },
]
export const DIMENSION_LABELS = {
    query: '搜索词', page: '页面', country: '国家', device: '设备', date: '日期', searchAppearance: '搜索样式'
}
export const METRIC_LABELS = { clicks: '点击', impressions: '展现', ctr: '点击率', position: '排名' }
