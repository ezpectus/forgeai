import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">404</h1>
      <p className="text-muted-foreground">This page does not exist.</p>
      <Button asChild>
        <Link href="/">Back to ForgeAI</Link>
      </Button>
    </div>
  )
}
