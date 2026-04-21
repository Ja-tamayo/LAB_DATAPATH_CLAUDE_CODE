# TaskFlow AI

[![CI/CD](https://github.com/Ja-tamayo/LAB_DATAPATH_CLAUDE_CODE/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Ja-tamayo/LAB_DATAPATH_CLAUDE_CODE/actions/workflows/ci-cd.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector-3ECF8E?logo=supabase)](https://supabase.com/)

Kanban board con asistente IA que puede consultar, crear y mover tareas por texto o voz. Construido con Next.js 15, Supabase, Claude (Anthropic) y Voyage AI.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15 App Router · React 19 · Tailwind CSS · dnd-kit |
| Auth | Supabase Auth (email/password) + SSR cookies |
| Base de datos | Supabase Postgres + pgvector (embeddings 1024d) |
| IA / Chat | Claude Haiku (`claude-haiku-4-5-20251001`) · Tool use agentic |
| Embeddings | Voyage AI (`voyage-3.5`) · RAG con similitud coseno |
| Voz | Web Speech API (`es-ES`) integrada en el chat drawer |
| Tests | Vitest + jsdom · Playwright E2E |
| CI/CD | GitHub Actions → Vercel |

## Requisitos

- Node.js ≥ 22
- Cuenta en [Supabase](https://supabase.com/) con `pgvector` habilitado
- API keys: Anthropic, Voyage AI

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.example .env.local
# Editar .env.local con tus keys

# 3. Aplicar migraciones en Supabase
# Ejecutar los archivos en supabase/migrations/ en orden numérico
# desde el SQL Editor del dashboard de Supabase

# 4. (Opcional) Backfill de embeddings para tareas existentes
npx tsx src/scripts/embed-all-tasks.ts

# 5. Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
VOYAGE_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # solo para scripts de backfill
```

Para tests E2E, agregar en `.env.local`:
```env
TEST_USER_EMAIL=
TEST_USER_PASSWORD=
```

## Comandos

```bash
npm run dev              # Servidor de desarrollo (Turbopack)
npm run build            # Build de producción
npm test                 # Unit tests (one-shot)
npm run test:coverage    # Unit tests con cobertura
npm run test:e2e         # E2E con Playwright
npx tsc --noEmit         # Type check
npx next lint            # Linting
```

## Arquitectura

```
src/
├── app/
│   ├── dashboard/       # Kanban board (Server Component)
│   └── login/           # Auth page
├── actions/             # Server Actions (mutations + AI)
│   ├── tasks.ts         # CRUD de tareas
│   ├── chat.ts          # Chat agentic con tool use
│   └── search.ts        # RAG vector search
├── components/
│   ├── chat-drawer.tsx  # Panel deslizable del asistente
│   ├── chat/            # TaskChat con mic integrado
│   └── kanban-*/        # Board, columnas, tarjetas
├── hooks/               # use-move-task, use-kanban-dnd, use-voice-command
├── lib/                 # Clientes Supabase, embeddings, utils
└── types/tasks.ts       # Fuente única de verdad para tipos y ENUMs
supabase/
├── migrations/          # 001–008 en orden numérico
└── functions/           # Edge Function para auto-embed
```

## CI/CD

Cada push a `main`:
1. **CI**: lint → type check → unit tests (coverage 20%) → build
2. **Deploy**: `vercel pull` → `vercel build --prod` → `vercel deploy --prod`

Los PRs solo ejecutan CI (sin deploy).

## Secrets requeridos en GitHub

| Secret | Descripción |
|--------|-------------|
| `VERCEL_TOKEN` | Token de Vercel |
| `VERCEL_ORG_ID` | ID de la organización en Vercel |
| `VERCEL_PROJECT_ID` | ID del proyecto en Vercel |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key pública de Supabase |
| `ANTHROPIC_API_KEY` | API key de Anthropic |
| `VOYAGE_API_KEY` | API key de Voyage AI |
| `GROQ_API_KEY` | API key de Groq (reservado) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase |
| `TEST_USER_EMAIL` | Email del usuario de prueba E2E |
| `TEST_USER_PASSWORD` | Contraseña del usuario de prueba E2E |
