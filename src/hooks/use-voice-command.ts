'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export type VoiceState = 'idle' | 'listening' | 'processing' | 'success' | 'error'

interface ISpeechAlternative {
  readonly transcript: string
  readonly confidence: number
}

interface ISpeechResult {
  readonly length: number
  [index: number]: ISpeechAlternative
}

interface ISpeechResultList {
  readonly length: number
  [index: number]: ISpeechResult
}

interface ISpeechRecognitionEvent extends Event {
  readonly results: ISpeechResultList
}

interface ISpeechRecognitionErrorEvent extends Event {
  readonly error: string
}

interface ISpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: ((ev: Event) => void) | null
  onend: ((ev: Event) => void) | null
  onresult: ((ev: ISpeechRecognitionEvent) => void) | null
  onerror: ((ev: ISpeechRecognitionErrorEvent) => void) | null
  start(): void
  stop(): void
}

function getSpeechRecognitionAPI(): (new () => ISpeechRecognition) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as Record<string, unknown>
  const API = (w['SpeechRecognition'] ?? w['webkitSpeechRecognition']) as
    | (new () => ISpeechRecognition)
    | undefined
  return API ?? null
}

export function useVoiceCommand(onTranscript: (transcript: string) => Promise<void>) {
  const [state, setState] = useState<VoiceState>('idle')
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<ISpeechRecognition | null>(null)

  useEffect(() => {
    setIsSupported(getSpeechRecognitionAPI() !== null)
  }, [])

  const start = useCallback(() => {
    const SpeechAPI = getSpeechRecognitionAPI()
    if (!SpeechAPI || state !== 'idle') return

    const recognition = new SpeechAPI()
    recognition.lang = 'es-ES'
    recognition.continuous = false
    recognition.interimResults = false
    recognitionRef.current = recognition

    recognition.onstart = () => setState('listening')

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript
      setState('processing')
      onTranscript(transcript)
        .then(() => {
          setState('success')
          setTimeout(() => setState('idle'), 2500)
        })
        .catch(() => {
          setState('error')
          setTimeout(() => setState('idle'), 2500)
        })
    }

    recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
      const msg = event.error === 'not-allowed'
        ? 'Permiso de micrófono denegado.'
        : 'No se pudo escuchar. Intenta de nuevo.'
      console.warn('[voice]', msg)
      setState('error')
      setTimeout(() => setState('idle'), 2500)
    }

    recognition.onend = () => {
      setState((prev) => (prev === 'listening' ? 'idle' : prev))
    }

    recognition.start()
  }, [state, onTranscript])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setState('idle')
  }, [])

  return { state, isSupported, start, stop }
}
