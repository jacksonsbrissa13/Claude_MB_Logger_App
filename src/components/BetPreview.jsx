const FIELDS = [
  { key: 'date',      label: 'Date' },
  { key: 'activity',  label: 'Activity' },
  { key: 'bookie',    label: 'Bookie' },
  { key: 'sport',     label: 'Sport' },
  { key: 'isSystem',  label: 'System',    type: 'bool' },
  { key: 'backStake', label: 'Back Stake' },
  { key: 'backOdds',  label: 'Back Odds' },
  { key: 'layBookie', label: 'Lay Bookie' },
  { key: 'layStake',  label: 'Lay Stake' },
  { key: 'layOdds',   label: 'Lay Odds' },
  { key: 'layComm',   label: 'Lay Comm' },
  { key: 'notes',     label: 'Notes' },
]

/**
 * BetPreview — shows parsed bets as editable tables.
 * @param {object[]} bets - Array of bet objects
 * @param {function} onChange - (index, field, value) => void
 * @param {function} onConfirm
 * @param {function} onCancel
 * @param {boolean} posting
 */
export function BetPreview({ bets, onChange, onConfirm, onCancel, posting }) {
  return (
    <div className="preview-wrap">
      {bets.length > 1 && (
        <div className="preview-count">{bets.length} bets to log</div>
      )}

      {bets.map((bet, idx) => (
        <div className="bet-card" key={idx}>
          {bets.length > 1 && (
            <div className="bet-card-header">Bet {idx + 1} — {bet.bookie}</div>
          )}
          <table className="bet-table">
            <tbody>
              {FIELDS.map(({ key, label, type }) => {
                const val = bet[key]
                // Skip empty lay fields for deposits/withdrawals
                if (
                  ['layBookie','layStake','layOdds','layComm','backOdds'].includes(key) &&
                  (val === '' || val === null || val === undefined) &&
                  ['Deposit','Withdrawal'].includes(bet.activity)
                ) return null

                return (
                  <tr key={key}>
                    <td>{label}</td>
                    <td>
                      {type === 'bool' ? (
                        <select
                          className="field-input"
                          value={val ? 'true' : 'false'}
                          onChange={e => onChange(idx, key, e.target.value === 'true')}
                        >
                          <option value="false">No</option>
                          <option value="true">Yes</option>
                        </select>
                      ) : (
                        <input
                          className="field-input"
                          value={val ?? ''}
                          onChange={e => onChange(idx, key, e.target.value)}
                        />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}

      <div className="btn-row">
        <button className="btn btn-cancel" onClick={onCancel} disabled={posting}>
          Cancel
        </button>
        <button className="btn btn-confirm" onClick={onConfirm} disabled={posting}>
          {posting ? 'Posting…' : `Confirm${bets.length > 1 ? ` (${bets.length})` : ''}`}
        </button>
      </div>
    </div>
  )
}
