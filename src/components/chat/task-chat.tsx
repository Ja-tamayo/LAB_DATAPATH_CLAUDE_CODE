'use client'

import { useRef, useEffect, useState } from 'react'
import { Send, Loader2, Bot, User, Mic, MicOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useChat } from '@/hooks/use-chat'
import { useVoiceCommand } from '@/hooks/use-voice-command'

export function TaskChat() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const { messages, isLoading, error, boardChanged, sendMessage } = useChat()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (boardChanged) router.refresh()
  }, [boardChanged, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    await sendMessage(text)
  }

  const handleVoiceTranscript = async (transcript: string) => {
    setInput('')
    await sendMessage(transcript)
  }

  const { state: voiceState, isSupported, start, stop } = useVoiceCommand(handleVoiceTranscript)

  const isListening      = voiceState === 'listening'
  const isVoiceProcessing = voiceState === 'processing'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="text-center mt-8 space-y-2">
            <p className="text-xs text-neutral-600 leading-relaxed">
              Pregúntame sobre tus tareas,<br />prioridades o próximos pasos.
            </p>
            <p className="text-[10px] text-neutral-700 leading-relaxed">
              También puedo <span className="text-blue-500/70">crear tareas</span> y{' '}
              <span className="text-blue-500/70">moverlas entre columnas</span>.<br />
              Usa el micrófono o escribe.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn('flex gap-2 items-start', msg.role === 'user' && 'flex-row-reverse')}
          >
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5',
              msg.role === 'user' ? 'bg-blue-600' : 'bg-white/10',
            )}>
              {msg.role === 'user'
                ? <User className="w-3 h-3 text-white" />
                : <Bot className="w-3 h-3 text-blue-400" />}
            </div>
            <div className={cn(
              'rounded-xl px-3 py-2 text-xs leading-relaxed max-w-[85%]',
              msg.role === 'user' ? 'bg-blue-600/20 text-white' : 'bg-white/5 text-neutral-200',
            )}>
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 items-center">
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <Bot className="w-3 h-3 text-blue-400" />
            </div>
            <div className="bg-white/5 rounded-xl px-3 py-2">
              <Loader2 className="w-3 h-3 text-neutral-500 animate-spin" />
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Mic listening indicator */}
      {isListening && (
        <div className="px-3 pb-1 flex items-center gap-2">
          <div className="flex gap-0.5 items-end h-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-0.5 bg-red-400 rounded-full animate-pulse"
                style={{ height: `${50 + i * 25}%`, animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <span className="text-[10px] text-red-400">Escuchando…</span>
        </div>
      )}

      {isVoiceProcessing && (
        <div className="px-3 pb-1 flex items-center gap-2">
          <Loader2 className="w-2.5 h-2.5 text-blue-400 animate-spin" />
          <span className="text-[10px] text-blue-400">Procesando voz…</span>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/5 flex gap-2 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? 'Escuchando…' : 'Escribe o usa el micrófono…'}
          disabled={isLoading || isListening}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
        />

        {/* Mic button — solo si el navegador lo soporta */}
        {isSupported && (
          <button
            type="button"
            onClick={isListening ? stop : start}
            disabled={isLoading || isVoiceProcessing}
            title={isListening ? 'Detener' : 'Hablar con el asistente'}
            className={cn(
              'shrink-0 p-2 rounded-lg border transition-all duration-200',
              isListening
                ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
                : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:border-white/20',
              (isLoading || isVoiceProcessing) && 'opacity-40 cursor-not-allowed',
            )}
          >
            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
        )}

        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-lg p-2 text-white shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  )
}
