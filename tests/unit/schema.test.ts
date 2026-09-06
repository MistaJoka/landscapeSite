import { describe, expect, it } from 'vitest';
import { breadcrumbJsonLd, faqJsonLd, localBusinessJsonLd, serviceJsonLd } from '../../src/lib/schema';

const site = new URL('https://stonecroplandscape.com');

describe('localBusinessJsonLd', () => {
  const data = localBusinessJsonLd(site) as Record<string, any>;

  it('declares the correct type and context', () => {
    expect(data['@context']).toBe('https://schema.org');
    expect(data['@type']).toBe('LandscapingBusiness');
  });
  it('includes complete postal address fields', () => {
    expect(data.address['@type']).toBe('PostalAddress');
    for (const key of ['streetAddress', 'addressLocality', 'addressRegion', 'postalCode', 'addressCountry']) {
      expect(data.address[key]).toBeTruthy();
    }
  });
  it('includes geo coordinates and a telephone', () => {
    expect(typeof data.geo.latitude).toBe('number');
    expect(typeof data.geo.longitude).toBe('number');
    expect(data.telephone).toBeTruthy();
  });
  it('lists every served town in areaServed', () => {
    const towns = data.areaServed.map((a: any) => a.name);
    expect(towns).toEqual(
      expect.arrayContaining(['Beacon', 'Cold Spring', 'Rhinebeck', 'New Paltz', 'Kingston', 'Hudson']),
    );
  });
});

describe('serviceJsonLd', () => {
  it('builds a Service node with a provider reference', () => {
    const data = serviceJsonLd({
      name: 'Patios & Stonework',
      description: 'Dry-laid bluestone.',
      url: 'https://stonecroplandscape.com/services/patios-stonework',
      areaServed: ['Beacon', 'Kingston'],
    }) as Record<string, any>;
    expect(data['@type']).toBe('Service');
    expect(data.name).toBe('Patios & Stonework');
    expect(data.provider['@type']).toBe('LandscapingBusiness');
    expect(data.areaServed).toHaveLength(2);
  });
});

describe('faqJsonLd', () => {
  it('maps each question to an accepted answer', () => {
    const data = faqJsonLd([{ question: 'How long?', answer: 'Three weeks.' }]) as Record<string, any>;
    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity[0]['@type']).toBe('Question');
    expect(data.mainEntity[0].acceptedAnswer.text).toBe('Three weeks.');
  });
});

describe('breadcrumbJsonLd', () => {
  it('numbers positions from one', () => {
    const data = breadcrumbJsonLd([
      { name: 'Home', url: 'https://stonecroplandscape.com/' },
      { name: 'Services', url: 'https://stonecroplandscape.com/services' },
    ]) as Record<string, any>;
    expect(data.itemListElement[0].position).toBe(1);
    expect(data.itemListElement[1].position).toBe(2);
    expect(data.itemListElement[1].name).toBe('Services');
  });
});
