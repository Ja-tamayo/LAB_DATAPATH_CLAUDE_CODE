'use client'

import { useEffect } from 'react'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app error]', error)
  }, [error])

  return (
    <div
      style={{
        margin: 0,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        background: '#0f0f1a',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        padding: '1rem',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: '1rem', fontWeight: 600 }}>Error inesperado</p>
      <p style={{ fontSize: '0.875rem', color: '#737373' }}>
        Por favor recarga la página o intenta de nuevo.
      </p>
      {error.digest && (
        <p style={{ fontSize: '0.625rem', color: '#404040', fontFamily: 'monospace' }}>
          ref: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '0.5rem',
          background: 'rgba(255,255,255,0.08)',
          color: '#d4d4d4',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.875rem',
        }}
      >
        Recargar
      </button>
    </div>
  )
}
