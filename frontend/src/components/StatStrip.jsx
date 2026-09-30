export default function StatStrip({ items }) {
  return (
    <div className="stat-strip" aria-label="Palawan at a glance">
      {items.map((item) => (
        <div className="stat" key={item.label}>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
          <small>{item.note}</small>
        </div>
      ))}
    </div>
  )
}
