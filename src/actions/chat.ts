'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { searchTasks } from '@/actions/search'
import { createTask, updateTaskStatus } from '@/actions/tasks'
import { type Task, type TaskStatus, type TaskPriority } from '@/types/tasks'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  reply: string
  boardChanged: boolean
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'create_task',
    description: 'Crea una nueva tarea en el tablero kanban. ÚSALA siempre que el usuario pida crear, agregar o añadir una tarea.',
    input_schema: {
      type: 'object',
      properties: {
        title:       { type: 'string', description: 'Título de la tarea' },
        priority:    { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Prioridad: low=baja, medium=media, high=alta, critical=crítica' },
        description: { type: 'string', description: 'Descripción opcional' },
      },
      required: ['title', 'priority'],
    },
  },
  {
    name: 'move_task',
    description: 'Mueve una tarea a otro estado del kanban. ÚSALA siempre que el usuario pida mover, cambiar estado o marcar como terminada una tarea.',
    input_schema: {
      type: 'object',
      properties: {
        task_id:   { type: 'string', description: 'ID UUID exacto de la tarea (de la lista de IDs)' },
        to_status: { type: 'string', enum: ['todo', 'in_progress', 'done'], description: 'Estado destino' },
      },
      required: ['task_id', 'to_status'],
    },
  },
]

function formatTask(task: Task): string {
  const parts = [`"${task.title}"`]
  if (task.description) parts.push(`(${task.description})`)
  parts.push(`| estado: ${task.status}`, `prioridad: ${task.priority}`)
  if (task.due_date) parts.push(`| vence: ${task.due_date}`)
  return parts.join(' ')
}

export async function chatWithTasks(messages: ChatMessage[]): Promise<ChatResponse> {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  if (!lastUser) throw new Error('No hay mensaje del usuario')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  const { data: allTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('position')

  const tasks = (allTasks ?? []) as Task[]

  let ragContext = ''
  try {
    const results = await searchTasks(lastUser.content)
    if (results.length > 0) {
      ragContext = `\nTareas más relevantes para la pregunta:\n${results.map((r) => `- ${r.content}`).join('\n')}`
    }
  } catch {
    // RAG falla silenciosamente — continúa con contexto completo
  }

  const byStatus = {
    todo:        tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    done:        tasks.filter((t) => t.status === 'done'),
  }

  const taskListForTools = tasks
    .map((t) => `ID: ${t.id} | Título: "${t.title}" | Estado: ${t.status} | Prioridad: ${t.priority}`)
    .join('\n')

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
    tasks.length > 0 ? `\nLista de IDs (para usar en herramientas):\n${taskListForTools}` : '',
  ].join('')

  const systemPrompt = `Eres un asistente de productividad integrado en TaskFlow AI. Responde en español.

REGLAS DE USO DE HERRAMIENTAS (obligatorias):
- Si el usuario pide CREAR, AGREGAR o AÑADIR una tarea → llama SIEMPRE a create_task. No respondas con texto antes de llamarla.
- Si el usuario pide MOVER, CAMBIAR ESTADO o MARCAR como terminada/progreso → llama SIEMPRE a move_task usando el ID exacto de la lista.
- Solo responde con texto cuando NO haya una acción que ejecutar.

Prioridad por defecto si no se especifica: medium.

Tareas actuales del usuario:
${fullContext}`

  const apiMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    tools: TOOLS,
    messages: apiMessages,
  })

  console.log('[chat] stop_reason:', response.stop_reason, '| blocks:', response.content.map(b => b.type))

  // Sin tool use → devuelve texto directo
  if (response.stop_reason !== 'tool_use') {
    const block = response.content.find((b) => b.type === 'text')
    return { reply: (block as Anthropic.TextBlock | undefined)?.text ?? '', boardChanged: false }
  }

  // Ejecuta las herramientas solicitadas
  let boardChanged = false
  const toolResults: Anthropic.ToolResultBlockParam[] = []

  for (const block of response.content) {
    if (block.type !== 'tool_use') continue

    console.log('[chat] tool_use →', block.name, JSON.stringify(block.input))

    if (block.name === 'create_task') {
      const input = block.input as { title: string; priority: TaskPriority; description?: string }
      const result = await createTask(input.title, input.priority, input.description)
      console.log('[chat] createTask result:', result)
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: result.error ? `Error: ${result.error}` : 'Tarea creada exitosamente',
      })
      if (!result.error) boardChanged = true
    }

    if (block.name === 'move_task') {
      const input = block.input as { task_id: string; to_status: TaskStatus }
      try {
        await updateTaskStatus(input.task_id, input.to_status)
        console.log('[chat] move_task ok:', input.task_id, '→', input.to_status)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: 'Tarea movida exitosamente',
        })
        boardChanged = true
      } catch (e) {
        console.error('[chat] move_task error:', e)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: `Error: ${e instanceof Error ? e.message : 'desconocido'}`,
        })
      }
    }
  }

  // Segunda llamada con resultados de herramientas
  const followUp = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    tools: TOOLS,
    messages: [
      ...apiMessages,
      { role: 'assistant', content: response.content },
      { role: 'user',      content: toolResults },
    ],
  })

  const finalBlock = followUp.content.find((b) => b.type === 'text')
  return { reply: (finalBlock as Anthropic.TextBlock | undefined)?.text ?? '', boardChanged }
}
