import siteConfig from '../../site.config';
import { absoluteUrl } from './seo';

const SERVED_TOWNS = ['Beacon', 'Cold Spring', 'Rhinebeck', 'New Paltz', 'Kingston', 'Hudson'];

export function localBusinessJsonLd(site: URL | undefined) {
  const { business } = siteConfig;
  return {
    '@context': 'https://schema.org',
    '@type': 'LandscapingBusiness',
    '@id': `${absoluteUrl('/', site)}#business`,
    name: business.name,
    legalName: business.legalName,
    description: siteConfig.seo.defaultDescription,
    url: absoluteUrl('/', site),
    telephone: business.phone,
    email: business.email,
    founder: { '@type': 'Person', name: business.operator },
    foundingDate: String(business.foundedYear),
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address.street,
      addressLocality: business.address.city,
      addressRegion: business.address.region,
      postalCode: business.address.postalCode,
      addressCountry: business.address.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: business.geo.latitude,
      longitude: business.geo.longitude,
    },
    areaServed: SERVED_TOWNS.map((name) => ({ '@type': 'City', name })),
    openingHours: business.hours,
    image: absoluteUrl(siteConfig.seo.ogImage, site),
  };
}

export function serviceJsonLd(input: {
  name: string;
  description: string;
  url: string;
  areaServed: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    description: input.description,
    url: input.url,
    serviceType: input.name,
    provider: { '@type': 'LandscapingBusiness', name: siteConfig.business.name },
    areaServed: input.areaServed.map((name) => ({ '@type': 'City', name })),
  };
}

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

export function breadcrumbJsonLd(crumbs: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}
