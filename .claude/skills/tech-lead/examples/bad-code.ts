'use client'

// ❌ BAD-CODE.TS — 6 violaciones SOLID
// Este archivo mezcla responsabilidades, acopla dependencias y
// no es extensible. Úsalo como referencia de qué evitar.

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// ❌ S: El componente mezcla fetching, estado, lógica de negocio y presentación
// ❌ D: Depende directamente de Supabase en lugar de recibir datos como prop
export function KanbanBoard() {
  const [tasks, setTasks] = useState<any[]>([])         // ❌ S+I: any[] en lugar de Task[]
  const [loading, setLoading] = useState(false)

  // ❌ S: el componente hace fetch (responsabilidad del Server Component/Action)
  // ❌ D: acoplado a Supabase directamente
  useEffect(() => {
    const supabase = createClient()
    supabase.from('tasks').select('*').then(({ data }) => {
      setTasks(data ?? [])
    })
  }, [])

  // ❌ O: para agregar una columna hay que modificar este array hardcodeado
  const columns = ['todo', 'in_progress', 'done']

  // ❌ S: lógica de mover tarea mezclada dentro del renderizado
  // ❌ D: llama a Supabase directamente desde el handler
  async function handleDrop(taskId: string, newStatus: string) {
    setLoading(true)
    const supabase = createClient()
    await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId)
    const { data } = await supabase.from('tasks').select('*')
    setTasks(data ?? [])                                 // re-fetch manual
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* ❌ O: para cambiar el label hay que buscar y editar aquí */}
      {columns.map((col) => (
        <div key={col} style={{ background: '#1a1a2e', padding: 16, borderRadius: 8 }}>
          {/* ❌ I: filtra todas las propiedades de task aunque solo usa title */}
          {tasks
            .filter((t) => t.status === col)
            .map((task) => (
              <div
                key={task.id}
                onClick={() => handleDrop(task.id, 'done')} // ❌ lógica hardcodeada
                style={{ background: '#fff', padding: 8, marginBottom: 8 }}
              >
                {/* ❌ S: mezcla presentación con lógica de prioridad */}
                <span style={{ color: task.priority === 'high' ? 'red' : 'green' }}>
                  {task.priority === 'high' ? 'ALTA' : task.priority === 'medium' ? 'MEDIA' : 'BAJA'}
                </span>
                <p>{task.title}</p>
                {loading && <span>Cargando...</span>}
              </div>
            ))}
        </div>
      ))}
    </div>
  )
}
