/** 自评分数：1 忘记 / 2 模糊 / 3 记住 */
export type Rating = 1 | 2 | 3

/** 复习模式：self=看答案自评；typing=输入答案后自评 */
export type ReviewMode = 'self' | 'typing'

/** 难度：1 最易 ~ 5 最难 */
export type Difficulty = 1 | 2 | 3 | 4 | 5

/** 用户填写卡片时的字段（不含系统生成字段） */
export interface CardDraft {
  term: string          // 概念名
  answer: string        // 标准答案
  keyPoints: string[]   // 要点清单（输入答案模式做覆盖检查用）
  explanation: string   // 解释
  example: string       // 例子
  tags: string[]        // 标签
  difficulty: Difficulty
  source: string        // 来源
}

/** 数据库里的完整卡片 */
export interface Card extends CardDraft {
  id?: number           // 自增主键，新增前不存在
  createdAt: number
  updatedAt: number
  // 下面的调度字段由第 9 步的算法维护
  dueAt: number         // 下次复习时间戳（毫秒）
  interval: number      // 当前间隔（天）
  easeFactor: number    // 难度系数，初始 2.5
  repetitions: number   // 连续答对次数
  lapses: number        // 累计遗忘次数
  lastReviewedAt: number | null
}

/** 每次复习写一条，用于统计和回溯 */
export interface ReviewLog {
  id?: number
  cardId: number
  reviewedAt: number
  rating: Rating
  mode: ReviewMode
  prevInterval: number
  nextInterval: number
  prevDueAt: number
  nextDueAt: number
  coverage?: number        // 仅 typing 模式：要点覆盖率 0~1
  missedPoints?: string[]  // 仅 typing 模式：未覆盖的要点
}

/** 全局设置，永远只有 id=1 这唯一一条 */
export interface Settings {
  id: number
  dailyGoal: number
  defaultMode: ReviewMode
  createdAt: number
  updatedAt: number
}