import Dexie from 'dexie'
import type { Table } from 'dexie'
import type {
  Card,
  CardDraft,
  Difficulty,
  ReviewLog,
  Settings,
} from './types'

/** 数据库名，F12 → Application → IndexedDB 里能看到这个名字 */
const DB_NAME = 'beigainian'

class AppDatabase extends Dexie {
  cards!: Table<Card, number>
  reviewLogs!: Table<ReviewLog, number>
  settings!: Table<Settings, number>

  constructor() {
    super(DB_NAME)
    // 索引说明：++id 自增主键；*tags 表示数组多值索引，可按标签查
    this.version(1).stores({
      cards: '++id, term, difficulty, dueAt, createdAt, *tags',
      reviewLogs: '++id, cardId, reviewedAt, rating',
      settings: 'id',
    })
  }
}

export const db = new AppDatabase()

/* ---------------- 卡片 ---------------- */

export async function createCard(draft: CardDraft): Promise<number> {
  const now = Date.now()
  return db.cards.add({
    ...draft,
    createdAt: now,
    updatedAt: now,
    dueAt: now, // 新建的卡片立即可复习
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    lastReviewedAt: null,
  })
}

export async function getCard(id: number): Promise<Card | undefined> {
  return db.cards.get(id)
}

export async function listCards(): Promise<Card[]> {
  const items = await db.cards.toArray()
  return items.sort((a, b) => b.createdAt - a.createdAt)
}

export async function updateCard(
  id: number,
  patch: Partial<Omit<Card, 'id' | 'createdAt'>>,
): Promise<number> {
  return db.cards.update(id, { ...patch, updatedAt: Date.now() })
}

/** 删除卡片，同时删掉它的复习记录，避免留下孤儿数据 */
export async function deleteCard(id: number): Promise<void> {
  await db.transaction('rw', db.cards, db.reviewLogs, async () => {
    await db.cards.delete(id)
    await db.reviewLogs.where('cardId').equals(id).delete()
  })
}

export interface CardFilter {
  keyword?: string
  tag?: string
  difficulty?: Difficulty
}

/**
 * 按关键词/标签/难度筛选。
 * 关键词同时匹配 概念名、标准答案、标签，忽略大小写。
 * MVP 阶段数据量小，直接在内存里过滤，够用且实现简单。
 */
export async function findCards(filter: CardFilter = {}): Promise<Card[]> {
  let items = await listCards()
  const keyword = filter.keyword?.trim().toLowerCase()
  const tag = filter.tag
  const { difficulty } = filter

  if (keyword) {
    items = items.filter(
      (card) =>
        card.term.toLowerCase().includes(keyword) ||
        card.answer.toLowerCase().includes(keyword) ||
        card.tags.some((item) => item.toLowerCase().includes(keyword)),
    )
  }
  if (tag) {
    items = items.filter((card) => card.tags.includes(tag))
  }
  if (difficulty !== undefined) {
    items = items.filter((card) => card.difficulty === difficulty)
  }
  return items
}

/** 到期待复习的卡片，按到期时间从早到晚 */
export async function listDueCards(limit?: number): Promise<Card[]> {
  const items = await db.cards
    .where('dueAt')
    .belowOrEqual(Date.now())
    .sortBy('dueAt')
  return typeof limit === 'number' ? items.slice(0, limit) : items
}

export async function countDueCards(): Promise<number> {
  return db.cards.where('dueAt').belowOrEqual(Date.now()).count()
}

/** 所有卡片里出现过的标签（去重、排序），筛选下拉用 */
export async function listAllTags(): Promise<string[]> {
  const items = await db.cards.toArray()
  const set = new Set<string>()
  items.forEach((card) => card.tags.forEach((tag) => set.add(tag)))
  return Array.from(set).sort()
}

/* ---------------- 复习记录 ---------------- */

export async function addReviewLog(
  log: Omit<ReviewLog, 'id'>,
): Promise<number> {
  return db.reviewLogs.add(log)
}

export async function listLogsByCard(cardId: number): Promise<ReviewLog[]> {
  const items = await db.reviewLogs.where('cardId').equals(cardId).toArray()
  return items.sort((a, b) => b.reviewedAt - a.reviewedAt)
}

export async function listLogsSince(since: number): Promise<ReviewLog[]> {
  const items = await db.reviewLogs.where('reviewedAt').aboveOrEqual(since).toArray()
  return items.sort((a, b) => b.reviewedAt - a.reviewedAt)
}

/* ---------------- 设置 ---------------- */

const SETTINGS_ID = 1

export async function getSettings(): Promise<Settings> {
  const existing = await db.settings.get(SETTINGS_ID)
  if (existing) return existing

  const now = Date.now()
  const created: Settings = {
    id: SETTINGS_ID,
    dailyGoal: 20,
    defaultMode: 'self',
    createdAt: now,
    updatedAt: now,
  }
  await db.settings.put(created)
  return created
}

export async function updateSettings(
  patch: Partial<Omit<Settings, 'id' | 'createdAt'>>,
): Promise<Settings> {
  const current = await getSettings()
  const next: Settings = { ...current, ...patch, id: SETTINGS_ID, updatedAt: Date.now() }
  await db.settings.put(next)
  return next
}