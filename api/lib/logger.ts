/* eslint-disable no-console */
export const log = {
  info(...args: unknown[]) {
    if (process.env.NODE_ENV === 'test') return
    console.log(...args)
  },

  error(...args: unknown[]) {
    if (process.env.NODE_ENV === 'test') return
    console.error(...args)
  },
}
