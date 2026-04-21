# Contributing to TaskFlow AI

## Branching strategy

```
main        ← producción (protegida, solo merge via PR)
develop     ← integración (base para feature branches)
feature/*   ← nuevas funcionalidades
fix/*       ← correcciones de bugs
chore/*     ← tareas de mantenimiento (deps, config, docs)
```

### Flujo de trabajo

```
develop → feature/mi-feature → PR → develop → PR → main
```

1. Crea tu branch desde `develop`:
   ```bash
   git checkout develop && git pull
   git checkout -b feature/nombre-descriptivo
   ```

2. Haz commits pequeños y atómicos con mensajes en formato convencional:
   ```
   feat: descripción corta
   fix: descripción corta
   chore: descripción corta
   docs: descripción corta
   ```

3. Antes de abrir el PR, asegúrate de que pase todo localmente:
   ```bash
   npx tsc --noEmit
   npx next lint --max-warnings 0
   npx vitest run
   npm run build
   ```

4. Abre el PR hacia `develop`. Cuando `develop` esté listo para producción, abre un PR de `develop` → `main`.

## Reglas de código

- TypeScript strict: nunca usar `any`
- Server Components por defecto; `'use client'` solo cuando sea necesario
- Todas las mutaciones via Server Actions (`'use server'`)
- RLS habilitado en todas las tablas de Supabase
- `useMemo` para computaciones costosas en hooks

## Tests

- Los unit tests van en `src/**/__tests__/*.test.ts`
- Los E2E van en `e2e/*.spec.ts`
- Para correr un solo archivo de tests:
  ```bash
  npx vitest run src/actions/__tests__/tasks.test.ts
  ```

## Variables de entorno para desarrollo

Copia `.env.example` a `.env.local` y completa las keys. Nunca commitees `.env.local` (está en `.gitignore`).

Para los tests E2E necesitas un usuario real en Supabase:
```env
TEST_USER_EMAIL=tu@email.com
TEST_USER_PASSWORD=tupassword
```
