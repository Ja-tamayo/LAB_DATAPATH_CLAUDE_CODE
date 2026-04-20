# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with Turbopack (http://localhost:3000)
npm run build        # Production build
npx tsc --noEmit     # Type-check — run after every change
npx vitest run       # Unit tests (one-shot)
npx vitest           # Unit tests (watch mode)
npx playwright test  # E2E tests
```

Note: vitest and playwright are installed but no config files or tests exist yet.

## Environment

Requires `.env.local` at the root:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...
VOYAGE_API_KEY=...
```

## Architecture

**Next.js 15 App Router** with React 19. All routes are Server Components by default; Client Components are opt-in with `'use client'`.

### Auth flow

`middleware.ts` runs on every request, refreshes the Supabase session cookie, and enforces route protection:
- `/` → redirects to `/login`
- `/dashboard` without session → redirects to `/login`
- `/login` with session → redirects to `/dashboard`

Two Supabase clients exist for different contexts:
- `src/lib/supabase/client.ts` — `createBrowserClient`, for Client Components
- `src/lib/supabase/server.ts` — `createServerClient` with cookie read/write, for Server Components and Server Actions

### Data layer

`src/actions/tasks.ts` holds all `'use server'` mutation functions:
- `getTasks()` — fetches tasks for the authenticated user, ordered by `position`
- `createTask()` — inserts into `todo` column at the next available `position`
- `updateTaskStatus()` — updates status + `updated_at`, then calls `revalidatePath('/dashboard')`

RLS in Supabase ensures each user only accesses their own rows.

### AI / RAG layer

The chat sidebar (`src/components/chat/task-chat.tsx`) connects to an AI assistant that has full awareness of the user's tasks:

1. **Chat action** (`src/actions/chat.ts`) — `chatWithTasks()` loads all user tasks, attempts a vector search via `searchTasks()` to find the most relevant ones, then passes both full context + RAG results to `claude-haiku-4-5-20251001` via the Anthropic SDK.
2. **Embeddings** (`src/lib/embeddings.ts`) — calls Voyage AI (`voyage-3.5` model) to generate vector embeddings. Use `inputType: 'document'` when storing, `'query'` when searching.
3. **Embed helper** (`src/lib/embed-task.ts`) — `buildTaskContent()` serializes a task to a single string; `embedTask()` generates its embedding.
4. **Search action** (`src/actions/search.ts`) — `searchTasks()` generates a query embedding and calls the Supabase RPC `match_task_embeddings` (cosine similarity, threshold 0.4, top 5).
5. **Backfill script** (`src/scripts/embed-all-tasks.ts`) — run manually to embed existing tasks that predate the trigger.

The Postgres `pg_vector` trigger (migration `007`) auto-embeds tasks on insert/update via a Supabase Edge Function. Migration `008` drops the `pg_net` trigger variant in favor of a direct approach.

### Kanban board

The board is split across three layers:

1. **State & logic** (hooks in `src/hooks/`):
   - `use-move-task.ts` — owns `tasks` state, performs optimistic updates, reverts on error
   - `use-tasks-by-status.ts` — memoizes tasks grouped by column
   - `use-kanban-dnd.ts` — encapsulates all `@dnd-kit` logic (sensors, drag start/end)

2. **Presentation** (`src/components/`):
   - `KanbanBoard` — thin Client Component, wires the 3 hooks together, renders `DndContext` + `DragOverlay`
   - `KanbanColumn` — uses `useDroppable` + `SortableContext`, visual `isOver` feedback
   - `SortableTaskCard` — wraps `TaskCard` with `useSortable`
   - `TaskCard` — pure presentational component, no hooks, accepts `isDragging` prop

3. **Critical DnD fix** in `use-kanban-dnd.ts`: when `over.id` is a card UUID (dropping on top of another card), it resolves the target column by looking up that card's `status`. When `over.id` is a `TaskStatus` string (dropping on empty column area), it uses it directly.

### Types

`src/types/tasks.ts` is the single source of truth for `Task`, `TaskStatus`, `TaskPriority`, `KANBAN_COLUMNS`, and `PRIORITY_CONFIG`. The ENUMs match the Postgres `task_priority` and `task_status` types defined in migrations.

### Database migrations

`supabase/migrations/` runs in numeric order:
1. `001_profiles.sql` — defines `handle_updated_at()` trigger (reused by tasks)
2. `002_tasks.sql` — tasks table with ENUMs, index on `(user_id, status)`
3. `003_rls.sql` — RLS policies using `(select auth.uid())` for performance
4. `004_seed.sql` — sample data for two test users
5. `004_enable_vector.sql` — enables `pgvector` extension
6. `005_task_embeddings.sql` — adds `embedding vector(1024)` column to tasks
7. `006_match_embeddings.sql` — defines `match_task_embeddings` RPC function
8. `007_embed_trigger.sql` — Supabase Edge Function trigger to auto-embed on insert/update
9. `008_drop_net_trigger.sql` — drops the `pg_net`-based trigger variant

## Mandatory rules

- TypeScript strict mode — never use `any`
- Server Components by default; `'use client'` only when necessary
- Server Actions for all mutations
- RLS enabled on all tables
- `useMemo` for expensive computations
- Error handling in all `try/catch` blocks

## Context management

- Use `/compact` before continuing when context is long
- Use `/cost` after finishing each task
- Default model: Sonnet. Use Opus only for complex architecture decisions
