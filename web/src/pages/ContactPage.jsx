import React from 'react';
import TopBar from '../components/TopBar';
import SiteHeader from '../components/SiteHeader';
import ContactUs from '../components/ContactUs';
import SiteFooter from '../components/SiteFooter';
import SEO from '../components/SEO';

export default function ContactPage() {
  const contactSchema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'FAYWALK Customer Support',
    description: 'Contact FAYWALK for support, order inquiries, and customer service.',
    mainEntity: {
      '@type': 'Organization',
      name: 'FAYWALK',
      telephone: '+91-63798-38682',
      email: 'faywalkvibee@gmail.com',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'A52 3RD Main Road, Maharajanagar, Palayamkottai',
        addressLocality: 'Tirunelveli',
        addressRegion: 'Tamil Nadu',
        postalCode: '627011',
        addressCountry: 'IN',
      },
    },
  };

  return (
    <div className="homepage">
      <SEO
        title="Contact Us | Customer Support & Inquiries"
        description="Have questions about your order, sizing, or product details? Contact FAYWALK customer care via email, phone, or message. We are here to help."
        canonical="https://www.faywalk.com/contact"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Contact Us', path: '/contact' },
        ]}
        schema={contactSchema}
      />
      <TopBar />
      <SiteHeader activeLink="Contact Us" />
      <ContactUs />
      <SiteFooter />
    </div>
  );
}
