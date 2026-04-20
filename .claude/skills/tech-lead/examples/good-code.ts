'use client'

// ✅ GOOD-CODE.TS — Versión SOLID-compliant
// Cada pieza tiene una sola razón para cambiar.
// Las dependencias se inyectan, no se importan directamente.

import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core'
import { type Task, KANBAN_COLUMNS } from '@/types/tasks'  // ✅ O: config extensible
import { useMoveTask } from '@/hooks/use-move-task'         // ✅ S: estado en hook propio
import { useTasksByStatus } from '@/hooks/use-tasks-by-status' // ✅ S: transformación separada
import { useKanbanDnd } from '@/hooks/use-kanban-dnd'      // ✅ S: DnD encapsulado
import { KanbanColumn } from '@/components/kanban-column'
import { TaskCard } from '@/components/task-card'

// ✅ I: solo recibe lo que necesita — no el cliente de Supabase, no el user
interface KanbanBoardProps {
  initialTasks: Task[]
}

// ✅ S: solo orquesta — delega todo a hooks y subcomponentes
// ✅ D: recibe datos como prop (inyectados por el Server Component padre)
export function KanbanBoard({ initialTasks }: KanbanBoardProps) {
  const { tasks, moveTask } = useMoveTask(initialTasks)        // ✅ D: hook como abstracción
  const tasksByStatus = useTasksByStatus(tasks)                 // ✅ S: agrupación separada
  const { sensors, activeTask, handleDragStart, handleDragEnd } =
    useKanbanDnd(tasks, moveTask)                               // ✅ D: moveTask inyectado al hook

  // ✅ O: agregar columna = agregar entrada en KANBAN_COLUMNS, sin tocar este componente
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {KANBAN_COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            id={col.status}
            label={col.label}
            tasks={tasksByStatus[col.status]}  // ✅ I: cada columna solo recibe sus tareas
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="rotate-3 shadow-2xl">
            <TaskCard task={activeTask} isDragging />  {/* ✅ L: TaskCard acepta isDragging sin romper contrato */}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

// ── Por qué cada hook es una abstracción correcta ────────────────────────────
//
// useMoveTask(initialTasks)
//   ✅ S: solo maneja estado + optimistic update
//   ✅ D: recibe initialTasks (datos), no los fetcha
//
// useTasksByStatus(tasks)
//   ✅ S: solo agrupa y ordena, nada más
//   ✅ I: solo consume Task[], no necesita el cliente ni el usuario
//
// useKanbanDnd(tasks, moveTask)
//   ✅ S: solo encapsula @dnd-kit (sensores, drag start/end)
//   ✅ D: recibe moveTask como callback — puede recibir cualquier implementación
