import { useState, useEffect, useCallback } from 'react'
import { MicButton } from './components/MicButton'
import { BetPreview } from './components/BetPreview'
import { StatusMessage, PostingProgress } from './components/StatusMessage'
import { useVoice } from './hooks/useVoice'
import { parseWithClaude } from './lib/parseWithClaude'
import { postBets } from './lib/postBet'
import { fetchBookies } from './lib/fetchBookies'

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
    // Save first bet as the reference for "same as last"
    localStorage.setItem(LAST_BET_KEY, JSON.stringify(bets[0]))
  } catch {}
}

export default function App() {
  const [appState, setAppState] = useState('idle')
  const [bets, setBets] = useState([])
  const [postingItems, setPostingItems] = useState([])
  const [statusMsg, setStatusMsg] = useState(null) // { type, message }
  const [bookieList, setBookieList] = useState([])
  const lastBet = loadLastBet()

  // Fetch bookie list on mount
  useEffect(() => {
    fetchBookies().then(setBookieList)
  }, [])

  // Auto-clear result state after 3s
  useEffect(() => {
    if (appState === 'result') {
      const t = setTimeout(() => {
        setAppState('idle')
        setStatusMsg(null)
      }, 3000)
      return () => clearTimeout(t)
    }
  }, [appState])

  const handleFinalTranscript = useCallback(async (transcript) => {
    if (!transcript.trim()) {
      setAppState('idle')
      return
    }

    setAppState('parsing')

    // Determine if this is a "same as last" variation
    const isSameVariation = /\bsame\b/i.test(transcript)
    const prevBet = isSameVariation ? lastBet : null

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
  }, [bookieList, lastBet])

  const { transcript, listening, start, stop, reset, supported } = useVoice({
    onFinalTranscript: handleFinalTranscript,
  })

  function handleMicToggle() {
    if (listening) {
      stop()
    } else {
      reset()
      setAppState('listening')
      start()
    }
  }

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

    // Update posting items as results come in
    setPostingItems(results.map(r => ({ bookie: r.bookie, done: true, ok: r.ok })))

    const allOk = results.every(r => r.ok)
    const failed = results.filter(r => !r.ok)

    if (allOk) {
      saveLastBet(bets)
      setStatusMsg({
        type: 'success',
        message: bets.length === 1
          ? `Logged: ${bets[0].bookie}`
          : `${bets.length} bets logged successfully`,
      })
    } else {
      setStatusMsg({
        type: 'error',
        message: `Failed: ${failed.map(f => f.bookie).join(', ')}`,
      })
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

  const isBusy = ['parsing', 'posting'].includes(appState)
  const showMic = ['idle', 'listening'].includes(appState)
  const showTranscript = appState === 'listening' || (transcript && appState !== 'idle')
  const showParsing = appState === 'parsing'
  const showPreview = appState === 'preview'
  const showPosting = appState === 'posting'
  const showResult = appState === 'result'

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">MB Voice Logger</span>
        {bookieList.length > 0 && (
          <span style={{ fontSize: '0.75rem', color: '#555' }}>
            {bookieList.length} bookies loaded
          </span>
        )}
      </header>

      {!supported && (
        <div className="unsupported-banner">
          Voice not supported in this browser. Use Chrome for full functionality.
        </div>
      )}

      <main className="app-body">
        {showMic && (
          <MicButton
            listening={listening}
            onToggle={handleMicToggle}
            disabled={!supported || isBusy}
          />
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

        {showPosting && (
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
      </main>
    </div>
  )
}
