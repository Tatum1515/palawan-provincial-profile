import { ArrowUpRight, Map, BarChart3 } from 'lucide-react'
import { Link } from 'react-router-dom'

const profileLinks = [
  ['Geographic & Administrative', '/profile#geographic'],
  ['Population', '/profile#population'],
  ['Employment', '/profile#employment'],
  ['Religious Affiliation', '/profile#religious-affiliation'],
  ['Higher Education / Talent Pool', '/profile#higher-education'],
  ['TVET', '/profile#tvet'],
]

export default function Footer() {
  return (
    <footer className="footer site-footer">
      <div className="container footer-topline">
        <div className="footer-intro">
          <span className="footer-kicker">PROVINCIAL GOVERNMENT OF PALAWAN · PPDO</span>
          <h2>A source-focused provincial profile.</h2>
          <p>
            Geographic, population, employment, community, education, and training information presented from the supplied provincial profile record.
          </p>
          <div className="footer-actions">
            <Link className="footer-action-primary" to="/profile">
              <BarChart3 size={16} />
              Explore provincial data
              <ArrowUpRight size={14} />
            </Link>
            <Link className="footer-action-secondary" to="/locations">
              <Map size={16} />
              Municipalities
            </Link>
          </div>
        </div>

        <div className="footer-link-column">
          <h4>Provincial Profile</h4>
          {profileLinks.map(([label, to]) => <Link key={to} to={to}>{label}</Link>)}
        </div>

        <div className="footer-link-column footer-link-column-short">
          <h4>Explore</h4>
          <Link to="/">Home</Link>
          <Link to="/profile">Complete Profile</Link>
          <Link to="/locations">Municipality Directory</Link>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <span>© Provincial Government of Palawan · PPDO</span>
          <span>Brief Provincial Profile</span>
          <Link to="/" aria-label="Back to Palawan Profile home">Back to top <ArrowUpRight size={13} /></Link>
        </div>
      </div>
    </footer>
  )
}
