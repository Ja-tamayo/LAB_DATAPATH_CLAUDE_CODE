import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getTasks, createTask, updateTaskStatus } from '@/actions/tasks'
import { type Task } from '@/types/tasks'

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Creates a thenable Supabase query builder that resolves to `result`. */
function makeQuery(result: unknown) {
  const q: Record<string, unknown> = {}
  const methods = ['select', 'insert', 'update', 'eq', 'order', 'limit', 'single']
  methods.forEach((m) => {
    q[m] = vi.fn().mockReturnValue(q)
  })
  q['then'] = (resolve: (v: unknown) => unknown, reject?: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return q
}

/** Query that resolves as { data: { role: 'collaborator' }, error: null } — used to mock getCurrentUserRole. */
function makeRoleQuery() {
  return makeQuery({ data: { role: 'collaborator' }, error: null })
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    user_id: 'user-1',
    task_owner_id: null,
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

const mockUser = { id: 'user-1', email: 'test@example.com' }

// ─── getTasks ────────────────────────────────────────────────────────────────

describe('getTasks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty array when user is not authenticated', async () => {
    const mockSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never)

    const result = await getTasks()

    expect(result).toEqual([])
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it('returns tasks ordered by position for authenticated user', async () => {
    const tasks = [
      makeTask({ id: 'task-1', position: 0 }),
      makeTask({ id: 'task-2', position: 1, status: 'in_progress' }),
    ]
    const mockSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
      from: vi.fn().mockReturnValue(makeQuery({ data: tasks, error: null })),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>)

    const result = await getTasks()

    expect(result).toEqual(tasks)
    expect(mockSupabase.from).toHaveBeenCalledWith('tasks')
  })

  it('returns empty array when query returns null data', async () => {
    const mockSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
      from: vi.fn().mockReturnValue(makeQuery({ data: null, error: null })),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>)

    const result = await getTasks()

    expect(result).toEqual([])
  })
})

// ─── createTask ───────────────────────────────────────────────────────────────

describe('createTask', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns error when user is not authenticated', async () => {
    const mockSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>)

    const result = await createTask('My Task', 'medium')

    expect(result).toEqual({ error: 'Not authenticated' })
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it('inserts task at position 0 when no existing tasks', async () => {
    const positionQuery = makeQuery({ data: [], error: null })
    const insertQuery = makeQuery({ data: null, error: null })
    const mockSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
      from: vi.fn()
        .mockReturnValueOnce(makeRoleQuery())   // getCurrentUserRole → profiles
        .mockReturnValueOnce(positionQuery)
        .mockReturnValueOnce(insertQuery),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>)

    const result = await createTask('My Task', 'medium')

    expect(result).toEqual({ error: null })
    expect(insertQuery['insert']).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'My Task', priority: 'medium', status: 'todo', position: 0 }),
    )
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
  })

  it('inserts task at next position after existing tasks', async () => {
    const positionQuery = makeQuery({ data: [{ position: 4 }], error: null })
    const insertQuery = makeQuery({ data: null, error: null })
    const mockSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
      from: vi.fn()
        .mockReturnValueOnce(makeRoleQuery())   // getCurrentUserRole → profiles
        .mockReturnValueOnce(positionQuery)
        .mockReturnValueOnce(insertQuery),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>)

    const result = await createTask('My Task', 'high')

    expect(result).toEqual({ error: null })
    expect(insertQuery['insert']).toHaveBeenCalledWith(
      expect.objectContaining({ position: 5 }),
    )
  })

  it('returns error message on database insert failure', async () => {
    const positionQuery = makeQuery({ data: [], error: null })
    const insertQuery = makeQuery({
      data: null,
      error: { message: 'DB error', code: '42501', hint: null, details: null },
    })
    const mockSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
      from: vi.fn()
        .mockReturnValueOnce(makeRoleQuery())   // getCurrentUserRole → profiles
        .mockReturnValueOnce(positionQuery)
        .mockReturnValueOnce(insertQuery),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>)

    const result = await createTask('My Task', 'low')

    expect(result.error).toContain('DB error')
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('includes description when provided', async () => {
    const positionQuery = makeQuery({ data: [], error: null })
    const insertQuery = makeQuery({ data: null, error: null })
    const mockSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
      from: vi.fn()
        .mockReturnValueOnce(makeRoleQuery())   // getCurrentUserRole → profiles
        .mockReturnValueOnce(positionQuery)
        .mockReturnValueOnce(insertQuery),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>)

    await createTask('My Task', 'critical', 'A description')

    expect(insertQuery['insert']).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'A description' }),
    )
  })
})

// ─── updateTaskStatus ─────────────────────────────────────────────────────────

describe('updateTaskStatus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates status and calls revalidatePath on success', async () => {
    const updateQuery = makeQuery({ error: null })
    const mockSupabase = {
      from: vi.fn().mockReturnValue(updateQuery),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>)

    await updateTaskStatus('task-1', 'in_progress')

    expect(updateQuery['update']).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'in_progress' }),
    )
    expect(updateQuery['eq']).toHaveBeenCalledWith('id', 'task-1')
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
  })

  it('throws when database returns an error', async () => {
    const updateQuery = makeQuery({ error: { message: 'Update failed' } })
    const mockSupabase = {
      from: vi.fn().mockReturnValue(updateQuery),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>)

    await expect(updateTaskStatus('task-1', 'done')).rejects.toThrow('Update failed')
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
