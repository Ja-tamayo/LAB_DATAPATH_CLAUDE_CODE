import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTasksByStatus } from '@/hooks/use-tasks-by-status'
import { type Task } from '@/types/tasks'

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 'task-1',
    user_id: 'user-1',
    assigned_to: null,
    title: 'Test Task',
    description: null,
    priority: 'medium',
    status: 'todo',
    position: 0,
    impact_level: null,
    effort_tokens: null,
    due_date: null,
    estimated_start_date: null,
    started_at: null,
    completed_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('useTasksByStatus', () => {
  it('returns empty arrays for all statuses when tasks is empty', () => {
    const { result } = renderHook(() => useTasksByStatus([]))

    expect(result.current.todo).toEqual([])
    expect(result.current.in_progress).toEqual([])
    expect(result.current.done).toEqual([])
  })

  it('groups tasks into the correct status bucket', () => {
    const tasks = [
      makeTask({ id: '1', status: 'todo' }),
      makeTask({ id: '2', status: 'in_progress' }),
      makeTask({ id: '3', status: 'done' }),
    ]
    const { result } = renderHook(() => useTasksByStatus(tasks))

    expect(result.current.todo).toHaveLength(1)
    expect(result.current.todo[0].id).toBe('1')

    expect(result.current.in_progress).toHaveLength(1)
    expect(result.current.in_progress[0].id).toBe('2')

    expect(result.current.done).toHaveLength(1)
    expect(result.current.done[0].id).toBe('3')
  })

  it('sorts tasks by position within each status', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'todo', position: 2 }),
      makeTask({ id: 'b', status: 'todo', position: 0 }),
      makeTask({ id: 'c', status: 'todo', position: 1 }),
    ]
    const { result } = renderHook(() => useTasksByStatus(tasks))

    expect(result.current.todo.map((t) => t.id)).toEqual(['b', 'c', 'a'])
  })

  it('does not mix tasks across statuses', () => {
    const tasks = [
      makeTask({ id: '1', status: 'todo' }),
      makeTask({ id: '2', status: 'todo' }),
      makeTask({ id: '3', status: 'done' }),
    ]
    const { result } = renderHook(() => useTasksByStatus(tasks))

    expect(result.current.todo).toHaveLength(2)
    expect(result.current.in_progress).toHaveLength(0)
    expect(result.current.done).toHaveLength(1)
  })

  it('returns a new object reference when tasks array changes', () => {
    const tasks = [makeTask({ id: '1', status: 'todo' })]
    const { result, rerender } = renderHook(
      ({ t }: { t: Task[] }) => useTasksByStatus(t),
      { initialProps: { t: tasks } },
    )

    const first = result.current

    const newTasks = [...tasks, makeTask({ id: '2', status: 'done' })]
    rerender({ t: newTasks })

    expect(result.current).not.toBe(first)
    expect(result.current.done).toHaveLength(1)
  })

  it('returns the same reference when tasks array is unchanged (memoization)', () => {
    const tasks = [makeTask({ id: '1', status: 'todo' })]
    const { result, rerender } = renderHook(
      ({ t }: { t: Task[] }) => useTasksByStatus(t),
      { initialProps: { t: tasks } },
    )

    const first = result.current
    rerender({ t: tasks })

    expect(result.current).toBe(first)
  })
})
