import { useCallback, useEffect, useRef, useState } from 'react'
import PGPLogo from './PGPLogo.jsx'

const STORAGE_KEY = 'ppdo-profile-intro-seen'

export default function IntroPresentation() {
  const dialogRef = useRef(null)
  const returnFocusRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)

  const closeIntro = useCallback(() => {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => {
      setVisible(false)
      returnFocusRef.current?.focus?.()
    }, 420)
  }, [closing])

  useEffect(() => {
    if (typeof window === 'undefined' || window.location.pathname !== '/') return

    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return
      sessionStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // If sessionStorage is unavailable, the introduction still opens once for this render.
    }

    returnFocusRef.current = document.activeElement
    setVisible(true)
  }, [])

  useEffect(() => {
    if (!visible) return undefined

    const button = dialogRef.current?.querySelector('button')
    button?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeIntro()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [visible, closeIntro])

  useEffect(() => {
    if (!visible) return undefined
    const timer = window.setTimeout(closeIntro, 6500)
    return () => window.clearTimeout(timer)
  }, [visible, closeIntro])

  if (!visible || typeof window === 'undefined' || window.location.pathname !== '/') return null

  return (
    <div
      ref={dialogRef}
      className={`intro-presentation ${closing ? 'is-closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-title"
      aria-describedby="intro-description"
    >
      <div className="intro-backdrop" aria-hidden="true" />
      <div className="intro-gridline" aria-hidden="true" />

      <div className="intro-shell">
        <div className="intro-top">
          <div className="intro-government-copy">
            <span>PROVINCIAL GOVERNMENT OF PALAWAN</span>
            <strong>PROVINCIAL PLANNING AND DEVELOPMENT OFFICE</strong>
          </div>

          <button className="intro-skip" type="button" onClick={closeIntro}>
            Skip Introduction
            <span aria-hidden="true">↗</span>
          </button>
        </div>

        <div className="intro-content">
          <div className="intro-logo-stage" aria-hidden="true">
            <div className="intro-logo-halo" />
            <div className="intro-logo-frame">
              <PGPLogo className="intro-main-logo" />
            </div>
          </div>

          <div className="intro-copy">
            <span className="intro-eyebrow">PROVINCIAL GOVERNMENT OF PALAWAN</span>
            <h1 id="intro-title">PALAWAN</h1>
            <h2>PROVINCIAL PROFILE</h2>
            <p id="intro-description">
              Explore the province through its geographic, demographic, social, economic, and development information.
            </p>
          </div>
        </div>

        <div className="intro-bottom">
          <span className="intro-section-label">EXPLORE</span>
          <div className="intro-bottom-note">Provincial Planning and Development Office</div>
        </div>
      </div>
    </div>
  )
}
