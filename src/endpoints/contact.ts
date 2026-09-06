import type { APIRoute } from 'astro';
import { parseSubmission } from '../lib/contact';
import { withBase } from '../lib/url';

// Astro resolves `prerender` at compile time, so this must stay a literal —
// a variable here silently falls back to true and the POST handler is dropped.
// This file is NOT under src/pages — astro.config.mjs injects it as a route
// only for the server-capable build, so the static host never sees it.
export const prerender = false;

function html(status: number, heading: string, body: string): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${heading}</title>
     <meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
     <style>body{font-family:system-ui,sans-serif;background:#FAF9F6;color:#16181A;margin:0;
     display:grid;place-items:center;min-height:100dvh;padding:2rem;text-align:center}
     a{color:#3F5641}</style></head>
     <body><main><h1>${heading}</h1><p>${body}</p><p><a href="${withBase('/contact')}">Back to the contact page</a></p></main></body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const result = parseSubmission(form, Date.now());
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');

  if (!result.ok) {
    return wantsJson
      ? new Response(JSON.stringify({ ok: false, errors: result.errors }), {
          status: 422,
          headers: { 'content-type': 'application/json' },
        })
      : html(422, 'That message did not go through', Object.values(result.errors)[0] ?? 'Please check the form and try again.');
  }

  // INTEGRATION POINT — email delivery.
  // Replace this log with the provider call once an API key exists, e.g.:
  //   await new Resend(import.meta.env.RESEND_API_KEY).emails.send({ ... });
  // Everything above this line is complete and tested; only the delivery hop is deferred.
  console.info('[contact] validated submission', {
    ...result.data,
    receivedAt: new Date().toISOString(),
  });

  return wantsJson
    ? new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } })
    : html(200, 'Thank you — your message is in', 'I read every message myself and usually reply within a day.');
};
