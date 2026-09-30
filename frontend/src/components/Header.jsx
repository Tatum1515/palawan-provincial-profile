import { ChevronDown, Menu, X, ArrowUpRight } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import PGPLogo from './PGPLogo.jsx'

const menuGroups = [
  {
    label: 'Provincial Profile',
    to: '/profile',
    children: [
      ['Geographic & Administrative', '/profile#geographic'],
      ['Population', '/profile#population'],
      ['Employment', '/profile#employment'],
      ['Religious Affiliation', '/profile#religious-affiliation'],
      ['Higher Education / Talent Pool', '/profile#higher-education'],
      ['TVET', '/profile#tvet'],
    ],
  },
  { label: 'Municipalities', to: '/locations' },
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const closeTimer = useRef(null)

  useEffect(() => {
    setOpen(false)
    setOpenDropdown(null)
  }, [location.pathname, location.hash])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setOpenDropdown(null)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  const closeMenus = () => {
    setOpen(false)
    setOpenDropdown(null)
  }

  const toggleDropdown = (label) => {
    setOpenDropdown((current) => (current === label ? null : label))
  }

  const scheduleDropdownClose = () => {
    closeTimer.current = window.setTimeout(() => setOpenDropdown(null), 100)
  }

  const cancelDropdownClose = () => window.clearTimeout(closeTimer.current)

  return (
    <header className={`header ${scrolled ? 'header-scrolled' : ''}`}>
      <div className="container nav">
        <NavLink className="brand" to="/" onClick={closeMenus} aria-label="Palawan provincial profile home">
          <span className="brand-logo-wrap"><PGPLogo /></span>
          <span className="brand-copy">
            <b>PALAWAN PROFILE</b>
            <small>PROVINCIAL GOVERNMENT OF PALAWAN · PPDO</small>
          </span>
        </NavLink>

        <button
          className="menu-btn"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          aria-expanded={open}
          type="button"
        >
          {open ? <X size={23} /> : <Menu size={23} />}
        </button>

        <nav className={`navlinks ${open ? 'open' : ''}`} aria-label="Primary navigation">
          <NavLink className={({ isActive }) => isActive ? 'active' : ''} to="/" onClick={closeMenus} end>Home</NavLink>

          {menuGroups.map((item) => (
            <div
              className={`nav-item ${item.children ? 'has-dropdown' : ''}`}
              key={item.label}
              onMouseEnter={() => {
                cancelDropdownClose()
                if (item.children) setOpenDropdown(item.label)
              }}
              onMouseLeave={scheduleDropdownClose}
            >
              <NavLink
                to={item.to}
                onClick={(event) => {
                  if (item.children && window.matchMedia('(max-width: 980px)').matches) {
                    event.preventDefault()
                    toggleDropdown(item.label)
                    return
                  }
                  closeMenus()
                }}
                className={({ isActive }) => `${isActive ? 'active' : ''}`.trim()}
              >
                {item.label}
              </NavLink>

              {item.children && (
                <button
                  className="dropdown-toggle"
                  type="button"
                  aria-label={`Open ${item.label} menu`}
                  aria-expanded={openDropdown === item.label}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    toggleDropdown(item.label)
                  }}
                >
                  <ChevronDown size={13} />
                </button>
              )}

              {item.children && (
                <div
                  className={`dropdown-menu ${openDropdown === item.label ? 'visible' : ''}`}
                  onMouseEnter={cancelDropdownClose}
                  onMouseLeave={scheduleDropdownClose}
                >
                  {item.children.map(([label, to]) => (
                    <NavLink key={`${item.label}-${label}`} to={to} onClick={closeMenus}>
                      <span>{label}</span>
                      <ArrowUpRight size={13} />
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ))}

          <NavLink className="nav-cta" to="/profile" onClick={closeMenus}>
            View Data <ArrowUpRight size={15} />
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
