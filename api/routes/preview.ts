import { Hono } from 'hono'
import { build, type Plugin } from 'esbuild'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import { validateFileMap } from '../lib/validate-files'
import type { AppEnv } from '../lib/env'

const app = new Hono<AppEnv>()

/**
 * Local preview: bundle the generated project server-side and return a
 * self-contained JS string + compiled Tailwind CSS for a srcdoc iframe.
 * No external CDN — react/lucide resolve from this server's node_modules so
 * the preview needs no CSP changes (inline script is already allowed).
 */
app.post('/', async (c) => {
  let body: { files: Record<string, string> }
  try {
    body = await c.req.json<typeof body>()
  } catch {
    return c.json({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, 400)
  }

  const fileError = validateFileMap(body.files)
  if (fileError) {
    return c.json({ error: fileError, code: 'BAD_REQUEST' }, 400)
  }

  const files = body.files
  const pageKey =
    'src/app/page.tsx' in files ? 'src/app/page.tsx' : null
  if (!pageKey) {
    return c.json(
      { error: 'files must contain src/app/page.tsx', code: 'BAD_REQUEST' },
      400
    )
  }

  // Resolve '@/x' and relative paths against the in-memory files map.
  const virtualFs: Plugin = {
    name: 'virtual-fs',
    setup(b) {
      const resolveKey = (importer: string, path: string): string | null => {
        const candidates: string[] = []
        if (path.startsWith('@/')) {
          candidates.push(`src/${path.slice(2)}`)
        } else if (path.startsWith('.')) {
          const base = importer.split('/').slice(0, -1)
          for (const seg of path.split('/')) {
            if (seg === '..') base.pop()
            else if (seg !== '.') base.push(seg)
          }
          candidates.push(base.join('/'))
        } else {
          return null // bare specifier → node_modules
        }
        for (const key of candidates) {
          for (const ext of ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx']) {
            if (key + ext in files) return key + ext
          }
        }
        return null
      }

      // Inside virtual files: '@/x' and relative imports resolve to the
      // files map; bare specifiers (react, lucide-react, react/jsx-runtime,
      // scoped packages like @supabase/supabase-js) resolve against real
      // node_modules — virtual paths have no directory to resolve from.
      b.onResolve({ filter: /.*/ }, (args) => {
        if (args.namespace !== 'vfs') return undefined
        if (!args.path.startsWith('.') && !args.path.startsWith('@/')) {
          return b.resolve(args.path, {
            resolveDir: process.cwd(),
            kind: args.kind,
          })
        }
        const key = resolveKey(args.importer, args.path)
        if (!key) {
          return {
            errors: [
              {
                text: `Unresolved import '${args.path}' from ${args.importer || 'entry'} — not in files map`,
              },
            ],
          }
        }
        return { path: key, namespace: 'vfs' }
      })
      b.onLoad({ filter: /.*/, namespace: 'vfs' }, (args) => ({
        contents: files[args.path],
        loader: args.path.endsWith('.css')
          ? 'css'
          : args.path.endsWith('.json')
            ? 'json'
            : args.path.endsWith('.tsx')
              ? 'tsx'
              : 'ts',
      }))
    },
  }

  try {
    // Bundle every generated page and switch between them in-iframe:
    // sandboxed srcdoc can't navigate to /about, so clicks on same-origin
    // links are intercepted and re-render the matching page component.
    const pageFiles = Object.keys(files).filter((k) =>
      /^src\/app\/(.*\/)?page\.tsx$/.test(k)
    )
    const routeOf = (k: string) => {
      const dir = k.replace(/^src\/app\//, '').replace(/\/page\.tsx$/, '')
      return dir === 'page.tsx' || dir === '' ? '/' : `/${dir}`
    }
    const imports = pageFiles
      .map((k, i) => `import Page${i} from '@vfs:${k}'`)
      .join('\n')
    const routeMap =
      'const routes = {' +
      pageFiles.map((k, i) => `${JSON.stringify(routeOf(k))}: Page${i}`).join(',') +
      '}'

    const bundled = await build({
      stdin: {
        contents:
          `import { createRoot } from 'react-dom/client'\n` +
          `import { useState, useEffect, StrictMode } from 'react'\n` +
          imports + '\n' +
          ('src/components/Nav.tsx' in files
            ? `import { Nav } from '@vfs:src/components/Nav.tsx'\n`
            : `const Nav = () => null\n`) +
          routeMap + '\n' +
          `function App() {\n` +
          `  const [route, setRoute] = useState('/')\n` +
          `  useEffect(() => {\n` +
          `    const onClick = (e) => {\n` +
          `      const a = e.target?.closest?.('a[href^="/"]')\n` +
          `      if (a && routes[a.getAttribute('href')]) { e.preventDefault(); setRoute(a.getAttribute('href')) }\n` +
          `    }\n` +
          `    document.addEventListener('click', onClick)\n` +
          `    return () => document.removeEventListener('click', onClick)\n` +
          `  }, [])\n` +
          `  const Page = routes[route] ?? routes['/']\n` +
          `  return <><Nav /><Page /></>\n` +
          `}\n` +
          `createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)`,
        resolveDir: process.cwd(),
        loader: 'tsx',
      },
      bundle: true,
      write: false,
      format: 'iife',
      jsx: 'automatic',
      define: { 'process.env.NODE_ENV': '"production"' },
      plugins: [
        {
          name: 'vfs-entry',
          setup(b) {
            b.onResolve({ filter: /^@vfs:/ }, (a) => ({
              path: a.path.slice(5),
              namespace: 'vfs',
            }))
          },
        },
        virtualFs,
      ],
      logLevel: 'silent',
    })

    const js = bundled.outputFiles[0].text

    // Compile the generated globals.css through Tailwind, scanning every
    // generated file for class names. The theme mapping is hardcoded to the
    // shape the assembler emits — the files map is client input, so the
    // generated tailwind.config.ts is NEVER evaluated here (would be RCE).
    let css = ''
    const globalsCss = files['src/app/globals.css'] ?? ''
    if (globalsCss) {
      const colors = [
        'border', 'input', 'ring', 'background', 'foreground',
        'primary', 'secondary', 'destructive', 'muted', 'accent',
        'popover', 'card', 'success', 'warning',
      ]
      const colorMap = Object.fromEntries(
        colors.map((k) => [
          k,
          k === 'border' || k === 'input' || k === 'ring' || k === 'background' || k === 'foreground'
            ? `hsl(var(--${k}))`
            : { DEFAULT: `hsl(var(--${k}))`, foreground: `hsl(var(--${k}-foreground))` },
        ])
      )
      const raw = Object.entries(files)
        .filter(([k]) => k.endsWith('.tsx') || k.endsWith('.ts'))
        .map(([, v]) => ({ raw: v, extension: 'tsx' }))
      const result = await postcss([
        tailwindcss({
          content: raw,
          theme: {
            extend: {
              colors: colorMap,
              borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
              },
            },
          },
        }),
      ]).process(globalsCss, { from: undefined })
      css = result.css
    }

    return c.json({ js, css })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ error: message }, 500)
  }
})

export default app
