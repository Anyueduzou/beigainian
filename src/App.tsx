import { useState } from 'react'
import NavBar, { type PageKey } from './components/NavBar'
import Home from './pages/Home'
import Cards from './pages/Cards'
import Study from './pages/Study'
import Stats from './pages/Stats'
import Settings from './pages/Settings'

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>('home')

  return (
    <div className="flex min-h-screen flex-col">
      {/* pb-24 给底部固定导航留出空间 */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-6">
        {currentPage === 'home' && (
          <Home onStartStudy={() => setCurrentPage('study')} />
        )}
        {currentPage === 'cards' && <Cards />}
        {currentPage === 'study' && (
          <Study onFinish={() => setCurrentPage('home')} />
        )}
        {currentPage === 'stats' && <Stats />}
        {currentPage === 'settings' && <Settings />}
      </main>
      <NavBar current={currentPage} onChange={setCurrentPage} />
    </div>
  )
}