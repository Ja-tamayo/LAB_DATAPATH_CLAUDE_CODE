import { generateEmbedding } from '@/lib/embeddings'
import { type Task } from '@/types/tasks'

type TaskInput = Pick<Task, 'title' | 'description' | 'status' | 'priority'>

export function buildTaskContent(task: TaskInput): string {
  const parts: string[] = [task.title]
  if (task.description) parts.push(task.description)
  parts.push(`estado: ${task.status}`, `prioridad: ${task.priority}`)
  return parts.join('. ')
}

export async function embedTask(task: TaskInput): Promise<number[]> {
  const content = buildTaskContent(task)
  return generateEmbedding(content, 'document')
}
