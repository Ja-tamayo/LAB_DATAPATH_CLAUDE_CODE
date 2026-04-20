'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { type Task, type TaskStatus } from '@/types/tasks'

export interface VoiceCommandResult {
  action: 'move' | 'unknown'
  taskId?: string
  toStatus?: TaskStatus
  message: string
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Por hacer',
  in_progress: 'En progreso',
  done: 'Terminado',
}

export async function parseVoiceCommand(transcript: string): Promise<VoiceCommandResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { action: 'unknown', message: 'No autenticado.' }

  const { data } = await supabase
    .from('tasks')
    .select('id, title, status')
    .eq('user_id', user.id)

  const tasks = (data ?? []) as Pick<Task, 'id' | 'title' | 'status'>[]

  if (tasks.length === 0) {
    return { action: 'unknown', message: 'No tienes tareas todavía.' }
  }

  const taskList = tasks
    .map((t) => `- ID: ${t.id} | Título: "${t.title}" | Estado: ${STATUS_LABELS[t.status]}`)
    .join('\n')

  const prompt = `Eres un intérprete de comandos de voz para un tablero Kanban en español.
El usuario dijo: "${transcript}"

Tareas disponibles:
${taskList}

Estados válidos: todo (Por hacer), in_progress (En progreso), done (Terminado)

Responde ÚNICAMENTE con JSON válido, sin markdown ni texto adicional:
- Mover tarea: {"action":"move","taskId":"<uuid exacto de la lista>","toStatus":"<todo|in_progress|done>","message":"Moviendo \\"<título>\\" a <estado destino>"}
- No entendido: {"action":"unknown","message":"No entendí. Intenta: \\"mueve [nombre de tarea] a en progreso\\""}

Haz coincidencia aproximada de títulos (ignora mayúsculas, acentos y palabras extra).`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })

    const block = response.content[0]
    if (block.type !== 'text') throw new Error('unexpected block type')

    return JSON.parse(block.text) as VoiceCommandResult
  } catch {
    return { action: 'unknown', message: 'Error al procesar el comando. Intenta de nuevo.' }
  }
}
