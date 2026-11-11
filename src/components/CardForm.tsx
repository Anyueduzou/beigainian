import { useState } from 'react'
import type { FormEvent } from 'react'
import { createCard, deleteCard, updateCard } from '../db'
import type { Card, CardDraft, Difficulty } from '../db/types'

interface CardFormProps {
  initial?: Card | null
  onSaved: () => void
  onCancel: () => void
}

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 1, label: '1 · 很简单' },
  { value: 2, label: '2 · 简单' },
  { value: 3, label: '3 · 一般' },
  { value: 4, label: '4 · 难' },
  { value: 5, label: '5 · 很难' },
]

const INPUT_CLASS =
  'mt-1 w-full rounded-lg border border-brand-line bg-white px-3 py-2 text-sm text-brand-ink outline-none focus:border-brand-dark'

const LABEL_CLASS = 'text-xs font-medium text-brand-dark'

/** 一行一个要点 */
function splitLines(text: string): string[] {
  return text
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

/** 支持逗号、中文逗号、顿号、分号、空格分隔，自动去重 */
function splitTags(text: string): string[] {
  const parts = text
    .split(/[,，、;；\s]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
  return Array.from(new Set(parts))
}

export default function CardForm({ initial, onSaved, onCancel }: CardFormProps) {
  const [term, setTerm] = useState(initial?.term ?? '')
  const [answer, setAnswer] = useState(initial?.answer ?? '')
  const [keyPointsText, setKeyPointsText] = useState((initial?.keyPoints ?? []).join('\n'))
  const [explanation, setExplanation] = useState(initial?.explanation ?? '')
  const [example, setExample] = useState(initial?.example ?? '')
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join('，'))
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? 3)
  const [source, setSource] = useState(initial?.source ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const isEditing = initial?.id !== undefined

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    const draft: CardDraft = {
      term: term.trim(),
      answer: answer.trim(),
      keyPoints: splitLines(keyPointsText),
      explanation: explanation.trim(),
      example: example.trim(),
      tags: splitTags(tagsText),
      difficulty,
      source: source.trim(),
    }

    if (!draft.term) {
      setError('请填写概念名')
      return
    }
    if (!draft.answer) {
      setError('请填写标准答案')
      return
    }

    setBusy(true)
    setError('')
    try {
      if (isEditing && initial?.id !== undefined) {
        await updateCard(initial.id, draft)
      } else {
        await createCard(draft)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (initial?.id === undefined || busy) return
    const confirmed = window.confirm(
      `确定删除「${initial.term}」吗？这张卡的复习记录也会一起删除。`,
    )
    if (!confirmed) return

    setBusy(true)
    setError('')
    try {
      await deleteCard(initial.id)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      {/* 弹层：整块不滚动，只有中间字段区滚动，底部操作条永远可见 */}
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-brand-card sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-brand-line px-5 py-3">
          <h2 className="text-base font-bold text-brand-ink">
            {isEditing ? '编辑卡片' : '新增卡片'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-2 py-1 text-xs text-brand-muted"
          >
            取消
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          {/* 中间：字段区，独立滚动 */}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4">
            <div>
              <label className={LABEL_CLASS} htmlFor="term">
                概念名 <span className="text-red-500">*</span>
              </label>
              <input
                id="term"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="例如：二叉搜索树"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="answer">
                标准答案 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="answer"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                rows={4}
                placeholder="用自己的话写下标准答案"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="keyPoints">
                要点清单（一行一个）
              </label>
              <textarea
                id="keyPoints"
                value={keyPointsText}
                onChange={(event) => setKeyPointsText(event.target.value)}
                rows={3}
                placeholder={'第一条要点\n第二条要点\n第三条要点'}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="explanation">
                解释（可选）
              </label>
              <textarea
                id="explanation"
                value={explanation}
                onChange={(event) => setExplanation(event.target.value)}
                rows={2}
                placeholder="补充说明、易错点"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="example">
                例子（可选）
              </label>
              <textarea
                id="example"
                value={example}
                onChange={(event) => setExample(event.target.value)}
                rows={2}
                placeholder="一个能帮助理解的具体例子"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="tags">
                标签（用逗号分隔）
              </label>
              <input
                id="tags"
                value={tagsText}
                onChange={(event) => setTagsText(event.target.value)}
                placeholder="数据结构，树，面试"
                className={INPUT_CLASS}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLASS} htmlFor="difficulty">
                  难度
                </label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(event) => setDifficulty(Number(event.target.value) as Difficulty)}
                  className={INPUT_CLASS}
                >
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS} htmlFor="source">
                  来源（可选）
                </label>
                <input
                  id="source"
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  placeholder="《算法导论》P123"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </div>

          {/* 底部：操作条，固定可见 */}
          <div className="border-t border-brand-line bg-brand-card px-5 py-3">
            {error && (
              <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="flex-1 rounded-xl bg-brand-ink py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? '保存中…' : isEditing ? '保存修改' : '创建卡片'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={busy}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 disabled:opacity-50"
                >
                  删除
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}