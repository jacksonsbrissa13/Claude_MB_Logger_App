import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { fetchStats } from '../lib/fetchStats'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const CHART_FONT = { family: "'JetBrains Mono', ui-monospace, monospace", size: 10 }

const baseChartOptions = {
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0f0f1a',
      titleColor: '#c8d0e0',
      bodyColor: '#c8d0e0',
      borderColor: '#1e1e30',
      borderWidth: 1,
      titleFont: CHART_FONT,
      bodyFont: CHART_FONT,
    },
  },
}

const barScales = {
  x: {
    grid: { color: '#1e1e30' },
    ticks: { color: '#4a5568', font: CHART_FONT },
    border: { color: '#1e1e30' },
  },
  y: {
    grid: { color: '#1e1e30' },
    ticks: { color: '#4a5568', font: CHART_FONT },
    border: { color: '#1e1e30' },
  },
}

const ACTIVITY_COLOURS = [
  'rgba(0,255,157,0.7)',
  'rgba(245,158,11,0.7)',
  'rgba(100,120,180,0.7)',
  'rgba(255,68,102,0.7)',
  'rgba(80,200,220,0.7)',
  'rgba(160,100,220,0.7)',
]

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className={`stat-card-value${value == null ? ' dim' : ''}`}>
        {value ?? '—'}
      </div>
    </div>
  )
}

export function StatsPanel({ refreshTrigger = 0 }) {
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchStats('today').then(data => {
      if (!cancelled) {
        setStats(data)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [refreshTrigger])

  // ── Derived chart data ────────────────────────────────────────────────────

  const betsPerDayData = stats?.betsPerDay
    ? {
        labels: stats.betsPerDay.map(d => d.label),
        datasets: [{
          data: stats.betsPerDay.map(d => d.count),
          backgroundColor: 'rgba(0,255,157,0.25)',
          borderColor: '#00ff9d',
          borderWidth: 1,
          borderRadius: 2,
        }],
      }
    : null

  const activityData = stats?.activityBreakdown?.length
    ? {
        labels: stats.activityBreakdown.map(d => d.label),
        datasets: [{
          data: stats.activityBreakdown.map(d => d.value),
          backgroundColor: ACTIVITY_COLOURS,
          borderColor: '#0a0a0f',
          borderWidth: 2,
        }],
      }
    : null

  const topBookiesData = stats?.topBookies?.length
    ? {
        labels: stats.topBookies.map(d => d.label),
        datasets: [{
          data: stats.topBookies.map(d => d.stake),
          backgroundColor: 'rgba(245,158,11,0.25)',
          borderColor: '#f59e0b',
          borderWidth: 1,
          borderRadius: 2,
        }],
      }
    : null

  const sportRacing = stats
    ? `${stats.sportCount}S / ${stats.racingCount}R`
    : null

  return (
    <section className="stats-panel">
      {/* Header row */}
      <div className="stats-header">
        <span className="stats-period-label">TODAY</span>
        {loading && <span className="stats-spinner">●</span>}
      </div>

      {/* Scrollable body */}
      <div className="stats-body">
        {!loading && !stats && (
          <p className="stats-error">STATS UNAVAILABLE — CONFIGURE GAS ENDPOINT</p>
        )}

        <div className="stat-cards">
          <StatCard label="Total Bets"     value={stats?.totalBets} />
          <StatCard label="Promo Stake"    value={stats ? `$${stats.promoStake}` : null} />
          <StatCard label="Bonus Stake"    value={stats ? `$${stats.bonusStake}` : null} />
          <StatCard label="Non-Promo"      value={stats ? `$${stats.nonPromoStake}` : null} />
          <StatCard label="Sport / Racing" value={sportRacing} />
        </div>

        <div className="chart-section">
          <div className="chart-section-label">BETS / DAY (LAST 7)</div>
          <div className="chart-wrap">
            {betsPerDayData
              ? <Bar data={betsPerDayData} options={{ ...baseChartOptions, scales: barScales }} />
              : <div className="chart-empty">—</div>
            }
          </div>
        </div>

        <div className="chart-section">
          <div className="chart-section-label">ACTIVITY SPLIT</div>
          <div className="chart-wrap">
            {activityData
              ? <Doughnut
                  data={activityData}
                  options={{
                    ...baseChartOptions,
                    cutout: '65%',
                    plugins: {
                      ...baseChartOptions.plugins,
                      legend: {
                        display: true,
                        position: 'right',
                        labels: { color: '#4a5568', font: CHART_FONT, boxWidth: 10, padding: 8 },
                      },
                    },
                  }}
                />
              : <div className="chart-empty">—</div>
            }
          </div>
        </div>

        <div className="chart-section">
          <div className="chart-section-label">TOP BOOKIES — TODAY'S STAKE</div>
          <div className="chart-wrap">
            {topBookiesData
              ? <Bar data={topBookiesData} options={{ ...baseChartOptions, scales: barScales }} />
              : <div className="chart-empty">—</div>
            }
          </div>
        </div>
      </div>
    </section>
  )
}
