'use client'

import { useState, useCallback } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useVoiceCommand } from '@/hooks/use-voice-command'
import { parseVoiceCommand } from '@/actions/voice'
import { updateTaskStatus } from '@/actions/tasks'
import { type TaskStatus } from '@/types/tasks'

export function VoiceCommandButton() {
  const router = useRouter()
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null)

  const handleTranscript = useCallback(
    async (transcript: string) => {
      const result = await parseVoiceCommand(transcript)

      if (result.action === 'move' && result.taskId && result.toStatus) {
        await updateTaskStatus(result.taskId, result.toStatus as TaskStatus)
        router.refresh()
      }

      setFeedback({ text: result.message, ok: result.action === 'move' })
      setTimeout(() => setFeedback(null), 4000)
    },
    [router],
  )

  const { state, isSupported, start, stop } = useVoiceCommand(handleTranscript)

  if (!isSupported) return null

  const isListening = state === 'listening'
  const isProcessing = state === 'processing'

  return (
    <div className="relative">
      {/* Feedback tooltip */}
      {feedback && (
        <div
          className={cn(
            'absolute bottom-full right-0 mb-2 w-64 px-3 py-2 rounded-lg text-xs z-50',
            'shadow-lg whitespace-normal leading-relaxed',
            feedback.ok
              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
          )}
        >
          {feedback.text}
        </div>
      )}

      <button
        onClick={isListening ? stop : start}
        disabled={isProcessing}
        title={isListening ? 'Detener escucha' : 'Comando de voz (español)'}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium',
          'border transition-all duration-200',
          isListening &&
            'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse',
          isProcessing &&
            'bg-blue-500/10 border-blue-500/20 text-blue-400 cursor-not-allowed opacity-70',
          state === 'success' &&
            'bg-green-500/10 border-green-500/20 text-green-400',
          state === 'error' &&
            'bg-red-500/10 border-red-500/20 text-red-400',
          state === 'idle' &&
            'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:border-white/20',
        )}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isListening ? (
          <MicOff className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
        <span className="hidden sm:inline text-xs">
          {isListening ? 'Escuchando…' : isProcessing ? 'Procesando…' : 'Voz'}
        </span>
      </button>
    </div>
  )
}
