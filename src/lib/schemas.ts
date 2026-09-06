import { z } from 'astro/zod';

export const serviceSchema = z.object({
  title: z.string().min(1),
  order: z.number().int(),
  summary: z.string().min(20),
  heroImage: z.string().min(1),
  heroAlt: z.string().min(1),
  startingPrice: z.string().min(1),
  steps: z.array(z.object({ title: z.string().min(1), body: z.string().min(20) })).min(3),
  faqs: z.array(z.object({ question: z.string().min(1), answer: z.string().min(1) })).min(1),
});

export const areaSchema = z.object({
  town: z.string().min(1),
  state: z.string().length(2),
  order: z.number().int(),
  headline: z.string().min(1),
  summary: z.string().min(20),
  localNote: z.string().min(200),
  neighborhoods: z.array(z.string().min(1)).min(3),
  featuredProjectSlug: z.string().min(1),
  localTestimonial: z.object({
    quote: z.string().min(1),
    attribution: z.string().min(1),
    town: z.string().min(1),
  }),
  services: z.array(z.string().min(1)).min(1),
});

export const projectSchema = z.object({
  title: z.string().min(1),
  order: z.number().int(),
  town: z.string().min(1),
  year: z.number().int(),
  service: z.string().min(1),
  summary: z.string().min(20),
  beforeImage: z.string().min(1),
  beforeAlt: z.string().min(1),
  afterImage: z.string().min(1),
  afterAlt: z.string().min(1),
  scope: z.array(z.string().min(1)).min(2),
});

export const testimonialSchema = z.object({
  quote: z.string().min(1),
  attribution: z.string().min(1),
  town: z.string().min(1),
  order: z.number().int(),
});
