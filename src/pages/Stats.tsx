import { useEffect, useState } from 'react'
import { loadStats } from '../utils/stats'
import type { StatsData } from '../utils/stats'

const EMPTY_DATA: StatsData = {
  totalCards: 0,
  totalLogs: 0,
  todayCount: 0,
  weekTotal: 0,
  days: [],
  tags: [],
  weakCards: [],
}

export default function Stats() {
  const [data, setData] = useState<StatsData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const result = await loadStats()
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const maxCount = Math.max(1, ...data.days.map((day) => day.count))

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-brand-ink">统计</h1>
        <p className="mt-1 text-xs text-brand-muted">全部数据来自本机复习记录</p>
      </header>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          读取失败：{error}
        </p>
      )}

      {/* 三个概览数字 */}
      <section className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-brand-line bg-brand-card p-3">
          <p className="text-[11px] text-brand-muted">卡片总数</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-brand-ink">
            {loading ? '—' : data.totalCards}
          </p>
        </div>
        <div className="rounded-xl border border-brand-line bg-brand-card p-3">
          <p className="text-[11px] text-brand-muted">近 7 天复习</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-brand-ink">
            {loading ? '—' : data.weekTotal}
          </p>
        </div>
        <div className="rounded-xl border border-brand-line bg-brand-card p-3">
          <p className="text-[11px] text-brand-muted">今日复习</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-brand-ink">
            {loading ? '—' : data.todayCount}
          </p>
        </div>
      </section>

      {/* 近 7 天柱状图 */}
      <section className="rounded-2xl border border-brand-line bg-brand-card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-brand-ink">近 7 天复习量</h2>
          <span className="text-[11px] tabular-nums text-brand-muted">
            共 {data.weekTotal} 次
          </span>
        </div>

        {data.days.length === 0 ? (
          <p className="py-8 text-center text-xs text-brand-muted">加载中…</p>
        ) : (
          <div className="mt-4 flex items-end gap-2">
            {data.days.map((day) => {
              const height =
                day.count === 0 ? 2 : Math.max(6, Math.round((day.count / maxCount) * 100))
              const isToday = day.label === '今'

              return (
                <div key={day.key} className="flex flex-1 flex-col items-center">
                  <span className="h-4 text-[10px] tabular-nums text-brand-muted">
                    {day.count > 0 ? day.count : ''}
                  </span>
                  <div className="flex h-24 w-full items-end">
                    <div
                      className={`w-full rounded-t ${
                        isToday ? 'bg-brand-ink' : 'bg-brand-muted/40'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span
                    className={`mt-1 text-[11px] ${
                      isToday ? 'font-semibold text-brand-ink' : 'text-brand-muted'
                    }`}
                  >
                    {day.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 标签掌握度 */}
      <section className="rounded-2xl border border-brand-line bg-brand-card p-5">
        <h2 className="text-sm font-semibold text-brand-ink">各标签掌握度</h2>
        <p className="mt-1 text-[11px] text-brand-muted">
          连续记住 3 次算已掌握，1~2 次算学习中
        </p>

        {loading ? (
          <p className="py-8 text-center text-xs text-brand-muted">加载中…</p>
        ) : data.tags.length === 0 ? (
          <p className="py-8 text-center text-xs text-brand-muted">
            还没有卡片，去「卡片」页添加几张
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {data.tags.map((tag) => (
              <li key={tag.tag}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-medium text-brand-ink">{tag.tag}</span>
                  <span className="tabular-nums text-brand-muted">
                    已掌握 {tag.mastered} / {tag.total}（{tag.percent}%）
                  </span>
                </div>
                <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-brand-bg">
                  <div
                    className="bg-brand-ink"
                    style={{ width: `${(tag.mastered / tag.total) * 100}%` }}
                  />
                  <div
                    className="bg-brand-muted/50"
                    style={{ width: `${(tag.learning / tag.total) * 100}%` }}
                  />
                  <div
                    className="bg-brand-line"
                    style={{ width: `${(tag.fresh / tag.total) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-brand-muted">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-brand-ink" />
            已掌握
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-brand-muted/50" />
            学习中
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-brand-line" />
            新卡
          </span>
        </div>
      </section>

      {/* 遗忘最多 */}
      <section className="rounded-2xl border border-brand-line bg-brand-card p-5">
        <h2 className="text-sm font-semibold text-brand-ink">遗忘最多的卡片</h2>

        {loading ? (
          <p className="py-6 text-center text-xs text-brand-muted">加载中…</p>
        ) : data.weakCards.length === 0 ? (
          <p className="py-6 text-center text-xs text-brand-muted">
            还没有「忘记」记录，继续保持
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {data.weakCards.map((card, index) => (
              <li
                key={card.id ?? `${card.term}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg bg-brand-bg px-3 py-2"
              >
                <span className="min-w-0 truncate text-xs text-brand-dark">
                  {index + 1}. {card.term}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-red-600">
                  忘记 {card.lapses} 次
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}