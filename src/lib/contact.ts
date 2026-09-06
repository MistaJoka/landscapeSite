import { z } from 'astro/zod';

export const MIN_FILL_MS = 3_000;

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.'),
  email: z.string().trim().email('Please enter a valid email address.'),
  phone: z.string().trim().optional().default(''),
  town: z.string().trim().min(2, 'Please tell me which town the property is in.'),
  service: z.string().trim().min(1, 'Please choose what you need.'),
  message: z.string().trim().min(20, 'Please add a sentence or two about the property.'),
});

export type ContactSubmission = z.infer<typeof contactSchema>;

export type ParseResult =
  | { ok: true; data: ContactSubmission }
  | { ok: false; errors: Record<string, string> };

const GENERIC_REJECTION = 'This message could not be submitted. Please call instead.';

export function parseSubmission(form: FormData, now: number): ParseResult {
  if (String(form.get('company') ?? '').trim() !== '') {
    return { ok: false, errors: { form: GENERIC_REJECTION } };
  }

  const startedAt = Number(form.get('startedAt'));
  if (!Number.isFinite(startedAt) || now - startedAt < MIN_FILL_MS) {
    return { ok: false, errors: { form: GENERIC_REJECTION } };
  }

  const parsed = contactSchema.safeParse({
    name: form.get('name') ?? '',
    email: form.get('email') ?? '',
    phone: form.get('phone') ?? '',
    town: form.get('town') ?? '',
    service: form.get('service') ?? '',
    message: form.get('message') ?? '',
  });

  if (parsed.success) return { ok: true, data: parsed.data };

  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0] ?? 'form');
    errors[field] ??= issue.message;
  }
  return { ok: false, errors };
}
