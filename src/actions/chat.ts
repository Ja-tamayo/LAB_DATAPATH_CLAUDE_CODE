'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { searchTasks } from '@/actions/search'
import { createTask, updateTaskStatus } from '@/actions/tasks'
import { type Task, type TaskStatus, type TaskPriority, getUrgency } from '@/types/tasks'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  reply: string
  boardChanged: boolean
}

const CHAT_MODEL = 'claude-haiku-4-5-20251001'
const MAX_CONTEXT_TASKS = 40
const MAX_TOOL_TASKS = 80

function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('El asistente no está configurado: falta ANTHROPIC_API_KEY.')
  }

  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

function sanitizeMessages(messages: ChatMessage[]): ChatMessage[] {
  const lastUser = [...messages]
    .reverse()
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 4_000) }))
    .filter((m) => m.content.length > 0)
    .find((m) => m.role === 'user')

  return lastUser ? [lastUser] : []
}

function byUrgencyAndDate(a: Task, b: Task): number {
  const order = { critical: 0, high: 1, medium: 2, low: 3 }
  return (
    order[getUrgency(a)] - order[getUrgency(b)] ||
    (a.due_date ?? '9999-12-31').localeCompare(b.due_date ?? '9999-12-31') ||
    a.position - b.position
  )
}

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
        client:      { type: 'string', description: 'Cliente al que pertenece la tarea (opcional)' },
        project:     { type: 'string', description: 'Proyecto al que pertenece la tarea (opcional)' },
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

function formatTask(task: Task, nameMap: Map<string, string>): string {
  const parts = [`"${task.title}"`]
  if (task.client)      parts.push(`[${task.client}${task.project ? '/' + task.project : ''}]`)
  if (task.description) parts.push(`(${task.description})`)
  parts.push(`| estado: ${task.status}`, `| prioridad: ${task.priority}`)
  const urgency = getUrgency(task)
  if (urgency === 'critical' || urgency === 'high') parts.push(`| urgencia: ${urgency}`)
  if (task.due_date) parts.push(`| vence: ${task.due_date}`)
  if (task.effort_tokens) parts.push(`| esfuerzo: ${task.effort_tokens} tokens`)
  if (task.assigned_to) parts.push(`| ejecuta: ${nameMap.get(task.assigned_to) ?? task.assigned_to.slice(0, 8)}`)
  if (task.task_owner_id && task.task_owner_id !== task.assigned_to)
    parts.push(`| propietario: ${nameMap.get(task.task_owner_id) ?? task.task_owner_id.slice(0, 8)}`)
  return parts.join(' ')
}

