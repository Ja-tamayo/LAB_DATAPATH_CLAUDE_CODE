# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with Turbopack (http://localhost:3000)
npm run build        # Production build
npx tsc --noEmit     # Type-check — run after every change
npx next lint --max-warnings 0  # Lint
npx vitest run       # Unit tests (one-shot)
npx vitest           # Unit tests (watch mode)
npm run test:coverage             # Unit tests with coverage report
npx playwright test  # E2E tests
```

To run a single Vitest test file:
```bash
npx vitest run src/actions/__tests__/tasks.test.ts
```

### Deploy (Vercel CLI)

```bash
vercel pull --yes --environment=production   # Sync env vars from Vercel
vercel build --prod                          # Build locally with prod config
vercel deploy --prebuilt --prod              # Deploy prebuilt output
```

Required env vars for deploy: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

### CI/CD pipeline

`.github/workflows/ci-cd.yml` runs on every push:
- **CI job** (all branches): lint → tsc → vitest --coverage (threshold 20%) → next build
- **deploy-production job** (main only, after CI): vercel pull → vercel build --prod → vercel deploy --prod

GitHub Secrets required: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`.

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
- `createTask(title, priority, description?)` — inserts into `todo` column at the next available `position`
- `updateTaskStatus(id, status)` — updates status + `updated_at`, then calls `revalidatePath('/dashboard')`

RLS in Supabase ensures each user only accesses their own rows.

### AI / RAG layer

The chat drawer (`src/components/chat-drawer.tsx`) slides in from the right and renders `TaskChat`. The assistant can both answer questions and mutate the board.

**Tool use (agentic)** — `chatWithTasks()` in `src/actions/chat.ts` exposes two Claude tools:
- `create_task` — calls `createTask()` when the user asks to add a task
- `move_task` — calls `updateTaskStatus()` when the user asks to move a task

Flow: user message → load all tasks + RAG context → first Claude call → if `stop_reason === 'tool_use'`, execute tools → second Claude call with tool results → return `{ reply, boardChanged }`. When `boardChanged` is `true`, `TaskChat` calls `router.refresh()` to re-fetch the Server Component.

**RAG** — `src/actions/search.ts` generates a query embedding via Voyage AI and calls the Supabase RPC `match_task_embeddings` (cosine similarity, threshold 0.4, top 5). Results are injected as additional context into the system prompt. RAG failures are silent — the chat falls back to full task context.

**Embeddings** — `src/lib/embeddings.ts` calls Voyage AI (`voyage-3.5`). Use `inputType: 'document'` when storing, `'query'` when searching. `src/lib/embed-task.ts` serializes a task to a string and generates its embedding.

The Postgres `pg_vector` trigger (migration `007`) auto-embeds tasks on insert/update via a Supabase Edge Function. `src/scripts/embed-all-tasks.ts` backfills existing tasks.

### Voice commands

Voice input is integrated directly into `TaskChat` (`src/components/chat/task-chat.tsx`). The mic button uses `useVoiceCommand` (`src/hooks/use-voice-command.ts`) — Web Speech API with `lang: 'es-ES'`. On transcript, it calls `sendMessage()` directly, routing through the same agentic chat pipeline. All Web Speech API types are defined inline in that hook (no external `@types` dependency).

### Kanban board

Split across three layers:

1. **State & logic** (`src/hooks/`):
   - `use-move-task.ts` — owns `tasks` state, performs optimistic updates, reverts on error
   - `use-tasks-by-status.ts` — memoizes tasks grouped by column
   - `use-kanban-dnd.ts` — encapsulates all `@dnd-kit` logic (sensors, drag start/end)

2. **Presentation** (`src/components/`):
   - `KanbanBoard` — thin Client Component, wires the 3 hooks, renders `DndContext` + `DragOverlay`
   - `KanbanColumn` — uses `useDroppable` + `SortableContext`, visual `isOver` feedback
   - `SortableTaskCard` — wraps `TaskCard` with `useSortable`
   - `TaskCard` — pure presentational, no hooks, accepts `isDragging` prop

3. **Critical DnD fix** in `use-kanban-dnd.ts`: when `over.id` is a card UUID (dropping on another card), resolve the target column by looking up that card's `status`. When `over.id` is a `TaskStatus` string (dropping on empty column area), use it directly.

### Types

`src/types/tasks.ts` is the single source of truth for `Task`, `TaskStatus`, `TaskPriority`, `KANBAN_COLUMNS`, and `PRIORITY_CONFIG`. The ENUMs match the Postgres `task_priority` and `task_status` types in migrations.

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
