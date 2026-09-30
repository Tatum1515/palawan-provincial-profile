import { useState } from 'react'

const OFFICIAL_LOGO_URL = 'https://palawan.gov.ph/wp-content/uploads/2023/12/cropped-pgp-logo-2.png'

export default function PGPLogo({ className = '', alt = 'Provincial Government of Palawan logo' }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <span className={`brand-fallback ${className}`} aria-label={alt}>P</span>
  }

  return (
    <img
      className={`pgp-logo ${className}`.trim()}
      src={OFFICIAL_LOGO_URL}
      alt={alt}
      loading="eager"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
