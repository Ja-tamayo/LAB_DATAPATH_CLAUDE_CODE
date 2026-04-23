'use client'

import { useRef, useEffect, useState } from 'react'
import { Send, Loader2, Bot, User, Mic, MicOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useChat } from '@/hooks/use-chat'
import { useVoiceCommand } from '@/hooks/use-voice-command'

const STARTER_PROMPTS = [
  'Mostrame mis prioridades de hoy',
  'Que tareas estan vencidas esta semana',
  'Creame una tarea para seguir con el cliente Alfa',
  'Move la tarea Demo MCP en vivo a en progreso',
]

function normalizeAssistantText(content: string): string {
  return content
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

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

  async function handleStarterPrompt(prompt: string) {
    if (isLoading) return
    await sendMessage(prompt)
  }

  const handleVoiceTranscript = async (transcript: string) => {
    setInput('')
    await sendMessage(transcript)
  }

  const { state: voiceState, isSupported, start, stop } = useVoiceCommand(handleVoiceTranscript)

  const isListening = voiceState === 'listening'
  const isVoiceProcessing = voiceState === 'processing'

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-white">Para que sirve</p>
              <div className="mt-3 space-y-2 text-xs leading-relaxed text-neutral-300">
                <p>Este asistente te ayuda a entender el tablero y ejecutar acciones simples sin buscar todo a mano.</p>
                <div className="rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500">Puede hacer</p>
                  <p className="mt-1">Resumir prioridades, mostrar riesgos, crear tareas y mover tareas entre estados.</p>
                </div>
                <div className="rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500">Como pedirlo</p>
                  <p className="mt-1">Usa pedidos cortos y directos. Ejemplo: "mostrame lo urgente" o "crea una tarea".</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-white">Ejemplos para empezar</p>
              <div className="mt-3 flex flex-col gap-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void handleStarterPrompt(prompt)}
                    className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-left text-xs text-neutral-200 transition-colors hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-white"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <p className="px-1 text-[10px] leading-relaxed text-neutral-600">
              Tip: si queres una accion, pedila explicitamente. Si queres analisis, usa resumime, ordename o decime que sigue.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn('flex items-start gap-2', msg.role === 'user' && 'flex-row-reverse')}
          >
            <div className={cn(
              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
              msg.role === 'user' ? 'bg-blue-600' : 'bg-white/10',
            )}>
              {msg.role === 'user'
                ? <User className="h-3 w-3 text-white" />
                : <Bot className="h-3 w-3 text-blue-400" />}
            </div>
            <div className={cn(
              'max-w-[85%] whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-xs leading-relaxed',
              msg.role === 'user' ? 'bg-blue-600/20 text-white' : 'bg-white/5 text-neutral-200',
            )}>
              {msg.role === 'assistant' ? normalizeAssistantText(msg.content) : msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10">
              <Bot className="h-3 w-3 text-blue-400" />
            </div>
            <div className="rounded-xl bg-white/5 px-3 py-2">
              <Loader2 className="h-3 w-3 animate-spin text-neutral-500" />
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {isListening && (
        <div className="flex items-center gap-2 px-3 pb-1">
          <div className="flex h-3 items-end gap-0.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-0.5 animate-pulse rounded-full bg-red-400"
                style={{ height: `${50 + i * 25}%`, animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <span className="text-[10px] text-red-400">Escuchando...</span>
        </div>
      )}

      {isVoiceProcessing && (
        <div className="flex items-center gap-2 px-3 pb-1">
          <Loader2 className="h-2.5 w-2.5 animate-spin text-blue-400" />
          <span className="text-[10px] text-blue-400">Procesando voz...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex shrink-0 gap-2 border-t border-white/5 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? 'Escuchando...' : 'Escribe o usa el microfono...'}
          disabled={isLoading || isListening}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-neutral-600 transition-colors focus:border-blue-500 focus:outline-none disabled:opacity-50"
        />

        {isSupported && (
          <button
            type="button"
            onClick={isListening ? stop : start}
            disabled={isLoading || isVoiceProcessing}
            title={isListening ? 'Detener' : 'Hablar con el asistente'}
            className={cn(
              'shrink-0 rounded-lg border p-2 transition-all duration-200',
              isListening
                ? 'animate-pulse border-red-500/40 bg-red-500/20 text-red-400'
                : 'border-white/10 bg-white/5 text-neutral-400 hover:border-white/20 hover:text-white',
              (isLoading || isVoiceProcessing) && 'cursor-not-allowed opacity-40',
            )}
          >
            {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          </button>
        )}

        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="shrink-0 rounded-lg bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  )
}
