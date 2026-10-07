import React from 'react';
import TopBar from '../components/TopBar';
import SiteHeader from '../components/SiteHeader';
import ContactUs from '../components/ContactUs';
import SiteFooter from '../components/SiteFooter';

export default function ContactPage() {
  return (
    <div className="homepage">
      <TopBar />
      <SiteHeader activeLink="Contact Us" />
      <ContactUs />
      <SiteFooter />
    </div>
  );
}
