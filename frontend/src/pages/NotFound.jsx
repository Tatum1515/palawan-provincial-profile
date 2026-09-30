import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <span className="eyebrow">PROVINCIAL PROFILE</span>
        <h1>Section not included in the current profile.</h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
          The website is currently focused on the data supplied in the Brief Provincial Profile.
        </p>
        <Link className="btn btn-dark" to="/profile">View Provincial Profile</Link>
      </div>
    </section>
  )
}
