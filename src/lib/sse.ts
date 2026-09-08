export interface SSEMessage {
  event: string
  data: unknown
}

export class SSEClient {
  private reader?: ReadableStreamDefaultReader<Uint8Array>
  private buffer = ''

  async connect(
    url: string,
    body: Record<string, unknown>,
    onMessage: (event: string, data: unknown) => void,
    onError: (error: Error) => void,
    onDone: () => void
  ): Promise<void> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${body.token as string}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }

      if (!res.body) {
        throw new Error('No response body')
      }

      this.reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await this.reader.read()
        if (done) break
        this.buffer += decoder.decode(value, { stream: true })
        this.processBuffer(onMessage, onError)
      }

      onDone()
    } catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)))
    }
  }

  private processBuffer(
    onMessage: (event: string, data: unknown) => void,
    onError: (error: Error) => void
  ): void {
    const chunks = this.buffer.split('\n\n')
    this.buffer = chunks.pop() ?? ''

    for (const chunk of chunks) {
      const lines = chunk.split('\n')
      let event = 'message'
      let raw = ''

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          event = line.slice(7)
        } else if (line.startsWith('data: ')) {
          raw = line.slice(6)
        }
      }

      if (!raw) continue

      try {
        const data = JSON.parse(raw)
        onMessage(event, data)
      } catch {
        onError(new Error(`Failed to parse SSE data: ${raw}`))
      }
    }
  }

  disconnect(): void {
    this.reader?.cancel()
  }
}
