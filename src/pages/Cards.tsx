import { useEffect, useState } from 'react'
import { findCards, listAllTags } from '../db'
import type { Card } from '../db/types'
import CardForm from '../components/CardForm'

export default function Cards() {
  const [cards, setCards] = useState<Card[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [keyword, setKeyword] = useState('')
  const [activeTag, setActiveTag] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Card | null>(null)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      setLoading(true)
      try {
        const [list, allTags] = await Promise.all([
          findCards({ keyword, tag: activeTag || undefined }),
          listAllTags(),
        ])
        if (!cancelled) {
          setCards(list)
          setTags(allTags)
          setError('')
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [keyword, activeTag, refreshKey])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(card: Card) {
    setEditing(card)
    setFormOpen(true)
  }

  function handleSaved() {
    setFormOpen(false)
    setEditing(null)
    setRefreshKey((value) => value + 1)
  }

  const chipClass = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1.5 text-xs whitespace-nowrap ${
      active
        ? 'border-brand-ink bg-brand-ink text-white'
        : 'border-brand-line bg-brand-card text-brand-muted'
    }`

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-ink">卡片</h1>
          <p className="mt-1 text-xs text-brand-muted">共 {cards.length} 张</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-brand-ink px-4 py-2 text-xs font-semibold text-white"
        >
          + 新增卡片
        </button>
      </header>

      <input
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder="搜索概念名 / 答案 / 标签"
        className="w-full rounded-lg border border-brand-line bg-white px-3 py-2.5 text-sm text-brand-ink outline-none focus:border-brand-dark"
      />

      {tags.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <button type="button" onClick={() => setActiveTag('')} className={chipClass(activeTag === '')}>
            全部
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(activeTag === tag ? '' : tag)}
              className={chipClass(activeTag === tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          读取失败：{error}
        </p>
      )}

      {loading ? (
        <p className="py-10 text-center text-xs text-brand-muted">加载中…</p>
      ) : cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-brand-card px-4 py-12 text-center">
          <p className="text-sm font-medium text-brand-ink">
            {keyword || activeTag ? '没有匹配的卡片' : '还没有卡片'}
          </p>
          <p className="mt-2 text-xs text-brand-muted">
            {keyword || activeTag ? '换个关键词或取消标签筛选试试' : '把要背的概念写进来，第一次复习时就会排进队列'}
          </p>
          {!keyword && !activeTag && (
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 rounded-xl bg-brand-ink px-5 py-2.5 text-xs font-semibold text-white"
            >
              新增第一张卡片
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {cards.map((card) => (
            <li
              key={card.id}
              className="rounded-xl border border-brand-line bg-brand-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-brand-ink">
                    {card.term}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-brand-muted">
                    {card.answer}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(card)}
                  className="shrink-0 rounded-lg border border-brand-line px-2.5 py-1 text-[11px] text-brand-dark"
                >
                  编辑
                </button>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-brand-bg px-2 py-0.5 text-[11px] text-brand-muted">
                  难度 {card.difficulty}
                </span>
                {card.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-brand-bg px-2 py-0.5 text-[11px] text-brand-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {formOpen && (
        <CardForm
          initial={editing}
          onSaved={handleSaved}
          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}