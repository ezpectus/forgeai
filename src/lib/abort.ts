/**
 * Combine an abort-after-timeout with an external cancellation signal.
 * `AbortSignal.any` requires Node 20.3+; this package supports Node 18.18,
 * so we compose the signals manually. Aborting the returned signal's
 * controller also clears the timeout timer so no timers leak.
 */
export function timeoutSignal(
  timeoutMs: number,
  external?: AbortSignal
): AbortSignal {
  const ctl = new AbortController()
  const timer = setTimeout(
    () => ctl.abort(new DOMException('Request timed out', 'AbortError')),
    timeoutMs
  )

  const clear = () => clearTimeout(timer)

  if (external) {
    if (external.aborted) {
      clear()
      ctl.abort(external.reason)
    } else {
      external.addEventListener(
        'abort',
        () => {
          clear()
          ctl.abort(external.reason)
        },
        { once: true }
      )
    }
  }

  ctl.signal.addEventListener('abort', clear, { once: true })
  return ctl.signal
}
