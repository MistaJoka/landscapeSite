export interface NavItem { label: string; href: string; }
export interface SiteConfig {
  business: {
    name: string;
    legalName: string;
    operator: string;
    tagline: string;
    phone: string;
    phoneHref: string;
    email: string;
    address: { street: string; city: string; region: string; postalCode: string; country: string };
    geo: { latitude: number; longitude: number };
    hours: string[];
    foundedYear: number;
    credentials: string[];
  };
  nav: NavItem[];
  social: { label: string; href: string }[];
  seo: { defaultTitle: string; titleTemplate: string; defaultDescription: string; ogImage: string };
}

const siteConfig: SiteConfig = {
  business: {
    name: 'Stonecrop Landscape Co.',
    legalName: 'Stonecrop Landscape Co.',
    operator: 'Ellis Vance',
    tagline: 'Gardens, stonework, and grounds care for the Hudson Valley.',
    phone: '(845) 555-0142',
    phoneHref: 'tel:+18455550142',
    email: 'hello@stonecroplandscape.com',
    address: {
      street: '12 Tioronda Avenue',
      city: 'Beacon',
      region: 'NY',
      postalCode: '12508',
      country: 'US',
    },
    geo: { latitude: 41.5048, longitude: -73.9696 },
    hours: ['Mon-Fri 7:00-17:00', 'Sat 8:00-13:00', 'Sun closed'],
    foundedYear: 2014,
    credentials: ['Licensed & insured', 'NY Certified Nursery Professional', 'Solo operator — one person on every job'],
  },
  nav: [
    { label: 'Services', href: '/services' },
    { label: 'Work', href: '/work' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ],
  social: [{ label: 'Instagram', href: 'https://instagram.com/stonecroplandscape' }],
  seo: {
    defaultTitle: 'Stonecrop Landscape Co. — Hudson Valley garden design & stonework',
    titleTemplate: '%s | Stonecrop Landscape Co.',
    defaultDescription:
      'Ellis Vance designs, builds, and maintains gardens, patios, and grounds across the Hudson Valley. One person on every job, start to finish.',
    ogImage: '/og/default.jpg',
  },
};

export default siteConfig;
