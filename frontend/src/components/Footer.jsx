import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <div className="footer-brand">PALAWAN PROFILE</div>
          <p>Provincial profile data presented from the supplied record, with missing items left unfilled.</p>
        </div>
        <div>
          <h4>Profile</h4>
          <Link to="/profile#geographic">Geographic & Administrative</Link>
          <Link to="/profile#population">Population</Link>
          <Link to="/profile#employment">Employment</Link>
        </div>
        <div>
          <h4>Community</h4>
          <Link to="/profile#religious-affiliation">Religious Affiliation</Link>
          <Link to="/locations">Municipalities</Link>
        </div>
        <div>
          <h4>Education</h4>
          <Link to="/profile#higher-education">Higher Education / Talent Pool</Link>
          <Link to="/profile#tvet">TVET</Link>
        </div>
      </div>
      <div className="footer-bottom"><div className="container"><span>© Provincial Government of Palawan · PPDO</span><span>Brief Provincial Profile</span></div></div>
    </footer>
  )
}
