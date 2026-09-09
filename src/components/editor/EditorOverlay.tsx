'use client'

import { useEffect, type ReactNode } from 'react'
import { useUI } from '@/stores/ui'
import { useProject } from '@/stores/project'

function getAllowedOrigin(): string | null {
  const deployUrl = useProject.getState().deployUrl
  if (!deployUrl) return null
  try {
    return new URL(deployUrl).origin
  } catch {
    return null
  }
}

export function EditorOverlay({ children }: { children: ReactNode }) {
  const { selectComponent, openEditor } = useUI()

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const allowed = getAllowedOrigin()
      // Block messages from unrecognized origins. When deployUrl is not set
      // (local preview), use the current window's origin as fallback.
      const expectedOrigin = allowed ?? window.location.origin
      if (event.origin !== expectedOrigin) {
        return
      }

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
