import type { DeployFiles, DeployResult, DeployStatus, Deployer } from '@/types'

const API_BASE = 'https://api.vercel.com'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function filesToVercelPayload(files: DeployFiles) {
  return Object.entries(files).map(([path, content]) => ({
    file: path,
    data: Buffer.from(content).toString('base64'),
    encoding: 'base64' as const,
  }))
}

export const VercelDeployer: Deployer = {
  name: 'vercel',

  async deploy(files: DeployFiles, apiKey: string): Promise<DeployResult> {
    const res = await fetch(`${API_BASE}/v13/deployments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'forgeai-project',
        target: 'production',
        files: filesToVercelPayload(files),
        projectSettings: {
          framework: 'nextjs',
          buildCommand: 'npm run build',
          outputDirectory: 'dist',
          installCommand: 'npm install',
          devCommand: 'npm run dev',
        },
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown Vercel error')
      throw new Error(`Vercel deploy error ${res.status}: ${text}`)
    }

    const data = (await res.json()) as {
      id: string
      url: string
      alias?: string[]
      readyState?: string
    }

    const deployId = data.id
    const url = data.alias?.[0] ?? data.url

    if (!url || !deployId) {
      throw new Error('Vercel returned invalid deploy response')
    }

    for (let i = 0; i < 30; i++) {
      const status = await this.status(deployId, apiKey)
      if (status.status === 'ready' || status.status === 'error') {
        break
      }
      await sleep(2000)
    }

    return { url, deployId }
  },

  async status(deployId: string, apiKey: string): Promise<DeployStatus> {
    const res = await fetch(`${API_BASE}/v13/deployments/${deployId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown Vercel error')
      return {
        status: 'error',
        url: '',
        error: `Vercel status error ${res.status}: ${text}`,
      }
    }

    const data = (await res.json()) as {
      readyState:
        | 'INITIALIZING'
        | 'ANALYZING'
        | 'BUILDING'
        | 'DEPLOYING'
        | 'READY'
        | 'ERROR'
      url: string
      alias?: string[]
      error?: { message: string }
    }

    const map: Record<string, DeployStatus['status']> = {
      INITIALIZING: 'building',
      ANALYZING: 'building',
      BUILDING: 'building',
      DEPLOYING: 'building',
      READY: 'ready',
      ERROR: 'error',
    }

    return {
      status: map[data.readyState] ?? 'error',
      url: data.alias?.[0] ?? data.url,
      error: data.error?.message,
    }
  },

  async delete(deployId: string, apiKey: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/v13/deployments/${deployId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    return res.ok
  },
}
