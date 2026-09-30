import { Mail, MapPin, Phone, Send } from 'lucide-react'
import { useState } from 'react'
import { submitInquiry } from '../api/client.js'

const initial = { name:'', company:'', email:'', phone:'', sector:'', location:'', estimatedInvestment:'', message:'' }

export default function Contact() {
  const [form, setForm] = useState(initial)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  async function handleSubmit(event) {
    event.preventDefault(); setLoading(true); setStatus('')
    try { const result = await submitInquiry(form); setForm(initial); setStatus(result.demo ? result.message : 'Inquiry submitted successfully. The connected office can follow up through the server.') }
    catch (error) { setStatus(error.message || 'Unable to submit the inquiry.') }
    finally { setLoading(false) }
  }
  return <><section className="page-hero"><div className="container"><span className="eyebrow">INVESTOR INQUIRY</span><h1>Start a conversation with Palawan.</h1><p>Tell us what you are exploring and the appropriate office can route the inquiry.</p></div></section><section className="section"><div className="container contact-grid"><form className="contact-form" onSubmit={handleSubmit}><div className="form-grid"><label>Full name<input required name="name" value={form.name} onChange={update}/></label><label>Company / organization<input name="company" value={form.company} onChange={update}/></label><label>Email<input required type="email" name="email" value={form.email} onChange={update}/></label><label>Contact number<input name="phone" value={form.phone} onChange={update}/></label><label>Sector<input name="sector" value={form.sector} onChange={update}/></label><label>Preferred location<input name="location" value={form.location} onChange={update}/></label><label>Estimated investment<input name="estimatedInvestment" value={form.estimatedInvestment} onChange={update} placeholder="Optional"/></label><label className="full">Message<textarea required rows="7" name="message" value={form.message} onChange={update}/></label></div><button className="btn btn-dark" disabled={loading}>{loading ? 'Sending…' : <>Submit Investor Inquiry <Send size={15}/></>}</button>{status && <div className="form-status">{status}</div>}</form><aside className="contact-side"><div><Mail/><h3>Email</h3><p>ppdo@palawan.gov.ph<br/>Replace with the confirmed production contact.</p></div><div><Phone/><h3>Phone</h3><p>Use the official PGP/PPDO telephone details here.</p></div><div><MapPin/><h3>Office</h3><p>Provincial Government of Palawan<br/>Puerto Princesa City, Palawan</p></div></aside></div></section></>
}
