'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { searchTasks } from '@/actions/search'
import { type Task } from '@/types/tasks'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function formatTask(task: Task): string {
  const parts = [`"${task.title}"`]
  if (task.description) parts.push(`(${task.description})`)
  parts.push(`| estado: ${task.status}`, `prioridad: ${task.priority}`)
  if (task.due_date) parts.push(`| vence: ${task.due_date}`)
  return parts.join(' ')
}

export async function chatWithTasks(messages: ChatMessage[]): Promise<string> {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  if (!lastUser) throw new Error('No hay mensaje del usuario')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  // Carga todas las tareas del usuario (fuente de verdad siempre disponible)
  const { data: allTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('position')

  const tasks = (allTasks ?? []) as Task[]

  // Intenta vector search para resaltar las más relevantes
  let ragContext = ''
  try {
    const results = await searchTasks(lastUser.content)
    if (results.length > 0) {
      ragContext = `\nTareas más relevantes para la pregunta:\n${results.map((r) => `- ${r.content}`).join('\n')}`
    }
  } catch {
    // Si RAG falla (tabla vacía, error de embeddings) continúa con contexto completo
  }

  // Agrupa tareas por estado para el contexto
  const byStatus = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    done: tasks.filter((t) => t.status === 'done'),
  }

  const fullContext = [
    `Total de tareas: ${tasks.length}`,
    byStatus.todo.length > 0
      ? `\nPor hacer (${byStatus.todo.length}):\n${byStatus.todo.map(formatTask).join('\n')}`
      : '\nPor hacer: ninguna',
    byStatus.in_progress.length > 0
      ? `\nEn progreso (${byStatus.in_progress.length}):\n${byStatus.in_progress.map(formatTask).join('\n')}`
      : '\nEn progreso: ninguna',
    byStatus.done.length > 0
      ? `\nTerminadas (${byStatus.done.length}):\n${byStatus.done.map(formatTask).join('\n')}`
      : '\nTerminadas: ninguna',
    ragContext,
  ].join('')

  const systemPrompt = `Eres un asistente de productividad integrado en TaskFlow AI.
Responde en español, de forma concisa y útil.
Tienes acceso completo a todas las tareas del usuario:

${fullContext}`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Tipo de respuesta inesperado')

  return block.text
}
