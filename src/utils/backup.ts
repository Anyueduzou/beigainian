import { db } from '../db'
import type { Card, Difficulty, Rating, ReviewLog, ReviewMode, Settings } from '../db/types'
import { dayKey } from './date'

const APP_ID = 'beigainian'
const BACKUP_VERSION = 1

export interface BackupPayload {
  app: string
  version: number
  exportedAt: number
  cards: Card[]
  reviewLogs: ReviewLog[]
  settings: Settings
}

export interface ImportSummary {
  cards: number
  reviewLogs: number
}

/** 触发浏览器下载 */
export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function buildBackup(): Promise<BackupPayload> {
  const [cards, reviewLogs, settings] = await Promise.all([
    db.cards.toArray(),
    db.reviewLogs.toArray(),
    db.settings.get(1),
  ])
  const now = Date.now()

  return {
    app: APP_ID,
    version: BACKUP_VERSION,
    exportedAt: now,
    cards,
    reviewLogs,
    settings:
      settings ?? {
        id: 1,
        dailyGoal: 20,
        defaultMode: 'self',
        createdAt: now,
        updatedAt: now,
      },
  }
}

export function downloadJson(payload: BackupPayload): void {
  downloadFile(
    `beigainian-${dayKey(Date.now())}.json`,
    JSON.stringify(payload, null, 2),
    'application/json;charset=utf-8',
  )
}

/* ---------------- CSV 导出（给 Excel 看，不支持导入） ---------------- */

const CSV_HEADER = [
  '概念名',
  '标准答案',
  '要点清单',
  '解释',
  '例子',
  '标签',
  '难度',
  '来源',
  '复习间隔(天)',
  '下次复习',
  '连续记住',
  '遗忘次数',
  '创建时间',
]

function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatTime(timestamp: number | null): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

