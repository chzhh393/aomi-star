// 候选人状态映射
export const STATUS_MAP = {
  pending: { label: '待审核', type: 'warning' },
  approved: { label: '已审核，待面试安排', type: 'success' },
  rejected: { label: '未通过', type: 'danger' },
  interview_scheduled: { label: '已安排面试', type: 'primary' },
  signed: { label: '已签约', type: 'success' }
}

// 格式化日期
export function formatDate(date) {
  if (!date) return '-'
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}
