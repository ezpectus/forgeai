/**
 * Open a URL in a new tab with `noopener` and `noreferrer` for security.
 * Using an anchor element is more reliable than `window.open` for setting
 * the link relationship. No-op if `url` is empty.
 */
export function openUrl(url: string | undefined) {
  if (!url) return

  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  a.click()
}
