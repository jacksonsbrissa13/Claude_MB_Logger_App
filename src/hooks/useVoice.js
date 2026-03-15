import { useEffect, useRef, useCallback } from 'react'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'

export function useVoice({ onFinalTranscript }) {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition()

  const onFinalRef = useRef(onFinalTranscript)
  onFinalRef.current = onFinalTranscript

  // Fire callback when the user manually stops recording.
  // Use `transcript` (full cumulative text) — with continuous mode, finalTranscript
  // only holds the most recent segment and resets on each silence gap.
  const prevListening = useRef(false)
  useEffect(() => {
    if (prevListening.current && !listening && transcript) {
      onFinalRef.current(transcript)
    }
    prevListening.current = listening
  }, [listening, transcript])

  const start = useCallback(() => {
    resetTranscript()
    SpeechRecognition.startListening({ continuous: true, language: 'en-AU' })
  }, [resetTranscript])

  const stop = useCallback(() => {
    SpeechRecognition.stopListening()
  }, [])

  const reset = useCallback(() => {
    resetTranscript()
  }, [resetTranscript])

  return {
    transcript,
    listening,
    start,
    stop,
    reset,
    supported: browserSupportsSpeechRecognition,
  }
}
