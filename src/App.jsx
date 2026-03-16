import { useState, useEffect, useCallback } from 'react'
import { MicButton } from './components/MicButton'
import { BetPreview } from './components/BetPreview'
import { StatusMessage, PostingProgress } from './components/StatusMessage'
import { StatsPanel } from './components/StatsPanel'
import { Marquee } from './components/Marquee'
import { useVoice } from './hooks/useVoice'
import { parseWithClaude } from './lib/parseWithClaude'
import { postBets } from './lib/postBet'
import { fetchBookies } from './lib/fetchBookies'
import { undoLast } from './lib/undoLast'

// States: idle | listening | parsing | preview | posting | result
const LAST_BET_KEY = 'mbVoiceLogger_lastBet'

function loadLastBet() {
  try {
    const raw = localStorage.getItem(LAST_BET_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveLastBet(bets) {
  try {
    localStorage.setItem(LAST_BET_KEY, JSON.stringify(bets[0]))
  } catch {}
}

function formatClock(d) {
  return d.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export default function App() {
  const [appState, setAppState]         = useState('idle')
  const [bets, setBets]                 = useState([])
  const [postingItems, setPostingItems] = useState([])
  const [statusMsg, setStatusMsg]       = useState(null) // { type, message }
  const [bookieList, setBookieList]     = useState([])
  const [anyFailed, setAnyFailed]       = useState(false)
  const [clock, setClock]               = useState(() => formatClock(new Date()))
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [marqueeIndex, setMarqueeIndex] = useState(0)
  const [undoStatus, setUndoStatus]     = useState(null) // { type, message } | null

  const lastBet = loadLastBet()

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setClock(formatClock(new Date())), 1000)
    return () => clearInterval(t)
  }, [])

  // Fetch bookie list on mount
  useEffect(() => {
    fetchBookies().then(setBookieList)
  }, [])

  // Auto-clear result state: 3s on full success, 8s when any bet failed
  useEffect(() => {
    if (appState === 'result') {
      const t = setTimeout(() => {
        setAppState('idle')
        setStatusMsg(null)
        setPostingItems([])
        setAnyFailed(false)
      }, anyFailed ? 8000 : 3000)
      return () => clearTimeout(t)
    }
  }, [appState, anyFailed])

  // Auto-clear undo status after 4s
  useEffect(() => {
    if (undoStatus) {
      const t = setTimeout(() => setUndoStatus(null), 4000)
      return () => clearTimeout(t)
    }
  }, [undoStatus])

  const handleFinalTranscript = useCallback(async (transcript) => {
    if (!transcript.trim()) {
      setAppState('idle')
      return
    }

    setAppState('parsing')

    const isSameVariation = /\bsame\b/i.test(transcript)
    const prevBet = isSameVariation ? loadLastBet() : null

    try {
      const parsed = await parseWithClaude(transcript, bookieList, prevBet)
      if (!parsed.length) {
        setStatusMsg({ type: 'error', message: 'Could not parse bet. Try again.' })
        setAppState('result')
        return
      }
      setBets(parsed)
      setAppState('preview')
    } catch (err) {
      setStatusMsg({ type: 'error', message: `Parse error: ${err?.message ?? 'Unknown'}` })
      setAppState('result')
    }
  }, [bookieList])

  const { transcript, listening, start, stop, reset, supported } = useVoice({
    onFinalTranscript: handleFinalTranscript,
  })

  const handleMicToggle = useCallback(() => {
    if (listening) {
      stop()
    } else {
      reset()
      setAppState('listening')
      start()
    }
  }, [listening, reset, start, stop])

  // Spacebar shortcut — start/stop recording
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== ' ' || e.metaKey || e.ctrlKey || e.altKey) return
      const tag = document.activeElement?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if (!['idle', 'listening'].includes(appState)) return
      e.preventDefault()
      handleMicToggle()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [appState, handleMicToggle])

  function handleBetChange(idx, field, value) {
    setBets(prev => prev.map((bet, i) =>
      i === idx ? { ...bet, [field]: value } : bet
    ))
  }

  async function handleConfirm() {
    setAppState('posting')
    const items = bets.map(b => ({ bookie: b.bookie, done: false, ok: null }))
    setPostingItems(items)

    const results = await postBets(bets)

    setPostingItems(results.map(r => ({
      bookie: r.bookie,
      done: true,
      ok: r.ok,
      error: r.error ?? null,
    })))

    const allOk     = results.every(r => r.ok)
    const failed    = results.filter(r => !r.ok)
    const succeeded = results.filter(r => r.ok)

    setAnyFailed(!allOk)

    if (allOk) {
      saveLastBet(bets)
      setStatusMsg({
        type: 'success',
        message: bets.length === 1
          ? `Logged: ${bets[0].bookie}`
          : `All ${bets.length} bets logged`,
      })
    } else if (succeeded.length === 0) {
      setStatusMsg({ type: 'error', message: 'All bets failed — add rows manually' })
    } else {
      saveLastBet(bets)
      setStatusMsg({
        type: 'error',
        message: `${succeeded.length}/${bets.length} logged — add ${failed.map(f => f.bookie).join(', ')} manually`,
      })
    }

    if (allOk || succeeded.length > 0) {
      setRefreshTrigger(n => n + 1)
      setMarqueeIndex(n => n + 1)
    }

    setAppState('result')
  }

  function handleCancel() {
    reset()
    setBets([])
    setAppState('idle')
  }

  function handleSameLast() {
    if (!lastBet) return
    setBets([lastBet])
    setAppState('preview')
  }

  async function handleUndo() {
    const result = await undoLast()
    if (result.ok) {
      localStorage.removeItem(LAST_BET_KEY)
      setUndoStatus({ type: 'success', message: result.message ?? 'Last bet removed' })
      setRefreshTrigger(n => n + 1)
    } else {
      setUndoStatus({ type: 'error', message: result.error ?? 'Undo failed' })
    }
  }

  const isBusy       = ['parsing', 'posting'].includes(appState)
  const showMic      = ['idle', 'listening'].includes(appState)
  const showTranscript = appState === 'listening' || (transcript && appState !== 'idle')
  const showParsing  = appState === 'parsing'
  const showPreview  = appState === 'preview'
  const showPosting  = appState === 'posting'
  const showResult   = appState === 'result'

  return (
    <div className="app">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className="app-topbar">
        <span className="app-title">MB VOICE LOGGER</span>
        <div className="topbar-right">
          {bookieList.length > 0 && (
            <span className="topbar-bookies">{bookieList.length} BOOKIES</span>
          )}
          <span className="topbar-clock">{clock}</span>
        </div>
      </header>

      {/* ── Left panel — mic input ───────────────────────────────────── */}
      <main className="app-left">
        {!supported && (
          <div className="unsupported-banner">
            Voice not supported in this browser. Use Chrome for full functionality.
          </div>
        )}

        {showMic && (
          <MicButton
            listening={listening}
            onToggle={handleMicToggle}
            disabled={!supported || isBusy}
          />
        )}

        {showMic && (
          <p className="spacebar-hint">PRESS SPACE TO {listening ? 'STOP' : 'START'}</p>
        )}

        {showTranscript && (
          <div className={`transcript-box${listening ? ' active' : ''}`}>
            {transcript
              ? transcript
              : <span className="transcript-placeholder">Speak your bet…</span>
            }
          </div>
        )}

        {showParsing && (
          <div className="parsing-wrap">
            <span className="spinner" />
            <span>Parsing with Claude…</span>
          </div>
        )}

        {showPreview && (
          <BetPreview
            bets={bets}
            onChange={handleBetChange}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            posting={false}
          />
        )}

        {(showPosting || showResult) && postingItems.length > 0 && (
          <PostingProgress items={postingItems} />
        )}

        {showResult && statusMsg && (
          <StatusMessage type={statusMsg.type} message={statusMsg.message} />
        )}

        {showMic && !listening && lastBet && (
          <button className="btn-same-last" onClick={handleSameLast}>
            Same as last: {lastBet.bookie}
          </button>
        )}

        {showMic && !listening && lastBet && (
          <button className="btn-undo" onClick={handleUndo}>
            ↩ Undo last bet
          </button>
        )}

        {undoStatus && (
          <StatusMessage type={undoStatus.type} message={undoStatus.message} />
        )}
      </main>

      {/* ── Right panel — stats ──────────────────────────────────────── */}
      <aside className="app-right">
        <StatsPanel refreshTrigger={refreshTrigger} />
      </aside>

      {/* ── Bottom marquee ───────────────────────────────────────────── */}
      <Marquee messageIndex={marqueeIndex} />
    </div>
  )
}
