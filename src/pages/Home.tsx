import { useEffect, useState } from 'react'
import { countDueCards, getSettings, listCards, listLogsSince } from '../db'
import { calcStreak, startOfDay } from '../utils/date'

interface HomeProps {
  onStartStudy: () => void
}

interface DashboardData {
  dueCount: number
  totalCards: number
  reviewedToday: number
  dailyGoal: number
  streak: number
}

const EMPTY_DATA: DashboardData = {
  dueCount: 0,
  totalCards: 0,
  reviewedToday: 0,
  dailyGoal: 20,
  streak: 0,
}

export default function Home({ onStartStudy }: HomeProps) {
  const [data, setData] = useState<DashboardData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [dueCount, cards, settings, todayLogs, allLogs] = await Promise.all([
        countDueCards(),
        listCards(),
        getSettings(),
        listLogsSince(startOfDay(Date.now())),
        listLogsSince(0),
      ])

      setData({
        dueCount,
        totalCards: cards.length,
        reviewedToday: todayLogs.length,
        dailyGoal: settings.dailyGoal,
        streak: calcStreak(allLogs.map((log) => log.reviewedAt)),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const goal = Math.max(1, data.dailyGoal)
  const percent = Math.min(100, Math.round((data.reviewedToday / goal) * 100))
  const todayText = new Date().toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs text-brand-muted">{todayText}</p>
          <h1 className="mt-1 text-xl font-bold text-brand-ink">今日复习</h1>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          className="rounded-lg border border-brand-line px-3 py-1.5 text-xs text-brand-dark"
        >
          刷新
        </button>
      </header>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          读取数据失败：{error}
        </p>
      )}

      <section className="rounded-2xl border border-brand-line bg-brand-card p-5 shadow-sm">
        <p className="text-xs text-brand-muted">待复习</p>
        <div className="mt-1 flex items-end gap-2">
          <span className="text-5xl font-bold leading-none tabular-nums text-brand-ink">
            {loading ? '—' : data.dueCount}
          </span>
          <span className="pb-1 text-sm text-brand-muted">张</span>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-brand-muted">
          {data.totalCards === 0
            ? '还没有卡片，第 12 步的卡片管理页上线后就能开始添加。'
            : data.dueCount === 0
              ? '今天的卡片都复习完了，可以休息。'
              : '这些卡片已到复习时间，趁记忆还热的时候过一遍。'}
        </p>

        <button
          type="button"
          onClick={onStartStudy}
          disabled={loading || data.dueCount === 0}
          className="mt-5 w-full rounded-xl bg-brand-ink py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
        >
          {data.dueCount === 0 ? '今日没有待复习卡片' : `开始今日复习（${data.dueCount} 张）`}
        </button>
      </section>

      <section className="rounded-2xl border border-brand-line bg-brand-card p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-brand-ink">今日进度</span>
          <span className="text-xs tabular-nums text-brand-muted">
            {data.reviewedToday} / {data.dailyGoal}
          </span>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-brand-line">
          <div
            className="h-full rounded-full bg-brand-ink transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="mt-2 text-xs text-brand-muted">
          {data.reviewedToday >= data.dailyGoal
            ? '今日目标已完成。'
            : `还差 ${data.dailyGoal - data.reviewedToday} 次达成今日目标。`}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-brand-line bg-brand-card p-4">
          <p className="text-xs text-brand-muted">连续打卡</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-ink">
            {loading ? '—' : data.streak}
            <span className="ml-1 text-xs font-normal text-brand-muted">天</span>
          </p>
        </div>
        <div className="rounded-2xl border border-brand-line bg-brand-card p-4">
          <p className="text-xs text-brand-muted">卡片总数</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-ink">
            {loading ? '—' : data.totalCards}
            <span className="ml-1 text-xs font-normal text-brand-muted">张</span>
          </p>
        </div>
      </section>
    </div>
  )
}