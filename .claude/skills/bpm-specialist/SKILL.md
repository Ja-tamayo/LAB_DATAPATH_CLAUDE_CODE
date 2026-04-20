---
name: bpm-specialist
description: Modela, audita o mejora procesos de negocio para Qudox HR v2 usando notación BPMN 2.0.
---

# BPM Specialist

Usa esta skill cuando el usuario necesite:
- Diseñar un proceso de negocio nuevo (onboarding, aprobación, offboarding, etc.)
- Auditar un proceso existente en busca de cuellos de botella o riesgos
- Definir responsables (lanes), tiempos SLA y puntos de decisión
- Preparar un proceso para ser automatizado en n8n o ejecutado manualmente
- Traducir reglas de negocio en flujos ejecutables

---

## Formato de respuesta obligatorio

### 1. Nombre del proceso
`[Área] — [Nombre]` (ej. `RRHH — Onboarding de empleado`)

### 2. Objetivo del proceso
Una oración: qué problema resuelve y cuál es el resultado esperado.

### 3. Participantes (Lanes)
Lista los actores o sistemas que participan. Para cada uno:
- **Nombre del lane** (persona, rol o sistema)
- **Responsabilidad principal**

### 4. Evento de inicio
- Tipo: manual / automático / mensaje / temporizador
- Condición o dato que lo dispara

### 5. Flujo principal (happy path)
Diagrama textual paso a paso con notación simplificada:

```
[Inicio] → Tarea 1 (Lane) → <Gateway: condición?>
  → [Sí] Tarea 2 (Lane) → Tarea 3 (Lane) → [Fin]
  → [No] Tarea alternativa (Lane) → [Fin alternativo]
```

- Usar `< >` para gateways (decisiones)
- Usar `[ ]` para eventos (inicio, fin, temporizador)
- Usar `( )` para el lane responsable

### 6. Excepciones y flujos alternativos
Para cada gateway o punto de fallo posible:
- Condición que lo activa
- Qué tarea o subproceso se ejecuta
- Cómo se retoma el flujo principal (o se cancela)

### 7. SLAs y tiempos límite
| Tarea / etapa | SLA esperado | Acción si se vence |
|---|---|---|
| ... | ... | ... |

### 8. Datos que entran y salen del proceso
- **Input**: qué datos/documentos son necesarios para iniciar
- **Output**: qué artefactos o registros produce el proceso al finalizar

### 9. Reglas de negocio críticas
Lista numerada de invariantes que el proceso debe respetar siempre (ej. "nunca se puede completar sin firma del gerente").

### 10. Puntos de automatización recomendados
Qué tareas son candidatas a ser ejecutadas por n8n, IA o triggers de Supabase. Para cada uno indicar:
- Tarea a automatizar
- Herramienta sugerida (n8n / trigger Supabase / cron / IA)
- Dependencia humana que permanece

### 11. Métricas de éxito del proceso
KPIs que permiten evaluar si el proceso funciona bien (tiempo promedio, tasa de error, % completados a tiempo, etc.)

---

## Reglas obligatorias

- El BPM describe **qué debe pasar**, no cómo se implementa técnicamente
- Cada tarea debe tener **un responsable claro** (lane definido)
- No diseñar procesos sin definir **el evento de fin** y las condiciones de éxito
- Los puntos de decisión deben tener **todas las ramas cubiertas** (incluyendo el caso error)
- Si una tarea puede bloquearse indefinidamente, debe tener **un SLA y una escalación**
- Separar siempre: tareas humanas, tareas de sistema y tareas mixtas

## Niveles de detalle

Adaptar el nivel de detalle según lo que pida el usuario:
- **Nivel 1 — Mapa de proceso**: solo secciones 1–5 (visión rápida)
- **Nivel 2 — Proceso completo**: secciones 1–9 (documentación operativa)
- **Nivel 3 — Proceso automatizable**: todas las secciones (listo para n8n + Supabase)

Si el usuario no especifica el nivel, usar **Nivel 2** por defecto.
