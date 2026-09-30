import { Outlet } from 'react-router-dom'
import TopBar from './TopBar.jsx'
import Header from './Header.jsx'
import Footer from './Footer.jsx'

export default function Layout() {
  return <><TopBar /><Header /><main id="main-content" className="page-shell"><Outlet /></main><Footer /></>
}
