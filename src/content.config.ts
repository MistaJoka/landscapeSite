import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { areaSchema, projectSchema, serviceSchema, testimonialSchema } from './lib/schemas';

export const collections = {
  services: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
    schema: serviceSchema,
  }),
  areas: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/areas' }),
    schema: areaSchema,
  }),
  projects: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
    schema: projectSchema,
  }),
  testimonials: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/testimonials' }),
    schema: testimonialSchema,
  }),
};
