'use client'

import { useRef, useEffect, useState } from 'react'
import { Send, Loader2, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChat } from '@/hooks/use-chat'

export function TaskChat() {
  const [input, setInput] = useState('')
  const { messages, isLoading, error, sendMessage } = useChat()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    await sendMessage(text)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-xs text-neutral-600 text-center mt-8 leading-relaxed">
            Pregúntame sobre tus tareas,<br />prioridades o próximos pasos.
          </p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn('flex gap-2 items-start', msg.role === 'user' && 'flex-row-reverse')}
          >
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5',
              msg.role === 'user' ? 'bg-blue-600' : 'bg-white/10'
            )}>
              {msg.role === 'user'
                ? <User className="w-3 h-3 text-white" />
                : <Bot className="w-3 h-3 text-blue-400" />
              }
            </div>
            <div className={cn(
              'rounded-xl px-3 py-2 text-xs leading-relaxed max-w-[85%]',
              msg.role === 'user' ? 'bg-blue-600/20 text-white' : 'bg-white/5 text-neutral-200'
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

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/5 flex gap-2 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta..."
          disabled={isLoading}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
        />
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
