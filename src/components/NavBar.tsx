import { BarChart3, Brain, Home, Layers, Settings } from 'lucide-react'

export type PageKey = 'home' | 'cards' | 'study' | 'stats' | 'settings'

const NAV_ITEMS = [
  { key: 'home', label: '首页', Icon: Home },
  { key: 'cards', label: '卡片', Icon: Layers },
  { key: 'study', label: '学习', Icon: Brain },
  { key: 'stats', label: '统计', Icon: BarChart3 },
  { key: 'settings', label: '设置', Icon: Settings },
] as const

interface NavBarProps {
  current: PageKey
  onChange: (key: PageKey) => void
}

export default function NavBar({ current, onChange }: NavBarProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-brand-line bg-brand-card">
      <div className="mx-auto flex h-16 max-w-2xl items-stretch justify-around">
        {NAV_ITEMS.map(({ key, label, Icon }) => {
          const active = current === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              aria-current={active ? 'page' : undefined}
              className={`flex w-full flex-col items-center justify-center gap-1 text-xs transition-colors ${
                active ? 'font-semibold text-brand-ink' : 'text-brand-muted'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}