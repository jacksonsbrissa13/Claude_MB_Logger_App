/**
 * StatusMessage — inline feedback for success, error, or info states.
 * @param {'success'|'error'|'info'} type
 * @param {string} message
 */
export function StatusMessage({ type, message }) {
  if (!message) return null
  return (
    <div className={`status-msg ${type}`} role="status" aria-live="polite">
      {message}
    </div>
  )
}

/**
 * PostingProgress — shows per-bet posting status while in-flight.
 * @param {{ bookie: string, done: boolean, ok: boolean|null }[]} items
 */
export function PostingProgress({ items }) {
  return (
    <div className="posting-list">
      {items.map((item, i) => (
        <div
          key={i}
          className={`posting-item${item.done ? (item.ok ? ' done' : ' fail') : ''}`}
        >
          <span className="post-icon">
            {!item.done ? <SmallSpinner /> : item.ok ? '✓' : '✗'}
          </span>
          <span>{item.bookie}</span>
        </div>
      ))}
    </div>
  )
}

function SmallSpinner() {
  return <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} />
}
