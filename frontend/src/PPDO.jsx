import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Economy from './pages/Economy.jsx'
import Locations from './pages/Locations.jsx'
import NotFound from './pages/NotFound.jsx'
import IntroPresentation from './components/IntroPresentation.jsx'

export default function PPDO() {
  return (
    <>
      <IntroPresentation />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Economy />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  )
}
