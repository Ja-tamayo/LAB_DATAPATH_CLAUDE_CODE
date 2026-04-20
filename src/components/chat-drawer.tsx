'use client'

import { useState } from 'react'
import { Bot, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TaskChat } from '@/components/chat/task-chat'

export function ChatDrawer() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* ── Trigger button (renders inline wherever this component is placed) ── */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium',
          'border transition-all duration-200',
          'bg-blue-500/10 border-blue-500/20 text-blue-400',
          'hover:bg-blue-500/20 hover:border-blue-500/40',
        )}
      >
        <Bot className="w-4 h-4" />
        <span className="hidden sm:inline text-xs">Asistente IA</span>
      </button>

      {/* ── Backdrop ── */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 backdrop-blur-sm z-40',
          'transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* ── Drawer panel ── */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-[400px] max-w-[95vw]',
          'bg-[#0d0d1a] border-l border-white/10 shadow-2xl',
          'z-50 flex flex-col',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">Asistente IA</span>
            <span className="text-[10px] text-neutral-600 bg-white/5 px-2 py-0.5 rounded-full">
              RAG · Voyage + Claude
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-neutral-500 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
            aria-label="Cerrar asistente"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat fills remaining height */}
        <div className="flex-1 min-h-0">
          <TaskChat />
        </div>
      </div>
    </>
  )
}
