'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Save } from 'lucide-react'
import { updateUserWeeklyCapacity } from '@/actions/users'
import { cn } from '@/lib/utils'

interface CapacityInputProps {
  userId: string
  value: number
  disabled?: boolean
}

export function CapacityInput({ userId, value, disabled = false }: CapacityInputProps) {
  const router = useRouter()
  const [draft, setDraft] = useState(String(value))
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  function commitChange() {
    setMessage(null)
    setError(null)
    const next = Number.parseInt(draft, 10)
    const safeNext = Number.isFinite(next) ? Math.max(0, next) : value
    if (safeNext === value) {
      setDraft(String(value))
      return
    }
    startTransition(async () => {
      const result = await updateUserWeeklyCapacity(userId, safeNext)
      if (result.error) {
        setDraft(String(value))
        setError(result.error)
        return
      }
      setDraft(String(result.capacity ?? safeNext))
      setMessage('Guardado')
      router.refresh()
    })
  }

  return (
    <div className="flex min-w-0 flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={draft}
            disabled={disabled || pending}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitChange()
              }
            }}
            className={cn(
              'w-16 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-right text-[11px] text-white',
              'focus:outline-none focus:border-blue-500/40',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          />
          <span className="text-[10px] text-neutral-600">t/sem</span>
        </div>
        <button
          type="button"
          disabled={disabled || pending}
          onClick={commitChange}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] text-neutral-300 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Guardar
        </button>
      </div>
      {error && <p className="text-[9px] text-red-400">{error}</p>}
      {message && (
        <p className="inline-flex items-center gap-1 text-[9px] text-green-400">
          <Check className="h-3 w-3" />
          {message}
        </p>
      )}
    </div>
  )
}