export async function exportCsv(): Promise<number> {
  const cards = await db.cards.toArray()
  const now = Date.now()

  const rows = cards.map((card) => [
    card.term,
    card.answer,
    card.keyPoints.join(' | '),
    card.explanation,
    card.example,
    card.tags.join(' | '),
    String(card.difficulty),
    card.source,
    String(card.interval),
    formatTime(card.dueAt),
    String(card.repetitions),
    String(card.lapses),
    formatTime(card.createdAt),
  ])

  const content =
    '\uFEFF' +
    [CSV_HEADER, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')

  downloadFile(
    `beigainian-${dayKey(now)}.csv`,
    content,
    'text/csv;charset=utf-8',
  )
  return cards.length
}

/* ---------------- 导入（覆盖式） ---------------- */

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function asDifficulty(value: unknown): Difficulty {
  const num = Math.round(asNumber(value, 3))
  if (num <= 1) return 1
  if (num >= 5) return 5
  return num as Difficulty
}

function asRating(value: unknown): Rating {
  const num = Math.round(asNumber(value, 3))
  if (num <= 1) return 1
  if (num >= 3) return 3
  return 2
}

function asRecord(raw: unknown): Record<string, unknown> {
  if (typeof raw === 'object' && raw !== null) return raw as Record<string, unknown>
  return {}
}

function normalizeCard(raw: unknown, index: number, now: number): Card {
  const source = asRecord(raw)
  const createdAt = asNumber(source.createdAt, now)
  const term = asString(source.term).trim()

  return {
    id: typeof source.id === 'number' ? source.id : undefined,
    term: term.length > 0 ? term : `未命名卡片 ${index + 1}`,
    answer: asString(source.answer),
    keyPoints: asStringArray(source.keyPoints),
    explanation: asString(source.explanation),
    example: asString(source.example),
    tags: asStringArray(source.tags),
    difficulty: asDifficulty(source.difficulty),
    source: asString(source.source),
    createdAt,
    updatedAt: asNumber(source.updatedAt, createdAt),
    dueAt: asNumber(source.dueAt, now),
    interval: asNumber(source.interval, 0),
    easeFactor: asNumber(source.easeFactor, 2.5),
    repetitions: asNumber(source.repetitions, 0),
    lapses: asNumber(source.lapses, 0),
    lastReviewedAt:
      typeof source.lastReviewedAt === 'number' ? source.lastReviewedAt : null,
  }
}

function normalizeLog(raw: unknown, index: number, now: number): ReviewLog {
  const source = asRecord(raw)
  const mode: ReviewMode = source.mode === 'typing' ? 'typing' : 'self'

  return {
    id: typeof source.id === 'number' ? source.id : undefined,
    cardId: asNumber(source.cardId, index + 1),
    reviewedAt: asNumber(source.reviewedAt, now),
    rating: asRating(source.rating),
    mode,
    prevInterval: asNumber(source.prevInterval, 0),
    nextInterval: asNumber(source.nextInterval, 1),
    prevDueAt: asNumber(source.prevDueAt, now),
    nextDueAt: asNumber(source.nextDueAt, now),
  }
}

function normalizeSettings(raw: unknown, now: number): Settings {
  const source = asRecord(raw)
  const goal = Math.round(asNumber(source.dailyGoal, 20))

  return {
    id: 1,
    dailyGoal: Math.min(500, Math.max(1, goal)),
    defaultMode: source.defaultMode === 'typing' ? 'typing' : 'self',
    createdAt: asNumber(source.createdAt, now),
    updatedAt: asNumber(source.updatedAt, now),
  }
}

/** 导入 = 覆盖现有全部数据（调用前请在界面上二次确认） */
export async function importBackup(file: File): Promise<ImportSummary> {
  const text = await file.text()

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('文件不是合法的 JSON，请确认选的是 .json 备份文件')
  }

  const root = asRecord(parsed)
  if (!Array.isArray(root.cards)) {
    throw new Error('备份文件缺少 cards 数组，可能不是本应用导出的备份')
  }

  const now = Date.now()
  const cards = root.cards.map((item, index) => normalizeCard(item, index, now))
  const logSource = Array.isArray(root.reviewLogs) ? root.reviewLogs : []
  const reviewLogs = logSource.map((item, index) => normalizeLog(item, index, now))
  const settings = normalizeSettings(root.settings, now)

  await db.transaction('rw', db.cards, db.reviewLogs, db.settings, async () => {
    await db.cards.clear()
    await db.reviewLogs.clear()
    await db.settings.clear()
    if (cards.length > 0) await db.cards.bulkPut(cards)
    if (reviewLogs.length > 0) await db.reviewLogs.bulkPut(reviewLogs)
    await db.settings.put(settings)
  })

  return { cards: cards.length, reviewLogs: reviewLogs.length }
}

/** 追加导入 = 只新增卡片，保留现有数据（旧 ID 丢弃，复习进度重置） */
export async function appendBackup(file: File): Promise<{ cards: number }> {
  const text = await file.text()

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('文件不是合法的 JSON，请确认选的是 .json 备份文件')
  }

  const root = asRecord(parsed)
  if (!Array.isArray(root.cards)) {
    throw new Error('备份文件缺少 cards 数组，可能不是本应用导出的备份')
  }

  const now = Date.now()
  // 不写 id 字段，交给数据库自增分配，避免与现有卡片主键冲突
  const cards = root.cards.map((item, index) => {
    const card = normalizeCard(item, index, now)
    return {
      term: card.term,
      answer: card.answer,
      keyPoints: card.keyPoints,
      explanation: card.explanation,
      example: card.example,
      tags: card.tags,
      difficulty: card.difficulty,
      source: card.source,
      createdAt: now,
      updatedAt: now,
      dueAt: now,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
      lastReviewedAt: null,
    } satisfies Omit<Card, 'id'>
  })

  if (cards.length > 0) await db.cards.bulkAdd(cards)

  return { cards: cards.length }
}

/** 清空卡片、复习记录、设置（设置会回到默认值 20） */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.cards, db.reviewLogs, db.settings, async () => {
    await db.cards.clear()
    await db.reviewLogs.clear()
    await db.settings.clear()
  })
}