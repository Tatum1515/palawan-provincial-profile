import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import NotFound from './pages/NotFound.jsx'

const Economy = lazy(() => import('./pages/Economy.jsx'))
const DataExplorer = lazy(() => import('./pages/DataExplorer.jsx'))
const Locations = lazy(() => import('./pages/Locations.jsx'))
const WhyPalawan = lazy(() => import('./pages/WhyPalawan.jsx'))
const DoingBusiness = lazy(() => import('./pages/DoingBusiness.jsx'))
const Resources = lazy(() => import('./pages/Resources.jsx'))
const News = lazy(() => import('./pages/News.jsx'))
const Contact = lazy(() => import('./pages/Contact.jsx'))
const Opportunities = lazy(() => import('./pages/Opportunities.jsx'))
const OpportunityDetail = lazy(() => import('./pages/OpportunityDetail.jsx'))

const metadata = {
  '/': ['PPDO | Palawan Provincial Profile', 'Brief Provincial Profile of the Province of Palawan.'],
  '/profile': ['Provincial Profile | PPDO Palawan', 'Provincial geographic, demographic, employment, education and TVET information.'],
  '/economy': ['Provincial Profile | PPDO Palawan', 'Provincial geographic, demographic, employment, education and TVET information.'],
  '/locations': ['Municipalities | PPDO Palawan', 'Municipality directory and location information for Palawan.'],
  '/data': ['Data Explorer | PPDO Palawan', 'Searchable provincial indicators, reference years, and source information.'],
  '/why-palawan': ['Why Palawan | PPDO', 'Provincial context and investment information for Palawan.'],
  '/doing-business': ['Doing Business | PPDO Palawan', 'Business and investment guidance for Palawan.'],
  '/opportunities': ['Investment Opportunities | PPDO Palawan', 'Investment opportunity portfolio for Palawan.'],
  '/resources': ['Resources | PPDO Palawan', 'Reference documents and resources for investors and partners.'],
  '/news': ['News & Events | PPDO Palawan', 'Official updates and investment-related announcements.'],
  '/contact': ['Investor Inquiry | PPDO Palawan', 'Contact the appropriate provincial office regarding an investment inquiry.'],
}

function RouteMetadata() {
  const { pathname } = useLocation()
  useEffect(() => {
    const [title, description] = metadata[pathname] || ['Page not found | PPDO Palawan', 'The requested PPDO Palawan page could not be found.']
    document.title = title
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = description
    for (const [property, content] of [['og:title', title], ['og:description', description], ['twitter:title', title], ['twitter:description', description]]) {
      let tag = document.querySelector(`meta[property="${property}"], meta[name="${property}"]`)
      if (!tag) {
        tag = document.createElement('meta')
        if (property.startsWith('og:')) tag.setAttribute('property', property)
        else tag.setAttribute('name', property)
        document.head.appendChild(tag)
      }
      tag.content = content
    }
  }, [pathname])
  return null
}

function PageFallback() {
  return <div className="page-loading" role="status" aria-live="polite">Loading page…</div>
}

export default function PPDO() {
  return <>
    <RouteMetadata />
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Economy />} />
          <Route path="/economy" element={<Economy />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/data" element={<DataExplorer />} />
          <Route path="/why-palawan" element={<WhyPalawan />} />
          <Route path="/doing-business" element={<DoingBusiness />} />
          <Route path="/opportunities" element={<Opportunities />} />
          <Route path="/opportunities/:id" element={<OpportunityDetail />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/news" element={<News />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  </>
}
