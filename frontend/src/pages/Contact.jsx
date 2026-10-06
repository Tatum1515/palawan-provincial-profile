import { Mail, MapPin, Phone, Send } from 'lucide-react'
import { useState } from 'react'
import { submitInquiry } from '../api/client.js'

const initial = { name:'', company:'', email:'', phone:'', sector:'', location:'', estimatedInvestment:'', message:'', website:'' }

export default function Contact() {
  const [form, setForm] = useState(initial)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setStatus(null)
    try {
      await submitInquiry(form)
      setForm(initial)
      setStatus({ type: 'success', message: 'Inquiry submitted successfully. The connected office can follow up through the server.' })
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to submit the inquiry.' })
    } finally {
      setLoading(false)
    }
  }

  return <>
    <section className="page-hero"><div className="container"><span className="eyebrow">INVESTOR INQUIRY</span><h1>Start a conversation with Palawan.</h1><p>Tell us what you are exploring and the appropriate office can route the inquiry.</p></div></section>
    <section className="section"><div className="container contact-grid">
      <form className="contact-form" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <label>Full name<input required maxLength="120" name="name" value={form.name} onChange={update} autoComplete="name" /></label>
          <label>Company / organization<input maxLength="160" name="company" value={form.company} onChange={update} autoComplete="organization" /></label>
          <label>Email<input required maxLength="254" type="email" name="email" value={form.email} onChange={update} autoComplete="email" /></label>
          <label>Contact number<input maxLength="40" name="phone" value={form.phone} onChange={update} autoComplete="tel" /></label>
          <label>Sector<input maxLength="120" name="sector" value={form.sector} onChange={update} /></label>
          <label>Preferred location<input maxLength="160" name="location" value={form.location} onChange={update} /></label>
          <label>Estimated investment<input maxLength="120" name="estimatedInvestment" value={form.estimatedInvestment} onChange={update} placeholder="Optional" /></label>
          <label className="full">Message<textarea required maxLength="5000" rows="7" name="message" value={form.message} onChange={update} /></label>
          <label className="contact-honeypot" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" name="website" value={form.website} onChange={update} /></label>
        </div>
        <button className="btn btn-dark" disabled={loading} type="submit">{loading ? 'Sending…' : <>Submit Investor Inquiry <Send size={15} /></>}</button>
        {status && <div className={`form-status form-status-${status.type}`} role={status.type === 'error' ? 'alert' : 'status'} aria-live="polite">{status.message}</div>}
      </form>
      <aside className="contact-side" aria-label="Office contact information">
        <div><Mail aria-hidden="true"/><h3>Email</h3><p>ppdo@palawan.gov.ph</p></div>
        <div><Phone aria-hidden="true"/><h3>Phone</h3><p>Contact details should be confirmed by PPDO before public launch.</p></div>
        <div><MapPin aria-hidden="true"/><h3>Office</h3><p>Provincial Government of Palawan<br/>Puerto Princesa City, Palawan</p></div>
      </aside>
    </div></section>
  </>
}
