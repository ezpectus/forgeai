'use client'

import { useEffect, type ReactNode } from 'react'
import { useUI } from '@/stores/ui'

export function EditorOverlay({ children }: { children: ReactNode }) {
  const { selectComponent, openEditor } = useUI()

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (
        event.data?.action === 'select' &&
        typeof event.data.component === 'string'
      ) {
        selectComponent(event.data.component)
        openEditor()
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [selectComponent, openEditor])

  return <div className="relative h-full w-full">{children}</div>
}
