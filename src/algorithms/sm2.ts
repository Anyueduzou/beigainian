import type { Rating } from '../db/types'

export const MIN_EASE = 1.3
export const MAX_EASE = 3.0
export const MAX_INTERVAL_DAYS = 365
export const MS_PER_DAY = 24 * 60 * 60 * 1000

/** 算法只依赖这 4 个数字，不依赖数据库 */
export interface Sm2State {
  interval: number
  easeFactor: number
  repetitions: number
  lapses: number
}

export interface Sm2Result extends Sm2State {
  dueAt: number
  lastReviewedAt: number
}

/** 三档自评对应的 SM-2 质量分 */
const QUALITY: Record<Rating, number> = { 1: 1, 2: 3, 3: 5 }

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** 按 SM-2 原公式更新难度系数，并限制在 1.3 ~ 3.0 */
export function nextEaseFactor(current: number, rating: Rating): number {
  const q = QUALITY[rating]
  const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)
  return clamp(round2(current + delta), MIN_EASE, MAX_EASE)
}

/**
 * 核心调度函数：给当前状态和本次自评，算出下一次复习安排。
 * 纯函数，不改入参，不发请求，不读写数据库，方便测试和复用。
 */
export function schedule(
  state: Sm2State,
  rating: Rating,
  now: number = Date.now(),
): Sm2Result {
  const easeFactor = nextEaseFactor(state.easeFactor, rating)
  let repetitions = state.repetitions
  let lapses = state.lapses
  let interval: number

  if (rating === 1) {
    // 忘记：连对清零，明天必须重来
    repetitions = 0
    lapses += 1
    interval = 1
  } else if (rating === 2) {
    // 模糊：不清零也不算连对，间隔小幅延长，避免原地反复
    interval =
      state.repetitions === 0
        ? 1
        : Math.max(1, Math.round(state.interval * 1.2))
  } else {
    // 记住：连对 +1，按 SM-2 阶梯推进
    repetitions += 1
    if (repetitions === 1) {
      interval = 1
    } else if (repetitions === 2) {
      interval = 6
    } else {
      interval = Math.max(1, Math.round(state.interval * easeFactor))
    }
  }

  interval = clamp(interval, 1, MAX_INTERVAL_DAYS)

  return {
    interval,
    easeFactor,
    repetitions,
    lapses,
    dueAt: now + interval * MS_PER_DAY,
    lastReviewedAt: now,
  }
}

/* ---------------- 自检（纯数据，不需要测试框架） ---------------- */

interface SelfCheckCase {
  name: string
  state: Sm2State
  rating: Rating
  expected: Sm2State & { interval: number }
}

const SELF_CHECK_CASES: SelfCheckCase[] = [
  {
    name: '新卡 + 记住',
    state: { interval: 0, easeFactor: 2.5, repetitions: 0, lapses: 0 },
    rating: 3,
    expected: { interval: 1, easeFactor: 2.6, repetitions: 1, lapses: 0 },
  },
  {
    name: '连对第 2 次 + 记住',
    state: { interval: 1, easeFactor: 2.6, repetitions: 1, lapses: 0 },
    rating: 3,
    expected: { interval: 6, easeFactor: 2.7, repetitions: 2, lapses: 0 },
  },
  {
    name: '连对第 3 次 + 记住',
    state: { interval: 6, easeFactor: 2.7, repetitions: 2, lapses: 0 },
    rating: 3,
    expected: { interval: 17, easeFactor: 2.8, repetitions: 3, lapses: 0 },
  },
  {
    name: '成熟卡 + 模糊',
    state: { interval: 10, easeFactor: 2.5, repetitions: 3, lapses: 0 },
    rating: 2,
    expected: { interval: 12, easeFactor: 2.36, repetitions: 3, lapses: 0 },
  },
  {
    name: '成熟卡 + 忘记',
    state: { interval: 10, easeFactor: 2.5, repetitions: 3, lapses: 0 },
    rating: 1,
    expected: { interval: 1, easeFactor: 1.96, repetitions: 0, lapses: 1 },
  },
  {
    name: 'EF 触底不低于 1.3',
    state: { interval: 3, easeFactor: 1.4, repetitions: 2, lapses: 5 },
    rating: 1,
    expected: { interval: 1, easeFactor: 1.3, repetitions: 0, lapses: 6 },
  },
  {
    name: '间隔上限封顶 365 天',
    state: { interval: 300, easeFactor: 3.0, repetitions: 5, lapses: 0 },
    rating: 3,
    expected: { interval: 365, easeFactor: 3.0, repetitions: 6, lapses: 0 },
  },
]

export interface SelfCheckResult {
  name: string
  pass: boolean
  detail: string
}

/** 跑一遍内置用例，返回逐条结果。界面点按钮就能看到 */
export function runSm2SelfCheck(): SelfCheckResult[] {
  const now = Date.now()

  return SELF_CHECK_CASES.map((item) => {
    const result = schedule(item.state, item.rating, now)
    const pass =
      result.interval === item.expected.interval &&
      result.easeFactor === item.expected.easeFactor &&
      result.repetitions === item.expected.repetitions &&
      result.lapses === item.expected.lapses &&
      result.dueAt === now + item.expected.interval * MS_PER_DAY

    return {
      name: item.name,
      pass,
      detail:
        `间隔 ${result.interval} 天 / EF ${result.easeFactor}` +
        ` / 连对 ${result.repetitions} / 遗忘 ${result.lapses}` +
        ` ｜ 期望 间隔 ${item.expected.interval} 天 / EF ${item.expected.easeFactor}`,
    }
  })
}