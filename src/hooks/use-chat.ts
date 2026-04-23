'use client'

import { useState } from 'react'
import { chatWithTasks, type ChatMessage } from '@/actions/chat'

export function useChat() {
  const [messages, setMessages]       = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading]     = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [boardChanged, setBoardChanged] = useState(false)

  async function sendMessage(content: string) {
    const userMessage: ChatMessage = { role: 'user', content }
    const next = [...messages, userMessage]

    setMessages(next)
    setIsLoading(true)
    setError(null)
    setBoardChanged(false)

    try {
      const recentContext = next.slice(-6)
      const { reply, boardChanged: changed } = await chatWithTasks(recentContext)
      setMessages([...next, { role: 'assistant', content: reply }])
      if (changed) setBoardChanged(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al conectar con el asistente. Intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  return { messages, isLoading, error, boardChanged, sendMessage }
}
