import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const GOVERNOR_IMAGE = '/images/governor-amy-roa-alvarez.png'

export default function GovernorFeature() {
  return (
    <section className="governor-feature" aria-labelledby="governor-feature-title">
      <div className="governor-photo-wrap">
        <img
          src={GOVERNOR_IMAGE}
          alt="Provincial Government of Palawan leadership feature"
          className="governor-photo"
          loading="lazy"
          decoding="async"
        />
        <div className="governor-photo-vignette" aria-hidden="true" />
        <span className="governor-photo-label">OFFICE OF THE GOVERNOR</span>
      </div>

      <div className="governor-copy">
        <span className="eyebrow">PROVINCIAL LEADERSHIP</span>
        <h2 id="governor-feature-title">Provincial Government of Palawan.</h2>
        <p>
          This portal keeps the supplied provincial profile together in one source-focused view, covering geography, population, employment, community profile, education, and technical-vocational training data.
        </p>

        <div className="governor-meta">
          <div>
            <strong>PROVINCIAL GOVERNOR</strong>
            <span>OFFICE OF THE GOVERNOR</span>
          </div>
          <span className="governor-note">Profile data is presented as supplied.</span>
        </div>

        <Link className="text-link" to="/profile">
          View the complete provincial profile <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  )
}
