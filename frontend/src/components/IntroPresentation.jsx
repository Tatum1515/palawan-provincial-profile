import { ArrowRight, BarChart3, Database, Map } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import PGPLogo from './PGPLogo.jsx'

const STORAGE_KEY = 'ppdo-profile-intro-seen'
const SLIDES = [
  {
    eyebrow: 'PROVINCIAL GOVERNMENT OF PALAWAN',
    title: 'PALAWAN',
    accent: 'PROVINCIAL PROFILE',
    text: 'A source-focused view of the supplied geographic, demographic, employment, education, and TVET data.',
    icon: Map,
  },
  {
    eyebrow: 'DATA',
    title: 'PROFILE',
    accent: 'AT A GLANCE',
    text: 'Review the reference values, years, locations, institutions, and source notes without replacing missing information.',
    icon: Database,
  },
  {
    eyebrow: 'EXPLORE',
    title: 'THE DATA',
    accent: 'SECTION BY SECTION',
    text: 'Move from the provincial overview to population, employment, religious affiliation, higher education, and TVET.',
    icon: BarChart3,
  },
]

export default function IntroPresentation() {
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (location.pathname !== '/') return

    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return
      sessionStorage.setItem(STORAGE_KEY, '1')
      setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [location.pathname])

  useEffect(() => {
    if (!visible) return undefined
    const interval = window.setInterval(() => {
      setIndex((current) => {
        if (current === SLIDES.length - 1) {
          window.clearInterval(interval)
          return current
        }
        return current + 1
      })
    }, 1050)
    return () => window.clearInterval(interval)
  }, [visible])

  useEffect(() => {
    if (!visible) return undefined
    const finish = window.setTimeout(() => closeIntro(), 4300)
    return () => window.clearTimeout(finish)
  }, [visible])

  const closeIntro = () => {
    setClosing(true)
    window.setTimeout(() => setVisible(false), 520)
  }

  if (!visible || location.pathname !== '/') return null

  const slide = SLIDES[index]
  const Icon = slide.icon

  return (
    <div className={`intro-presentation ${closing ? 'is-closing' : ''}`} role="dialog" aria-modal="true" aria-label="Palawan provincial profile introduction">
      <div className="intro-backdrop" aria-hidden="true" />
      <div className="intro-gridline" aria-hidden="true" />

      <div className="intro-shell">
        <div className="intro-top">
          <div className="intro-government">
            <PGPLogo className="intro-logo" />
            <div>
              <strong>PROVINCIAL GOVERNMENT OF PALAWAN</strong>
              <span>PROVINCIAL PLANNING AND DEVELOPMENT OFFICE</span>
            </div>
          </div>
          <button className="intro-skip" type="button" onClick={closeIntro}>Skip Introduction</button>
        </div>

        <div className="intro-content">
          <div className="intro-copy" key={slide.title}>
            <span className="intro-eyebrow">{slide.eyebrow}</span>
            <div className="intro-icon"><Icon size={19} /></div>
            <h1>{slide.title}</h1>
            <h2>{slide.accent}</h2>
            <p>{slide.text}</p>
          </div>

          <div className="intro-visual" aria-hidden="true">
            <div className="intro-photo" />
            <div className="intro-photo-shade" />
            <div className="intro-visual-copy">
              <span>PALAWAN / PROFILE</span>
              <strong>PROVINCIAL DATA</strong>
            </div>
            <div className="intro-ring intro-ring-a" />
            <div className="intro-ring intro-ring-b" />
          </div>
        </div>

        <div className="intro-bottom">
          <div className="intro-progress" aria-hidden="true">
            {SLIDES.map((item, slideIndex) => <span key={item.title} className={slideIndex <= index ? 'active' : ''} />)}
          </div>
          <span className="intro-prompt"><ArrowRight size={14} /> Explore the profile</span>
        </div>
      </div>
    </div>
  )
}
