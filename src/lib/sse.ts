export interface SSEMessage {
  event: string
  data: unknown
}

const CONNECTION_TIMEOUT_MS = 120_000
const READ_TIMEOUT_MS = 300_000

/**
 * Wraps a streaming HTTP connection and turns Server-Sent Events from the
 * backend into typed callbacks the UI can act on during generation.
 */
export class SSEClient {
  private reader?: ReadableStreamDefaultReader<Uint8Array>
  private buffer = ''
  private controller = new AbortController()
  private cancelled = false
  private connectTimer?: ReturnType<typeof setTimeout>
  private readTimer?: ReturnType<typeof setTimeout>

  /**
   * Open a POST request, read the response as a stream, and dispatch each
   * parsed event to the provided handlers until the stream closes.
   */
  async connect(
    url: string,
    body: Record<string, unknown>,
    onMessage: (event: string, data: unknown) => void,
    onError: (error: Error) => void,
    onDone: () => void
  ): Promise<void> {
    this.cancelled = false
    this.controller = new AbortController()
    this.clearTimers()
    this.connectTimer = setTimeout(() => {
      this.abort(new DOMException('Connection timed out', 'AbortError'))
    }, CONNECTION_TIMEOUT_MS)

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${body.token as string}`,
        },
        body: JSON.stringify(body),
        signal: this.controller.signal,
      })

      if (this.connectTimer) {
        clearTimeout(this.connectTimer)
        this.connectTimer = undefined
      }

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }

      if (!res.body) {
        throw new Error('No response body')
      }

      this.reader = res.body.getReader()
      const decoder = new TextDecoder()
      this.resetReadTimeout()

      while (true) {
        const { done, value } = await this.reader.read()
        if (done) break
        this.resetReadTimeout()
        this.buffer += decoder.decode(value, { stream: true })
        this.processBuffer(onMessage, onError)
      }

      this.clearTimers()
      onDone()
    } catch (err) {
      this.clearTimers()
      if (err instanceof Error && err.name === 'AbortError') {
        const cause = err.cause
        const reason =
          cause instanceof Error ? cause.message : err.message
        onError(
          this.cancelled
            ? new Error('Generation cancelled')
            : new Error(reason || 'Generation timed out')
        )
        return
      }
      onError(err instanceof Error ? err : new Error(String(err)))
    }
  }

  private resetReadTimeout() {
    if (this.readTimer) clearTimeout(this.readTimer)
    this.readTimer = setTimeout(() => {
      this.abort(new DOMException('Read timed out', 'AbortError'))
    }, READ_TIMEOUT_MS)
  }

  private clearTimers() {
    if (this.connectTimer) clearTimeout(this.connectTimer)
    if (this.readTimer) clearTimeout(this.readTimer)
    this.connectTimer = undefined
    this.readTimer = undefined
  }

  private abort(error: Error) {
    this.controller.abort(error)
  }

  /**
   * Split the raw SSE buffer into `event` + `data` pairs and parse the
   * JSON payload so callers only receive structured messages.
   */
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

  // Close the active stream reader and abort the underlying fetch to stop
  // receiving events. This is more reliable than canceling the reader alone.
  disconnect(): void {
    this.cancelled = true
    this.clearTimers()
    this.controller.abort(new DOMException('Generation cancelled', 'AbortError'))
    this.reader?.cancel()
  }
}
