'use client'

import { useState } from 'react'
import { chatWithTasks, type ChatMessage } from '@/actions/chat'

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendMessage(content: string) {
    const userMessage: ChatMessage = { role: 'user', content }
    const next = [...messages, userMessage]

    setMessages(next)
    setIsLoading(true)
    setError(null)

    try {
      const reply = await chatWithTasks(next)
      setMessages([...next, { role: 'assistant', content: reply }])
    } catch {
      setError('Error al conectar con el asistente. Intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  return { messages, isLoading, error, sendMessage }
}
