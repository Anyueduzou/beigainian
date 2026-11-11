import { useEffect, useState } from 'react'
import { addReviewLog, listDueCards, updateCard } from '../db'
import type { Card, Rating } from '../db/types'
import { schedule } from '../algorithms/sm2'

interface StudyProps {
  onFinish: () => void
}

const RATING_OPTIONS: { rating: Rating; label: string; className: string }[] = [
  { rating: 1, label: '忘记', className: 'border-red-200 bg-red-50 text-red-600' },
  { rating: 2, label: '模糊', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  { rating: 3, label: '记住', className: 'border-brand-ink bg-brand-ink text-white' },
]

export default function Study({ onFinish }: StudyProps) {
  const [queue, setQueue] = useState<Card[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const cards = await listDueCards()
        if (!cancelled) setQueue(cards)
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

  const total = queue.length
  const current: Card | undefined = queue[index]

  async function handleRate(rating: Rating) {
    if (!current || current.id === undefined || saving) return

    setSaving(true)
    setError('')
    try {
      const now = Date.now()
      const result = schedule(
        {
          interval: current.interval,
          easeFactor: current.easeFactor,
          repetitions: current.repetitions,
          lapses: current.lapses,
        },
        rating,
        now,
      )

      await updateCard(current.id, {
        interval: result.interval,
        easeFactor: result.easeFactor,
        repetitions: result.repetitions,
        lapses: result.lapses,
        dueAt: result.dueAt,
        lastReviewedAt: result.lastReviewedAt,
      })

      await addReviewLog({
        cardId: current.id,
        reviewedAt: now,
        rating,
        mode: 'self',
        prevInterval: current.interval,
        nextInterval: result.interval,
        prevDueAt: current.dueAt,
        nextDueAt: result.dueAt,
      })

      setFlipped(false)
      setIndex((value) => value + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  /* ---------- 加载中 ---------- */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-brand-muted">
        正在读取待复习卡片…
      </div>
    )
  }

  /* ---------- 复习完成 / 没有待复习 ---------- */
  if (!current) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h1 className="text-xl font-bold text-brand-ink">
          {total === 0 ? '今天没有待复习卡片' : '本轮复习完成'}
        </h1>
        <p className="mt-2 text-sm text-brand-muted">
          {total === 0 ? '去添加几张卡片，或明天再来。' : `本轮共复习 ${total} 张。`}
        </p>
        <button
          type="button"
          onClick={onFinish}
          className="mt-6 rounded-xl bg-brand-ink px-6 py-3 text-sm font-semibold text-white"
        >
          回到首页
        </button>
      </div>
    )
  }

  /* ---------- 复习中 ---------- */
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={onFinish}
          className="rounded-lg border border-brand-line px-3 py-1.5 text-xs text-brand-dark"
        >
          ← 退出
        </button>
        <span className="text-xs tabular-nums text-brand-muted">
          {index + 1} / {total}
        </span>
      </header>

      <div className="h-1 w-full overflow-hidden rounded-full bg-brand-line">
        <div
          className="h-full rounded-full bg-brand-ink transition-all duration-300"
          style={{ width: `${Math.round((index / Math.max(1, total)) * 100)}%` }}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          保存失败：{error}
        </p>
      )}

      {/* 卡片本体：点击翻面 */}
      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        className="w-full rounded-2xl border border-brand-line bg-brand-card p-5 text-left shadow-sm"
      >
        <p className="text-xs text-brand-muted">概念</p>
        <h2 className="mt-2 text-2xl font-bold leading-snug text-brand-ink">
          {current.term}
        </h2>

        {current.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {current.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-brand-bg px-2 py-0.5 text-[11px] text-brand-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {!flipped ? (
          <p className="mt-10 pb-6 text-center text-xs text-brand-muted">
            先在心里回忆，再点卡片看答案
          </p>
        ) : (
          <div className="mt-4 max-h-[46vh] space-y-4 overflow-y-auto border-t border-brand-line pt-4">
            <div>
              <p className="text-xs text-brand-muted">标准答案</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-brand-dark">
                {current.answer}
              </p>
            </div>

            {current.keyPoints.length > 0 && (
              <div>
                <p className="text-xs text-brand-muted">要点清单</p>
                <ul className="mt-1 space-y-1">
                  {current.keyPoints.map((point, pointIndex) => (
                    <li key={pointIndex} className="text-sm leading-relaxed text-brand-dark">
                      · {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {current.explanation && (
              <div>
                <p className="text-xs text-brand-muted">解释</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-brand-dark">
                  {current.explanation}
                </p>
              </div>
            )}

            {current.example && (
              <div>
                <p className="text-xs text-brand-muted">例子</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-brand-dark">
                  {current.example}
                </p>
              </div>
            )}

            {current.source && (
              <p className="text-[11px] text-brand-muted">来源：{current.source}</p>
            )}
          </div>
        )}
      </button>

      {/* 底部操作区 */}
      {!flipped ? (
        <button
          type="button"
          onClick={() => setFlipped(true)}
          className="w-full rounded-xl bg-brand-ink py-3 text-sm font-semibold text-white"
        >
          显示答案
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {RATING_OPTIONS.map((option) => (
            <button
              key={option.rating}
              type="button"
              onClick={() => void handleRate(option.rating)}
              disabled={saving}
              className={`rounded-xl border py-3 text-sm font-semibold transition-opacity disabled:opacity-50 ${option.className}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      <p className="text-center text-[11px] text-brand-muted">
        自评会决定下次复习时间，如实选就好
      </p>
    </div>
  )
}