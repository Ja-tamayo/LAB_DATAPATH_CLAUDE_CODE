# Checklist SOLID — TypeScript / Next.js

## S — Single Responsibility Principle
Un módulo/componente tiene una sola razón para cambiar.

- [ ] ¿El componente mezcla lógica de negocio con presentación?
- [ ] ¿El hook hace más de una cosa (fetching + estado + transformación)?
- [ ] ¿La Server Action valida, muta Y revalida en el mismo bloque sin separación?
- [ ] ¿El archivo tiene más de ~150 líneas sin justificación clara?
- [ ] ¿Hay más de un `useEffect` que manejan cosas distintas?

**En Next.js:** Server Components = solo datos/presentación. Lógica compleja → hooks o actions separados.

---

## O — Open/Closed Principle
Abierto para extensión, cerrado para modificación.

- [ ] ¿Agregar un nuevo tipo/variante requiere modificar código existente?
- [ ] ¿Hay `if/else` o `switch` que crecen al agregar casos?
- [ ] ¿Los estilos condicionales usan `cn()` con variantes o strings hardcodeados?
- [ ] ¿Las columnas del Kanban están hardcodeadas o vienen de una config extensible?
- [ ] ¿Los componentes aceptan `children` o slots donde tiene sentido?

**En Next.js:** Usar `KANBAN_COLUMNS`, `PRIORITY_CONFIG` como fuentes de verdad extensibles en lugar de switches.

---

## L — Liskov Substitution Principle
Los subtipos deben ser sustituibles por sus tipos base.

- [ ] ¿Un componente que extiende props base rompe contratos del padre?
- [ ] ¿Un tipo derivado omite campos requeridos del tipo base?
- [ ] ¿Las props opcionales (`?`) se usan para forzar variantes incompatibles?
- [ ] ¿Los callbacks tienen firmas incompatibles con la interfaz esperada?

**En TypeScript:** Revisar que `interface X extends Y` no omita ni contradiga propiedades de `Y`.

---

## I — Interface Segregation Principle
Los clientes no deben depender de interfaces que no usan.

- [ ] ¿Un componente recibe un objeto `Task` completo cuando solo necesita `title` y `status`?
- [ ] ¿Los hooks retornan más estado del que el componente consume?
- [ ] ¿Las props de un componente incluyen campos solo usados en casos específicos?
- [ ] ¿Hay props opcionales que indican que el componente hace demasiado?

**En TypeScript:** Preferir `Pick<Task, 'id' | 'title'>` sobre pasar el objeto completo cuando procede.

---

## D — Dependency Inversion Principle
Depender de abstracciones, no de implementaciones concretas.

- [ ] ¿El componente llama directamente a `supabase.from(...)` en lugar de recibir datos como prop?
- [ ] ¿El hook tiene `updateTaskStatus` hardcodeado en lugar de recibirlo como parámetro?
- [ ] ¿Las Server Actions están acopladas a una sola implementación de base de datos?
- [ ] ¿El componente importa directamente `@/actions/tasks` en vez de recibir callbacks?
- [ ] ¿Sería posible testear el componente/hook sin mockear módulos externos?

**En Next.js:** Server Components inyectan datos a Client Components vía props. Los hooks reciben callbacks, no los importan directamente.
