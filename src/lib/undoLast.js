const GAS_URL =
  'https://script.google.com/macros/s/AKfycbycKZyzdNYpbi6DZVkHFZbPGA13F2B8A2w08n6zkr2Oo0u19vLNdlfX5UYBjxqiiWpI/exec'

/**
 * Delete the last row in the sheet via Apps Script.
 * Returns { ok: true, message } or { ok: false, error }
 */
export async function undoLast() {
  try {
    const res = await fetch(`${GAS_URL}?action=undoLast`)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: text || `HTTP ${res.status}` }
    }
    const data = await res.json().catch(() => ({}))
    if (data.ok === false) return { ok: false, error: data.error ?? 'Undo failed' }
    return { ok: true, message: data.message ?? 'Last bet removed' }
  } catch (err) {
    return { ok: false, error: err?.message ?? 'Network error — check sheet manually' }
  }
}
