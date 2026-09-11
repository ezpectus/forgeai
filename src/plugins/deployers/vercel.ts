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

  async deploy(
    files: DeployFiles,
    apiKey: string,
    env?: Record<string, string>
  ): Promise<DeployResult> {
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
        // Build-time env for the generated project (e.g. NEXT_PUBLIC_PROJECT_ID
        // groups form submissions per deployment).
        ...(env && Object.keys(env).length ? { env } : {}),
        projectSettings: {
          framework: 'nextjs',
          buildCommand: 'npm run build',
          // output:'export' emits the static site to out/ — not dist.
          outputDirectory: 'out',
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

    // Poll until the deployment finishes — previously the loop broke on
    // 'error' but still returned the URL, so the UI reported a successful
    // deploy for a failed Vercel build.
    let last: DeployStatus | null = null
    for (let i = 0; i < 30; i++) {
      last = await this.status(deployId, apiKey)
      if (last.status === 'ready' || last.status === 'error') break
      await sleep(2000)
    }

    if (last?.status === 'error') {
      throw new Error(last.error || 'Vercel deployment failed')
    }
    if (last?.status !== 'ready') {
      // Timed out waiting — the deployment may still finish, so return the
      // URL but be explicit it isn't confirmed ready yet.
      return { url, deployId, pending: true }
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
