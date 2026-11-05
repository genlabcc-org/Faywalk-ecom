import React, { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import './Policy.css';
import SiteHeader from '../components/SiteHeader';
import TopBar from '../components/TopBar';
import SEO from '../components/SEO';
import { useStore } from '../hooks/useStore';
import { getNavPath } from '../services/categoryRoute';

const SiteFooter = lazy(() => import('../components/SiteFooter'));

const LoadingSkeleton = ({ height = '200px' }) => (
  <div style={{ height, background: '#f5f5f5', borderRadius: '8px', margin: '16px 0' }} />
);

export default function AboutPage() {
  const navigate = useNavigate();
  const categories = useStore((state) => state.categories);

  const handleHeaderLinkClick = (link, subName) => {
    if (link === 'Home') {
      navigate('/');
    } else {
      navigate(getNavPath(link, categories, subName));
    }
  };

  return (
    <div className="policy-root">
      <SEO
        title="About Us | FAYWALK – Fashion Tomorrow"
        description="Established in 2004 under the Seyad Group of Companies, Faywalk Fashion makes exceptional comfort, quality, and style accessible to everyone."
        canonical="https://www.faywalk.com/about"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'About Us', path: '/about' },
        ]}
      />
      <TopBar />
      <SiteHeader activeLink="About" onLinkClick={handleHeaderLinkClick} />

      <section className="policy-section">
        <div className="policy-card about-card">
          {/* Top Logo */}
          <div className="about-logo-header">
            <img src="/logo.png" alt="Faywalk Logo" className="about-top-logo" />
          </div>

          <div className="about-header-center">
            <span className="policy-badge">Since 2004 · Seyad Group</span>
            <h1 className="policy-h1">About Faywalk</h1>
          </div>

          <p className="policy-intro about-lead">
            Established in 2004, under the <strong>Seyad Group of Companies</strong>,{' '}
            <strong>Faywalk Fashion</strong> began its journey in the southern region of Tamil Nadu with a
            simple yet powerful belief:{' '}
            <em>Comfort and quality should never be a luxury; they should be accessible to everyone.</em>
          </p>

          <p className="policy-p">
            From our humble beginnings in South Tamil Nadu, we have grown into an established apparel
            manufacturing company. With a growing network of showrooms and an expanding business presence,
            we are taking our products across India.
          </p>

          <p className="policy-p">
            At Faywalk, we believe that fashion is for everyone. Our mission is to make quality clothing
            accessible to people from every walk of life without compromising on comfort, durability or
            style. Whether it is everyday essentials or fashionable apparel, we strive to deliver products
            that make people feel comfortable and confident, because confidence starts from within.
          </p>

          <p className="policy-p">
            Our diverse product range includes formal shirts, casual shirts, formal trousers, T-shirts,
            trousers, vests and briefs. With capabilities in bulk manufacturing, customisation and
            institutional orders, we serve a wide range of business and consumer requirements.
          </p>

          <p className="policy-p">
            Backed by the strength of the <strong>Seyad Group</strong>, including{' '}
            <strong>Seyad Spinning Mills</strong> and <strong>Fathimuthu Amma Mills</strong>, we continue to
            strengthen our manufacturing capabilities and expand our horizons.
          </p>

          <div className="policy-contact-block about-vision-block">
            <h2 className="policy-h2">OUR VISION</h2>
            <p className="policy-p" style={{ marginBottom: 0 }}>
              To become a trusted global fashion brand that makes exceptional comfort, quality and style
              accessible to everyone. We envision a world where looking good and feeling comfortable are not
              privileges reserved for a few, but everyday experiences available to all.
            </p>
          </div>

          <div className="about-tagline-footer">
            <span>Faywalk – Fashion Tomorrow</span>
          </div>
        </div>
      </section>

      <Suspense fallback={<LoadingSkeleton height="300px" />}>
        <SiteFooter />
      </Suspense>
    </div>
  );
}

