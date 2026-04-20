import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { buildTaskContent } from '../lib/embed-task'
import { generateEmbedding } from '../lib/embeddings'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, user_id, title, description, status, priority')

  if (error) throw new Error(error.message)
  if (!tasks || tasks.length === 0) {
    console.log('No hay tareas para embeber.')
    return
  }

  console.log(`Embebiendo ${tasks.length} tareas...`)

  for (const task of tasks) {
    try {
      const content = buildTaskContent(task)
      const embedding = await generateEmbedding(content, 'document')

      const { error: deleteError } = await supabase
        .from('task_embeddings')
        .delete()
        .eq('task_id', task.id)

      if (deleteError) throw new Error(deleteError.message)

      const { error: insertError } = await supabase
        .from('task_embeddings')
        .insert({ task_id: task.id, user_id: task.user_id, content, embedding })

      if (insertError) throw new Error(insertError.message)

      console.log(`✓ ${task.title}`)
    } catch (err) {
      console.error(`✗ ${task.title}:`, err)
    }
  }

  console.log('Completado.')
}

main().catch(console.error)
