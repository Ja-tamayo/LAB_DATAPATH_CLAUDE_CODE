import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VOYAGE_MODEL = 'voyage-3.5'

interface TaskPayload {
  id: string
  user_id: string
  title: string
  description: string | null
  status: string
  priority: string
}

async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('VOYAGE_API_KEY')}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: [text],
      input_type: 'document',
    }),
  })

  if (!res.ok) throw new Error(`Voyage error: ${await res.text()}`)
  const json = await res.json()
  return json.data[0].embedding
}

Deno.serve(async (req) => {
  try {
    const task = (await req.json()) as TaskPayload

    const content = [
      task.title,
      task.description,
      `estado: ${task.status}`,
      `prioridad: ${task.priority}`,
    ]
      .filter(Boolean)
      .join('. ')

    const embedding = await generateEmbedding(content)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    await supabase.from('task_embeddings').delete().eq('task_id', task.id)

    const { error } = await supabase.from('task_embeddings').insert({
      task_id: task.id,
      user_id: task.user_id,
      content,
      embedding,
    })

    if (error) throw new Error(error.message)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
