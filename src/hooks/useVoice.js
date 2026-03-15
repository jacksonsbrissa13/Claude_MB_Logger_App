import { useEffect, useRef, useCallback } from 'react'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'

export function useVoice({ onFinalTranscript }) {
  const {
    transcript,
    interimTranscript,
    finalTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition()

  const onFinalRef = useRef(onFinalTranscript)
  onFinalRef.current = onFinalTranscript

  // Fire callback when recognition stops and we have a final transcript
  const prevListening = useRef(false)
  useEffect(() => {
    if (prevListening.current && !listening && finalTranscript) {
      onFinalRef.current(finalTranscript)
    }
    prevListening.current = listening
  }, [listening, finalTranscript])

  const start = useCallback(() => {
    resetTranscript()
    SpeechRecognition.startListening({ continuous: false, language: 'en-AU' })
  }, [resetTranscript])

  const stop = useCallback(() => {
    SpeechRecognition.stopListening()
  }, [])

  const reset = useCallback(() => {
    resetTranscript()
  }, [resetTranscript])

  // Display transcript: show interim while listening, final when done
  const displayTranscript = listening
    ? transcript || interimTranscript
    : finalTranscript || transcript

  return {
    transcript: displayTranscript,
    listening,
    start,
    stop,
    reset,
    supported: browserSupportsSpeechRecognition,
  }
}
