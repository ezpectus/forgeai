import type { DeployFiles, DeployResult, DeployStatus, Deployer } from '@/types'

const API_BASE = 'https://api.e2b.dev'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const E2BDeployer: Deployer = {
  name: 'e2b',

  async deploy(files: DeployFiles, apiKey: string): Promise<DeployResult> {
    const res = await fetch(`${API_BASE}/sandboxes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template: 'nextjs',
        timeout: 3600,
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown E2B error')
      throw new Error(`E2B deploy error ${res.status}: ${text}`)
    }

    const data = (await res.json()) as { id: string; url: string }
    const { id: deployId, url } = data

    if (!deployId || !url) {
      throw new Error('E2B returned invalid sandbox response')
    }

    for (const [path, content] of Object.entries(files)) {
      const fileRes = await fetch(
        `${API_BASE}/sandboxes/${deployId}/files/${encodeURIComponent(path)}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'text/plain',
          },
          body: content,
        }
      )

      if (!fileRes.ok) {
        throw new Error(`E2B file upload failed for ${path}`)
      }
    }

    const runRes = await fetch(`${API_BASE}/sandboxes/${deployId}/commands`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command: 'npm install && npm run build && npx serve dist',
        timeout: 300000,
      }),
    })

    if (!runRes.ok) {
      const text = await runRes.text().catch(() => 'Unknown E2B build error')
      throw new Error(`E2B build error ${runRes.status}: ${text}`)
    }

    await sleep(5000)

    return { url, deployId }
  },

  async status(deployId: string, apiKey: string): Promise<DeployStatus> {
    const res = await fetch(`${API_BASE}/sandboxes/${deployId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown E2B error')
      return {
        status: 'error',
        url: '',
        error: `E2B status error ${res.status}: ${text}`,
      }
    }

    const data = (await res.json()) as {
      running: boolean
      url?: string
      error?: string
    }

    return {
      status: data.running ? 'ready' : 'error',
      url: data.url ?? '',
      error: data.error,
    }
  },

  async delete(deployId: string, apiKey: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/sandboxes/${deployId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    return res.ok
  },
}
