export interface EmailMessage {
  to: string
  subject: string
  html: string
}

export interface EmailProvider {
  name: 'resend' | 'sendgrid'
  apiKey: string
  from: string
}

function escapeHtml(text: string): string {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return text.replace(/[&<>"']/g, (char) => map[char as keyof typeof map])
}

export async function sendEmail(
  provider: EmailProvider,
  message: EmailMessage
): Promise<void> {
  if (provider.name === 'resend') {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: provider.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
      }),
    })

    if (!res.ok) {
      const data = (await res.json()) as { message?: string }
      throw new Error(data.message ?? 'Resend email failed')
    }

    return
  }

  if (provider.name === 'sendgrid') {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }] }],
        from: { email: provider.from },
        subject: message.subject,
        content: [{ type: 'text/html', value: message.html }],
      }),
    })

    if (!res.ok) {
      throw new Error(`SendGrid email failed: ${res.status}`)
    }

    return
  }

  throw new Error('Unsupported email provider')
}

export function renderWelcomeEmail(name: string): string {
  return `<h1>Welcome, ${escapeHtml(name)}</h1><p>Thanks for signing up.</p>`
}

export function renderReminderEmail(name: string, date: string): string {
  return `<h1>Reminder for ${escapeHtml(name)}</h1><p>Your scheduled date: ${escapeHtml(date)}</p>`
}

export function renderFaqEmail(question: string, answer?: string): string {
  return answer
    ? `<h1>Re: ${escapeHtml(question)}</h1><p>${escapeHtml(answer)}</p>`
    : `<h1>Thanks for your question</h1><p>We received: <em>${escapeHtml(question)}</em>. Our team will respond soon.</p>`
}

export async function sendWelcomeEmail(
  provider: EmailProvider,
  to: string,
  name: string
): Promise<void> {
  await sendEmail(provider, {
    to,
    subject: 'Welcome',
    html: renderWelcomeEmail(name),
  })
}

export async function sendReminderEmail(
  provider: EmailProvider,
  to: string,
  name: string,
  date: string
): Promise<void> {
  await sendEmail(provider, {
    to,
    subject: 'Reminder',
    html: renderReminderEmail(name, date),
  })
}

export async function sendFaqAutoResponse(
  provider: EmailProvider,
  to: string,
  question: string,
  answer?: string
): Promise<void> {
  await sendEmail(provider, {
    to,
    subject: 'Re: Your question',
    html: renderFaqEmail(question, answer),
  })
}

function scheduleAt(fn: () => void, target: number): () => void {
  let cancel = () => {}

  function loop() {
    const remaining = target - Date.now()
    if (remaining <= 0) {
      fn()
      return
    }
    const id = setTimeout(loop, Math.min(remaining, 2147483647))
    cancel = () => clearTimeout(id)
  }

  loop()
  return () => cancel()
}

export function scheduleReminderEmail(
  provider: EmailProvider,
  to: string,
  name: string,
  date: string
): () => void {
  const target = new Date(date)
  if (Number.isNaN(target.getTime())) {
    throw new Error('Invalid reminder date')
  }

  return scheduleAt(() => {
    sendReminderEmail(provider, to, name, date).catch(() => undefined)
  }, target.getTime())
}
