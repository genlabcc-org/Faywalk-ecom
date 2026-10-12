import React, { lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import SiteHeader from '../components/SiteHeader';
import './NotFoundPage.css';

const SiteFooter = lazy(() => import('../components/SiteFooter'));

export default function NotFoundPage() {
  const navigate = useNavigate();

  const handleHeaderLinkClick = (link) => {
    if (link === 'Home') {
      navigate('/');
    } else {
      navigate(`/${link.toLowerCase()}`);
    }
  };

  return (
    <div className="not-found-page">
      <TopBar />
      <SiteHeader activeLink="" onLinkClick={handleHeaderLinkClick} />

      <main className="not-found-main" role="main">
        <div className="not-found-card">
          <h1 className="not-found-code">404</h1>
          <h2 className="not-found-title">Page Not Found</h2>
          <p className="not-found-desc">
            The page you are looking for doesn’t exist or has been moved.
          </p>

          <div className="not-found-actions">
            <Link to="/" className="not-found-btn">
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>

      <Suspense fallback={null}>
        <SiteFooter />
      </Suspense>
    </div>
  );
}
