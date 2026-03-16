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

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'This Week' },
  { key: 'month', label: 'This Month' },
]

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
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value ?? '—'}</div>
    </div>
  )
}

export function StatsPanel({ refreshTrigger = 0 }) {
  const [activePeriod, setActivePeriod] = useState('today')
  const [stats, setStats]               = useState(null)
  const [loading, setLoading]           = useState(true)
  const [monthStats, setMonthStats]     = useState(null)

  // Fetch period stats whenever period or refreshTrigger changes
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchStats(activePeriod).then(data => {
      if (!cancelled) {
        setStats(data)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [activePeriod, refreshTrigger])

  // Top bookies always reads month data
  useEffect(() => {
    let cancelled = false
    fetchStats('month').then(data => {
      if (!cancelled) setMonthStats(data)
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

  const topBookiesData = monthStats?.topBookies?.length
    ? {
        labels: monthStats.topBookies.map(d => d.label),
        datasets: [{
          data: monthStats.topBookies.map(d => d.stake),
          backgroundColor: 'rgba(245,158,11,0.25)',
          borderColor: '#f59e0b',
          borderWidth: 1,
          borderRadius: 2,
        }],
      }
    : null

  // ── Stat card values ──────────────────────────────────────────────────────

  const sportRacing = stats
    ? `${stats.sportCount}S / ${stats.racingCount}R`
    : null

  return (
    <section className="stats-panel">
      {/* Period tabs */}
      <div className="stats-tabs">
        {PERIODS.map(p => (
          <button
            key={p.key}
            className={`stats-tab${activePeriod === p.key ? ' active' : ''}`}
            onClick={() => setActivePeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
        {loading && <span className="stats-loading">●</span>}
      </div>

      {/* Error / unavailable notice */}
      {!loading && !stats && (
        <p className="stats-error">STATS UNAVAILABLE — CONFIGURE GAS ENDPOINT</p>
      )}

      {/* Stat cards */}
      <div className="stat-cards">
        <StatCard label="Total Bets"    value={stats?.totalBets} />
        <StatCard label="Promo Stake"   value={stats ? `$${stats.promoStake}` : null} />
        <StatCard label="Bonus Stake"   value={stats ? `$${stats.bonusStake}` : null} />
        <StatCard label="Non-Promo"     value={stats ? `$${stats.nonPromoStake}` : null} />
        <StatCard label="Sport / Racing" value={sportRacing} />
      </div>

      {/* Charts */}
      <div className="chart-section">
        <div className="chart-label">BETS / DAY (LAST 7)</div>
        <div className="chart-wrap">
          {betsPerDayData
            ? <Bar
                data={betsPerDayData}
                options={{ ...baseChartOptions, scales: barScales }}
              />
            : <div className="chart-empty">—</div>
          }
        </div>
      </div>

      <div className="chart-section">
        <div className="chart-label">ACTIVITY SPLIT</div>
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
        <div className="chart-label">TOP BOOKIES — MONTH STAKE</div>
        <div className="chart-wrap">
          {topBookiesData
            ? <Bar
                data={topBookiesData}
                options={{ ...baseChartOptions, scales: barScales }}
              />
            : <div className="chart-empty">—</div>
          }
        </div>
      </div>
    </section>
  )
}
