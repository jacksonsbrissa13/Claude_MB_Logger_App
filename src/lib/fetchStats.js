const GAS_URL =
  'https://script.google.com/macros/s/AKfycbycKZyzdNYpbi6DZVkHFZbPGA13F2B8A2w08n6zkr2Oo0u19vLNdlfX5UYBjxqiiWpI/exec'

/**
 * Fetch aggregated stats from Apps Script.
 * @param {'today'|'week'|'month'} period
 * @returns {Promise<object|null>} null on any failure
 *
 * Expected shape:
 * {
 *   period, totalBets,
 *   promoStake, bonusStake, nonPromoStake,
 *   sportCount, racingCount,
 *   betsPerDay:        [{ label, count }],   // last 7 days
 *   activityBreakdown: [{ label, value }],
 *   topBookies:        [{ label, stake }],   // top 5 by backStake
 * }
 */
export async function fetchStats(period = 'today') {
  try {
    const res = await fetch(`${GAS_URL}?action=getStats&period=${period}`)
    if (!res.ok) return null
    const data = await res.json()
    return data ?? null
  } catch {
    return null
  }
}
