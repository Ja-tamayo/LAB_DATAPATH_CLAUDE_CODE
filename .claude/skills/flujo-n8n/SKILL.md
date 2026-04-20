---
name: flujo-n8n
description: Diseña o revisa un workflow n8n para Qudox HR v2.
---

# Flujo n8n

Usa esta skill cuando un caso necesite:
- IA
- automatización
- scheduler
- notificación
- integración
- clasificación o resumen documental

Siempre debes responder con el siguiente formato completo:

## 1. Nombre del workflow

## 2. Trigger de entrada

## 3. Datos que recibe desde Supabase

## 4. Pasos del workflow en n8n

## 5. Qué parte usa IA

## 6. Qué puede sugerir la IA

## 7. Qué no puede decidir la IA

## 8. Qué escribe de vuelta en Supabase

## 9. Estrategia de retry

## 10. Logs y observabilidad

---

## Reglas obligatorias

- n8n **no es la fuente de verdad** — Supabase lo es
- la IA **no debe guardar por sí sola** el estado oficial del negocio
- toda salida relevante **debe persistirse en Supabase** antes de notificar
- los nodos de IA deben estar en pasos intermedios, nunca como nodo final de escritura
- los reintentos deben ser idempotentes (misma entrada = mismo resultado sin duplicados)
- loguear siempre: workflow_name, trigger_id, timestamp, resultado y error si aplica

## Criterios de calidad por sección

### Trigger
- Debe especificar si es webhook, cron, evento de Supabase (realtime/webhook), o manual
- Incluir payload de ejemplo

### Pasos n8n
- Numerar cada nodo
- Especificar tipo de nodo n8n (HTTP Request, Supabase, OpenAI, Code, IF, etc.)
- Indicar qué dato entra y qué dato sale de cada nodo

### Uso de IA
- Modelo recomendado (claude-haiku para clasificación rápida, claude-sonnet para razonamiento)
- Temperatura sugerida
- Si el output es estructurado, especificar el schema JSON esperado

### Retry
- Número máximo de reintentos
- Backoff (lineal / exponencial)
- Condición de fallo definitivo y qué se escribe en Supabase en ese caso

### Observabilidad
- Tabla de Supabase donde se escriben los logs
- Campos mínimos: `workflow_name`, `run_id`, `status`, `payload`, `error`, `created_at`
