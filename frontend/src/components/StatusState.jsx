import { AlertCircle, LoaderCircle, SearchX } from 'lucide-react'
import '../styles/status-state.css'

const icons = {
  loading: LoaderCircle,
  empty: SearchX,
  error: AlertCircle,
}

export default function StatusState({
  type = 'empty',
  title,
  description,
  action,
  compact = false,
}) {
  const Icon = icons[type] || SearchX
  const isLoading = type === 'loading'

  return (
    <div
      className={`status-state status-state-${type}${compact ? ' status-state-compact' : ''}`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <span className="status-state-icon" aria-hidden="true">
        <Icon className={isLoading ? 'status-state-spin' : undefined} size={compact ? 18 : 22} />
      </span>
      <div className="status-state-copy">
        {title && <strong>{title}</strong>}
        {description && <p>{description}</p>}
        {action && <div className="status-state-action">{action}</div>}
      </div>
    </div>
  )
}
