# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

## Reporting a Vulnerability

If you discover a security issue in ForgeAI, please do **not** open a public issue. Instead, report it privately:

1. Email the maintainers at `security@forgeai.dev` (update to your real address).
2. Include a clear description of the issue, steps to reproduce, and potential impact.
3. Allow up to 72 hours for an initial response.

We will investigate and respond as quickly as possible. If the vulnerability is confirmed, we will release a patch and credit you in the changelog (unless you prefer to remain anonymous).

## Security Measures

- All API requests are rate-limited per IP.
- Generated code is validated for dangerous patterns (`eval`, `new Function`, `dangerouslySetInnerHTML`, prototype pollution, etc.).
- A security scanner runs in CI to detect leaked API keys and dangerous patterns.
- CSP and other security headers are enforced in both the Next.js frontend and the Hono API.
- API keys are stored only in the user's browser (IndexedDB) and are never logged or transmitted outside the configured providers.

## Running the Security Scanner Locally

```bash
npm run security
```

This will scan the codebase for potential API key leaks and dangerous code patterns. Non-zero exit means a finding was detected.
