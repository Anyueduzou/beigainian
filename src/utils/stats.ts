import { db } from '../db'
import { dayKey, startOfDay } from './date'

export interface DayCount {
  key: string
  label: string
  count: number
}

export interface TagMastery {
  tag: string
  total: number
  mastered: number
  learning: number
  fresh: number
  percent: number
}

export interface WeakCard {
  id?: number
  term: string
  lapses: number
}

export interface StatsData {
  totalCards: number
  totalLogs: number
  todayCount: number
  weekTotal: number
  days: DayCount[]
  tags: TagMastery[]
  weakCards: WeakCard[]
}

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六']

/** 掌握度口径：连续记住 >= 3 次算已掌握；1~2 次算学习中；0 次算新卡 */
export function masteryBucket(repetitions: number): 'mastered' | 'learning' | 'fresh' {
  if (repetitions >= 3) return 'mastered'
  if (repetitions >= 1) return 'learning'
  return 'fresh'
}

export async function loadStats(now: number = Date.now()): Promise<StatsData> {
  const [cards, logs] = await Promise.all([db.cards.toArray(), db.reviewLogs.toArray()])

  // 按天统计复习次数
  const perDay = new Map<string, number>()
  logs.forEach((log) => {
    const key = dayKey(log.reviewedAt)
    perDay.set(key, (perDay.get(key) ?? 0) + 1)
  })

  // 近 7 天（含今天），最后一天固定是今天
  const today = startOfDay(now)
  const days: DayCount[] = []
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setDate(date.getDate() - offset)
    const key = dayKey(date.getTime())
    days.push({
      key,
      label: offset === 0 ? '今' : WEEKDAY[date.getDay()],
      count: perDay.get(key) ?? 0,
    })
  }
  const weekTotal = days.reduce((sum, day) => sum + day.count, 0)

  // 按标签汇总掌握度；没有标签的卡片归入「未分类」
  const tagMap = new Map<string, TagMastery>()
  cards.forEach((card) => {
    const tags = card.tags.length > 0 ? card.tags : ['未分类']
    const bucket = masteryBucket(card.repetitions)
    tags.forEach((tag) => {
      const entry = tagMap.get(tag) ?? {
        tag,
        total: 0,
        mastered: 0,
        learning: 0,
        fresh: 0,
        percent: 0,
      }
      entry.total += 1
      entry[bucket] += 1
      tagMap.set(tag, entry)
    })
  })

  const tags = Array.from(tagMap.values())
    .map((entry) => ({
      ...entry,
      percent: entry.total > 0 ? Math.round((entry.mastered / entry.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)

  // 遗忘最多的卡片（lapses 来自「忘记」次数）
  const weakCards = cards
    .filter((card) => card.lapses > 0)
    .sort((a, b) => b.lapses - a.lapses)
    .slice(0, 5)
    .map((card) => ({ id: card.id, term: card.term, lapses: card.lapses }))

  return {
    totalCards: cards.length,
    totalLogs: logs.length,
    todayCount: perDay.get(dayKey(now)) ?? 0,
    weekTotal,
    days,
    tags,
    weakCards,
  }
}