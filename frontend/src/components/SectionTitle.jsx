export default function SectionTitle({ eyebrow, title, children, align = 'left' }) {
  return (
    <div className={`section-title section-title-${align}`}>
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  )
}