export async function chatWithTasks(messages: ChatMessage[]): Promise<ChatResponse> {
  const safeMessages = sanitizeMessages(messages)
  const lastUser = [...safeMessages].reverse().find((m) => m.role === 'user')
  if (!lastUser) throw new Error('No hay mensaje del usuario')
  const anthropic = getAnthropicClient()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  // Fetch all tasks visible to the user (RLS handles access by role)
  const { data: allTasks } = await supabase
    .from('tasks')
    .select('*')
    .order('position')

  const tasks = (allTasks ?? []) as Task[]

  // Build name map from profiles for better context
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
  const nameMap = new Map<string, string>(
    (profiles ?? []).filter((p) => p.full_name).map((p) => [p.id as string, p.full_name as string]),
  )

  let ragContext = ''
  try {
    const results = await searchTasks(lastUser.content)
    if (results.length > 0) {
      ragContext = `\nTareas más relevantes para la pregunta:\n${results.map((r) => `- ${r.content}`).join('\n')}`
    }
  } catch {
    // RAG falla silenciosamente — continúa con contexto completo
  }

  const myTasks   = tasks.filter((t) => t.assigned_to === user.id || t.user_id === user.id)
  const teamTasks = tasks
    .filter((t) => t.assigned_to !== user.id && t.user_id !== user.id)
    .sort(byUrgencyAndDate)
    .slice(0, MAX_CONTEXT_TASKS)

  const byStatus = {
    todo:        tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    done:        tasks.filter((t) => t.status === 'done'),
  }

  // Client / project groupings for team context
  const clients  = [...new Set(tasks.map((t) => t.client).filter(Boolean))]
  const projects = [...new Set(tasks.map((t) => t.project).filter(Boolean))]

  // Overdue and urgent tasks for risk context
  const today = new Date().toISOString().split('T')[0]
  const overdue = tasks.filter((t) => t.status !== 'done' && t.due_date && t.due_date < today)

  const activeContextTasks = tasks
    .filter((t) => t.status !== 'done')
    .sort(byUrgencyAndDate)
    .slice(0, MAX_CONTEXT_TASKS)
  const contextTasks = activeContextTasks.length > 0
    ? activeContextTasks
    : [...tasks].sort(byUrgencyAndDate).slice(0, MAX_CONTEXT_TASKS)
  const toolTasks = [...tasks].sort(byUrgencyAndDate).slice(0, MAX_TOOL_TASKS)

  const taskListForTools = toolTasks
    .map((t) => `ID: ${t.id} | "${t.title}" | ${t.status} | ${t.priority}${t.client ? ' | cliente: ' + t.client : ''}${t.project ? ' | proyecto: ' + t.project : ''}`)
    .join('\n')

  const myName = nameMap.get(user.id) ?? user.email ?? 'yo'

  const fullContext = [
    `Usuario actual: ${myName} (${user.email})`,
    `Total de tareas visibles: ${tasks.length} (mías: ${myTasks.length}, equipo: ${teamTasks.length})`,
    clients.length > 0  ? `Clientes activos: ${clients.join(', ')}` : '',
    projects.length > 0 ? `Proyectos activos: ${projects.join(', ')}` : '',
    overdue.length > 0  ? `Tareas vencidas: ${overdue.length}` : '',
    '\n— MIS TAREAS —',
    byStatus.todo.length > 0
      ? `Por hacer (${byStatus.todo.length}):\n${contextTasks.filter(t => t.status === 'todo' && (t.assigned_to === user.id || t.user_id === user.id)).map((t) => formatTask(t, nameMap)).join('\n')}`
      : 'Por hacer: ninguna',
    byStatus.in_progress.length > 0
      ? `En progreso (${byStatus.in_progress.filter(t => t.assigned_to === user.id || t.user_id === user.id).length}):\n${contextTasks.filter(t => t.status === 'in_progress' && (t.assigned_to === user.id || t.user_id === user.id)).map((t) => formatTask(t, nameMap)).join('\n')}`
      : 'En progreso: ninguna',
    teamTasks.length > 0
      ? `\n— TAREAS DEL EQUIPO (${teamTasks.length}) —\n${teamTasks.filter(t => t.status !== 'done').map((t) => formatTask(t, nameMap)).join('\n')}`
      : '',
    ragContext,
    tasks.length > 0 ? `\n— IDs (para herramientas) —\n${taskListForTools}` : '',
  ].filter(Boolean).join('\n')

  const systemPrompt = `Eres un asistente de productividad integrado en TaskFlow AI. Responde en español.
Actúas como un jefe de proyecto senior que conoce el estado completo del equipo.

REGLAS DE HERRAMIENTAS (obligatorias):
- Si el usuario pide CREAR, AGREGAR o AÑADIR una tarea → llama SIEMPRE a create_task. Extrae cliente y proyecto del contexto si se mencionan.
- Si el usuario pide MOVER, CAMBIAR ESTADO o MARCAR como terminada/progreso → llama SIEMPRE a move_task con el ID exacto.
- Solo responde con texto cuando NO haya una acción que ejecutar.

Prioridad por defecto: medium. Si el usuario menciona un cliente o proyecto conocido, inclúyelo en create_task.

Contexto del equipo:
${fullContext}`

  const apiMessages: Anthropic.MessageParam[] = safeMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  const response = await anthropic.messages.create({
    model: CHAT_MODEL,
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
      const input = block.input as { title: string; priority: TaskPriority; description?: string; client?: string; project?: string }
      const result = await createTask(input.title, input.priority, input.description, undefined, undefined, input.client, input.project)
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
        const visibleTask = tasks.find((t) => t.id === input.task_id)
        if (!visibleTask) {
          throw new Error('No encontré esa tarea entre las tareas visibles. Pide el título exacto o confirma cuál tarea querés mover.')
        }
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
    model: CHAT_MODEL,
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
