import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

export default function AccessibleLeafletControls() {
  const map = useMap()

  useEffect(() => {
    const root = map.getContainer()
    const zoomControl = root.querySelector('.leaflet-control-zoom')
    const controls = [
      ['.leaflet-control-zoom-in', 'Zoom in'],
      ['.leaflet-control-zoom-out', 'Zoom out'],
    ]

    zoomControl?.setAttribute('role', 'group')
    zoomControl?.setAttribute('aria-label', 'Map zoom controls')

    controls.forEach(([selector, label]) => {
      const element = root.querySelector(selector)
      if (!element) return
      element.setAttribute('aria-label', label)
      element.setAttribute('title', label)
      element.setAttribute('tabindex', '0')
    })
  }, [map])

  return null
}
