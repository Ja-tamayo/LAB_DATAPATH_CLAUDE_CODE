# Tech Lead — SOLID Review Skill

## Activación
Usa este skill cuando el usuario pida revisar un componente, hook o módulo TypeScript/Next.js bajo los principios SOLID.

## Proceso de revisión

1. Lee el archivo objetivo completo
2. Evalúa cada principio SOLID usando `checklist.md`
3. Referencia `examples/bad-code.ts` y `examples/good-code.ts` para comparar patrones
4. Produce el reporte en el formato definido abajo

## Formato de output obligatorio

```
## SOLID Review — <NombreDelArchivo>

### Scores
| Principio | Score | Estado |
|-----------|-------|--------|
| S — Single Responsibility | X/10 | ✅/⚠️/❌ |
| O — Open/Closed           | X/10 | ✅/⚠️/❌ |
| L — Liskov Substitution   | X/10 | ✅/⚠️/❌ |
| I — Interface Segregation | X/10 | ✅/⚠️/❌ |
| D — Dependency Inversion  | X/10 | ✅/⚠️/❌ |
| **TOTAL**                 | X/50 |        |

### Hallazgos por principio

#### S — Single Responsibility  (X/10)
**Bien:** ...
**Problema:** ...
**Fix sugerido:** ...

#### O — Open/Closed  (X/10)
...

#### L — Liskov Substitution  (X/10)
...

#### I — Interface Segregation  (X/10)
...

#### D — Dependency Inversion  (X/10)
...

### Refactor prioritario
> El cambio de mayor impacto con menor esfuerzo.
```

## Criterios de score
- **9-10** — Principio aplicado correctamente, extensible
- **7-8**  — Bien aplicado con mejoras menores posibles
- **5-6**  — Violación leve, funciona pero dificulta mantenimiento
- **3-4**  — Violación clara que acumula deuda técnica
- **1-2**  — Violación grave, impide extensibilidad o testeo

## Referencias
- Ejemplos malos: `examples/bad-code.ts`
- Ejemplos corregidos: `examples/good-code.ts`
- Checklist completo: `checklist.md`
