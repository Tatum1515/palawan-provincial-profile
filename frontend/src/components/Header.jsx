import { ArrowUpRight, BriefcaseBusiness, ChevronDown, Compass, Home, Lightbulb, Mail, MapPinned, Menu, Newspaper, PackageOpen, Sparkles, UserRound, X } from 'lucide-react'
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
      ['Data Explorer', '/data'],
    ],
  },
  { label: 'Municipalities', to: '/locations' },
  { label: 'Why Palawan', to: '/why-palawan' },
  { label: 'Doing Business', to: '/doing-business' },
  { label: 'Opportunities', to: '/opportunities' },
  { label: 'Resources', to: '/resources' },
  { label: 'News', to: '/news' },
  { label: 'Contact', to: '/contact' },
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const closeTimer = useRef(null)
  const menuButtonRef = useRef(null)

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

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpenDropdown(null)
        if (open) {
          setOpen(false)
          menuButtonRef.current?.focus()
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    document.body.classList.toggle('nav-menu-open', open)
    return () => document.body.classList.remove('nav-menu-open')
  }, [open])

  const closeMenus = () => { setOpen(false); setOpenDropdown(null) }
  const toggleDropdown = (label) => setOpenDropdown((current) => (current === label ? null : label))
  const scheduleDropdownClose = () => { closeTimer.current = window.setTimeout(() => setOpenDropdown(null), 140) }
  const cancelDropdownClose = () => window.clearTimeout(closeTimer.current)

  const getNavIcon = (label) => ({
    Home,
    'Provincial Profile': UserRound,
    Municipalities: MapPinned,
    'Why Palawan': Lightbulb,
    'Doing Business': BriefcaseBusiness,
    Opportunities: Compass,
    Resources: PackageOpen,
    News: Newspaper,
    Contact: Mail,
  }[label] || Sparkles)

  const handleDropdownKeyDown = (event, item) => {
    if (!item.children) return
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpenDropdown(item.label)
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpenDropdown(null)
    }
  }

  return <header className={`header ${scrolled ? 'header-scrolled' : ''}`}>
    <div className="container nav">
      <NavLink className="brand" to="/" onClick={closeMenus} aria-label="Palawan provincial profile home"><span className="brand-logo-wrap"><PGPLogo /></span></NavLink>
      <button ref={menuButtonRef} className="menu-btn" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="primary-navigation" type="button">{open ? <X size={23} /> : <Menu size={23} />}</button>
      <nav id="primary-navigation" className={`navlinks ${open ? 'open' : ''}`} aria-label="Primary navigation">
        <NavLink className={({ isActive }) => isActive ? 'active' : ''} to="/" onClick={closeMenus} end><span className="nav-link-content"><Home aria-hidden="true" size={15} strokeWidth={1.8} />Home</span></NavLink>
        {menuGroups.map((item) => {
          const dropdownId = `nav-dropdown-${item.label.toLowerCase().replaceAll(' ', '-')}`
          const Icon = getNavIcon(item.label)
          return <div className={`nav-item ${item.children ? 'has-dropdown' : ''}`} key={item.label} onMouseEnter={() => { cancelDropdownClose(); if (item.children) setOpenDropdown(item.label) }} onMouseLeave={scheduleDropdownClose}>
            <NavLink to={item.to} onKeyDown={(event) => handleDropdownKeyDown(event, item)} onClick={(event) => { if (item.children && window.matchMedia('(max-width: 980px)').matches) { event.preventDefault(); toggleDropdown(item.label); return } closeMenus() }} className={({ isActive }) => `${isActive ? 'active' : ''}`.trim()} aria-haspopup={item.children ? 'true' : undefined} aria-expanded={item.children ? openDropdown === item.label : undefined}><span className="nav-link-content"><Icon aria-hidden="true" size={15} strokeWidth={1.8} />{item.label}</span></NavLink>
            {item.children && <button className="dropdown-toggle" type="button" aria-label={`Open ${item.label} menu`} aria-expanded={openDropdown === item.label} aria-controls={dropdownId} onClick={(event) => { event.preventDefault(); event.stopPropagation(); toggleDropdown(item.label) }}><ChevronDown size={13} aria-hidden="true" /></button>}
            {item.children && <div id={dropdownId} className={`dropdown-menu ${openDropdown === item.label ? 'visible' : ''}`} onMouseEnter={cancelDropdownClose} onMouseLeave={scheduleDropdownClose}>{item.children.map(([label, to]) => <NavLink key={`${item.label}-${label}`} to={to} onClick={closeMenus}>{label}<ArrowUpRight size={13} aria-hidden="true" /></NavLink>)}</div>}
          </div>
        })}
        <NavLink className="nav-cta" to="/opportunities" onClick={closeMenus}><Compass aria-hidden="true" size={15} strokeWidth={1.9} />View Opportunities <ArrowUpRight size={15} aria-hidden="true" /></NavLink>
      </nav>
      {open && <button className="nav-backdrop" type="button" aria-label="Close navigation menu" onClick={closeMenus} /> }
    </div>
  </header>
}
