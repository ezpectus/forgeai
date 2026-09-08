'use client'

import { cn } from '@/lib/utils'

function hashCode(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function pseudoRandom(seed: number, index: number): number {
  const x = Math.sin(seed * 9999 + index * 997) * 10000
  return x - Math.floor(x)
}

interface TemplateThumbnailProps {
  name: string
  topic: string
  className?: string
}

export function TemplateThumbnail({
  name,
  topic,
  className,
}: TemplateThumbnailProps) {
  const seed = hashCode(name + topic)
  const hue1 = seed % 360
  const hue2 = (seed * 13) % 360
  const hue3 = (seed * 31) % 360
  const initial = name.charAt(0).toUpperCase()

  const circles = Array.from({ length: 5 }, (_, i) => {
    const r = pseudoRandom(seed, i)
    const cx = 40 + r * 240
    const cy = 20 + pseudoRandom(seed, i + 50) * 140
    const radius = 30 + r * 90
    const opacity = 0.15 + r * 0.25
    return { cx, cy, radius, opacity, hue: (hue3 + i * 30) % 360 }
  })

  const gradientId = `thumb-gradient-${seed}`

  return (
    <svg
      viewBox="0 0 320 180"
      preserveAspectRatio="xMidYMid slice"
      className={cn('h-full w-full', className)}
      role="img"
      aria-label={`${name} preview`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={`hsl(${hue1}, 75%, 45%)`} />
          <stop offset="100%" stopColor={`hsl(${hue2}, 75%, 25%)`} />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${gradientId})`} />
      {circles.map((c, i) => (
        <circle
          key={i}
          cx={c.cx}
          cy={c.cy}
          r={c.radius}
          fill={`hsl(${c.hue}, 70%, 55%)`}
          opacity={c.opacity}
        />
      ))}
      <rect x="30" y="65" width="260" height="50" rx="8" fill="rgba(0,0,0,0.25)" />
      <text
        x="160"
        y="100"
        textAnchor="middle"
        fill="white"
        fontSize="28"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        {initial}
      </text>
      <text
        x="160"
        y="155"
        textAnchor="middle"
        fill="rgba(255,255,255,0.8)"
        fontSize="12"
        fontFamily="system-ui, sans-serif"
      >
        {topic}
      </text>
    </svg>
  )
}
