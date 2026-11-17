import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { getSettings, updateSettings } from '../db'
import {
  appendBackup,
  buildBackup,
  clearAllData,
  downloadJson,
  exportCsv,
  importBackup,
} from '../utils/backup'

interface Message {
  ok: boolean
  text: string
}

export default function Settings() {
  const [goalText, setGoalText] = useState('20')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const appendFileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const settings = await getSettings()
        if (!cancelled) setGoalText(String(settings.dailyGoal))
      } catch (err) {
        if (!cancelled) {
          setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  async function saveGoal() {
    const value = Number(goalText)
    if (!Number.isFinite(value) || value < 1 || value > 500) {
      setMessage({ ok: false, text: '每日目标需要是 1 ~ 500 之间的整数' })
      return
    }

    setBusy(true)
    try {
      const settings = await updateSettings({ dailyGoal: Math.round(value) })
      setGoalText(String(settings.dailyGoal))
      setMessage({ ok: true, text: `每日目标已改为 ${settings.dailyGoal} 次` })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
    }
  }

  async function handleExportJson() {
    setBusy(true)
    try {
      const payload = await buildBackup()
      downloadJson(payload)
      setMessage({
        ok: true,
        text: `已导出 ${payload.cards.length} 张卡片、${payload.reviewLogs.length} 条复习记录`,
      })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
    }
  }

  async function handleExportCsv() {
    setBusy(true)
    try {
      const count = await exportCsv()
      setMessage({ ok: true, text: `已导出 ${count} 张卡片为 CSV，可用 Excel 打开` })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
    }
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const confirmed = window.confirm(
      '导入会用备份文件覆盖当前全部卡片和复习记录，确定继续吗？',
    )
    if (!confirmed) return

    setBusy(true)
    try {
      const summary = await importBackup(file)
      const settings = await getSettings()
      setGoalText(String(settings.dailyGoal))
      setMessage({
        ok: true,
        text: `导入完成：${summary.cards} 张卡片、${summary.reviewLogs} 条复习记录`,
      })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
    }
  }

  async function handleAppendFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const confirmed = window.confirm(
      '这会将新卡片追加到现有题库中，不影响已有数据，确定继续吗？',
    )
    if (!confirmed) return

    setBusy(true)
    try {
      const summary = await appendBackup(file)
      setMessage({ ok: true, text: `追加完成：新增了 ${summary.cards} 张卡片` })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
    }
  }

  async function handleClear() {
    const first = window.confirm(
      '会删除所有卡片、复习记录和设置，且无法恢复。确定继续吗？',
    )
    if (!first) return

    const second = window.confirm('再确认一次：真的要清空全部数据吗？建议先导出 JSON 备份。')
    if (!second) return

    setBusy(true)
    try {
      await clearAllData()
      setGoalText('20')
      setMessage({ ok: true, text: '已清空全部数据，每日目标恢复为 20' })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-brand-ink">设置</h1>
        <p className="mt-1 text-xs text-brand-muted">
          数据全部保存在这台设备的浏览器里，不会上传
        </p>
      </header>

      {message && (
        <p
          className={`rounded-lg px-3 py-2 text-xs ${
            message.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}
        >
          {message.text}
        </p>
      )}

      {/* 每日目标 */}
      <section className="rounded-2xl border border-brand-line bg-brand-card p-5">
        <h2 className="text-sm font-semibold text-brand-ink">每日复习目标</h2>
        <p className="mt-1 text-xs text-brand-muted">首页进度条的上限，建议 10 ~ 50 次</p>
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            min={1}
            max={500}
            value={goalText}
            onChange={(event) => setGoalText(event.target.value)}
            disabled={loading || busy}
            className="w-24 rounded-lg border border-brand-line bg-white px-3 py-2 text-sm tabular-nums text-brand-ink outline-none focus:border-brand-dark"
          />
          <button
            type="button"
            onClick={() => void saveGoal()}
            disabled={loading || busy}
            className="rounded-lg bg-brand-ink px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </section>

      {/* 数据备份 */}
      <section className="rounded-2xl border border-brand-line bg-brand-card p-5">
        <h2 className="text-sm font-semibold text-brand-ink">数据备份</h2>
        <p className="mt-1 text-xs leading-relaxed text-brand-muted">
          JSON 可以完整还原（含复习进度）；CSV 只用于 Excel 查看，不能导入
        </p>

        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={() => void handleExportJson()}
            disabled={busy}
            className="w-full rounded-lg bg-brand-ink py-2.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            导出 JSON 备份
          </button>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="w-full rounded-lg border border-brand-line py-2.5 text-xs font-medium text-brand-dark disabled:opacity-50"
          >
            导入 JSON 备份（覆盖现有数据）
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            onChange={(event) => void handleImportFile(event)}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => appendFileRef.current?.click()}
            disabled={busy}
            className="w-full rounded-lg border border-brand-line py-2.5 text-xs font-medium text-brand-dark disabled:opacity-50"
          >
            追加导入 JSON（保留原数据）
          </button>
          <input
            ref={appendFileRef}
            type="file"
            accept=".json,application/json"
            onChange={(event) => void handleAppendFile(event)}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => void handleExportCsv()}
            disabled={busy}
            className="w-full rounded-lg border border-brand-line py-2.5 text-xs font-medium text-brand-dark disabled:opacity-50"
          >
            导出 CSV（Excel 查看）
          </button>
        </div>
      </section>

      {/* 危险操作 */}
      <section className="rounded-2xl border border-red-200 bg-red-50/50 p-5">
        <h2 className="text-sm font-semibold text-red-600">危险操作</h2>
        <p className="mt-1 text-xs leading-relaxed text-red-500">
          清空后卡片、复习记录、设置全部消失，且无法恢复
        </p>
        <button
          type="button"
          onClick={() => void handleClear()}
          disabled={busy}
          className="mt-3 w-full rounded-lg border border-red-200 bg-white py-2.5 text-xs font-semibold text-red-600 disabled:opacity-50"
        >
          清空所有数据
        </button>
      </section>

      {/* 关于 */}
      <section className="rounded-2xl border border-brand-line bg-brand-card p-5">
        <h2 className="text-sm font-semibold text-brand-ink">关于</h2>
        <ul className="mt-2 space-y-1 text-xs leading-relaxed text-brand-muted">
          <li>· 数据存储：浏览器 IndexedDB（本机，不上传）</li>
          <li>· 复习算法：SM-2 简化版（忘记 / 模糊 / 记住）</li>
          <li>· 离线可用：已缓存页面资源，断网也能打开</li>
          <li>· 版本：0.1.0（MVP）</li>
        </ul>
      </section>
    </div>
  )
}