'use client'

import { useEffect, useState } from 'react'
import { getHistory, rollbackTo, saveSnapshot } from '@/lib/version-history'
import { Button } from '@/components/ui/button'

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function VersionHistory({
  componentName,
  currentCode,
  onRestore,
}: {
  componentName: string
  currentCode: string
  onRestore: (code: string) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const [history, setHistory] = useState<ReturnType<typeof getHistory>>([])

  useEffect(() => {
    setHistory(getHistory(componentName))
  }, [componentName])

  function handleRestore(id: string) {
    const snapshot = rollbackTo(componentName, id)
    if (snapshot) {
      onRestore(snapshot.code)
      setHistory(getHistory(componentName))
    }
  }

  function handleSave() {
    saveSnapshot(componentName, currentCode)
    setHistory(getHistory(componentName))
  }

  const visible = showAll ? history : history.slice(-3)

  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Version History</h4>
        <Button variant="ghost" size="sm" onClick={handleSave}>
          Save current
        </Button>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        {visible.map((snapshot, index) => {
          const version = showAll
            ? index + 1
            : history.length - visible.length + index + 1
          return (
            <div
              key={snapshot.id}
              className="flex items-center justify-between rounded border p-2 text-sm"
            >
              <div>
                <span className="font-medium">v{version}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {timeAgo(snapshot.timestamp)}
              </span>
              {snapshot.instruction && (
                <p className="text-xs text-muted-foreground">
                  {snapshot.instruction}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRestore(snapshot.id)}
            >
              Restore
            </Button>
          </div>
        )
      })}
      </div>
      {history.length > 3 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="mt-2"
        >
          {showAll ? 'Show less' : 'Show all'}
        </Button>
      )}
    </div>
  )
}
