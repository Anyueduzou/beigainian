export const DAY_MS = 24 * 60 * 60 * 1000

/** 当天 00:00:00 的时间戳 */
export function startOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/** 把时间戳转成 '2026-11-11' 这种按天可比较的字符串 */
export function dayKey(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 连续打卡天数：
 * - 今天有复习记录，从今天往前数；
 * - 今天还没复习，但昨天有，从昨天往前数（当天不算断签）；
 * - 昨天也没有，返回 0。
 * 用 setDate 逐天回退，避免夏令时/时区导致的偏移。
 */
export function calcStreak(timestamps: number[], now: number = Date.now()): number {
  if (timestamps.length === 0) return 0

  const reviewedDays = new Set(timestamps.map(dayKey))
  let cursor = new Date(startOfDay(now))

  if (!reviewedDays.has(dayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!reviewedDays.has(dayKey(cursor.getTime()))) return 0
  }

  let streak = 0
  while (reviewedDays.has(dayKey(cursor.getTime()))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}