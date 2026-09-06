import { describe, expect, it } from 'vitest';
import { areaSchema, projectSchema, serviceSchema, testimonialSchema } from '../../src/lib/schemas';

const validArea = {
  town: 'Beacon',
  state: 'NY',
  order: 1,
  headline: 'Landscaping in Beacon, NY',
  summary: 'Garden design, stonework, and grounds care for Beacon homes.',
  localNote:
    'Beacon sits on a steep east-facing grade below Mount Beacon, which means most properties here shed water fast and dry out at the top of the slope while pooling at the foundation. Older homes in the historic district also sit on shallow bedrock, so planting beds usually need building up rather than digging down, and terracing does more good than drainage pipe.',
  neighborhoods: ['Historic District', 'Fishkill Landing', 'Mount Beacon'],
  featuredProjectSlug: 'tioronda-terrace',
  localTestimonial: { quote: 'Ellis re-graded our whole side yard.', attribution: 'Dana R.', town: 'Beacon' },
  services: ['garden-design', 'patios-stonework'],
};

describe('areaSchema', () => {
  it('accepts a fully specified area', () => {
    expect(() => areaSchema.parse(validArea)).not.toThrow();
  });

  it('rejects a localNote shorter than 200 characters', () => {
    expect(() => areaSchema.parse({ ...validArea, localNote: 'We serve Beacon.' })).toThrow();
  });

  it('rejects fewer than three neighborhoods', () => {
    expect(() => areaSchema.parse({ ...validArea, neighborhoods: ['Historic District'] })).toThrow();
  });

  it('rejects a missing featured project reference', () => {
    const { featuredProjectSlug, ...withoutProject } = validArea;
    expect(() => areaSchema.parse(withoutProject)).toThrow();
  });

  it('rejects a missing local testimonial', () => {
    const { localTestimonial, ...withoutTestimonial } = validArea;
    expect(() => areaSchema.parse(withoutTestimonial)).toThrow();
  });
});

describe('serviceSchema', () => {
  const validService = {
    title: 'Garden Design & Planting',
    order: 1,
    summary: 'Planting plans that look intentional in every season.',
    heroImage: '/images/services/garden-design.jpg',
    heroAlt: 'A layered perennial border in late summer.',
    startingPrice: 'from $2,400',
    steps: [
      { title: 'Site walk', body: 'We walk the property together and talk through light, soil, and how you use the space.' },
      { title: 'Planting plan', body: 'You get a drawn plan with a named plant list and a phased budget.' },
      { title: 'Installation', body: 'I plant it myself, then check back through the first season.' },
    ],
    faqs: [{ question: 'How long until it fills in?', answer: 'Most borders read as intentional in year one and closed in by year three.' }],
  };

  it('accepts a fully specified service', () => {
    expect(() => serviceSchema.parse(validService)).not.toThrow();
  });

  it('requires at least three process steps', () => {
    expect(() => serviceSchema.parse({ ...validService, steps: validService.steps.slice(0, 2) })).toThrow();
  });

  it('requires alt text on the hero image', () => {
    expect(() => serviceSchema.parse({ ...validService, heroAlt: '' })).toThrow();
  });
});

describe('projectSchema', () => {
  const validProject = {
    title: 'Tioronda Terrace',
    order: 1,
    town: 'Beacon',
    year: 2025,
    service: 'patios-stonework',
    summary: 'A bluestone terrace cut into a steep side yard.',
    beforeImage: '/images/work/tioronda-before.jpg',
    beforeAlt: 'A steep eroding side yard before work.',
    afterImage: '/images/work/tioronda-after.jpg',
    afterAlt: 'The same yard as a level bluestone terrace.',
    scope: ['Excavation and re-grading', 'Dry-laid bluestone terrace', 'Native shade planting'],
  };

  it('accepts a fully specified project', () => {
    expect(() => projectSchema.parse(validProject)).not.toThrow();
  });

  it('requires both before and after alt text', () => {
    expect(() => projectSchema.parse({ ...validProject, afterAlt: '' })).toThrow();
  });
});

describe('testimonialSchema', () => {
  it('requires quote, attribution, and town', () => {
    expect(() => testimonialSchema.parse({ quote: 'Excellent.', attribution: 'M. Choi', town: 'Rhinebeck', order: 1 })).not.toThrow();
    expect(() => testimonialSchema.parse({ quote: 'Excellent.', attribution: 'M. Choi', order: 1 })).toThrow();
  });
});
