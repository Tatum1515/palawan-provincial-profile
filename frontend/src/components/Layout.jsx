import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TopBar from './TopBar.jsx'
import Header from './Header.jsx'
import Footer from './Footer.jsx'

function ScrollManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (hash) {
        const target = document.getElementById(hash.slice(1))
        if (target) {
          target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
          return
        }
      }
      window.scrollTo({ top: 0, behavior: 'auto' })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [pathname, hash])

  return null
}

export default function Layout() {
  return (
    <>
      <ScrollManager />
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <TopBar />
      <Header />
      <main id="main-content" className="page-shell" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
