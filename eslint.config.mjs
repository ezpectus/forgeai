import nextEslint from 'eslint-config-next'

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...nextEslint,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]

export default config
