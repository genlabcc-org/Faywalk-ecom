import React from 'react';
import './Skeleton.css';

export function Skeleton({ className = '', style = {}, width, height, borderRadius, circle = false, pill = false }) {
  const customStyle = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...(borderRadius ? { borderRadius } : {}),
    ...style,
  };

  const classNames = [
    'skeleton',
    circle ? 'skeleton-rounded' : '',
    pill ? 'skeleton-pill' : '',
    className,
  ].filter(Boolean).join(' ');

  return <div className={classNames} style={customStyle} />;
}

export function SkeletonProductCard() {
  return (
    <div className="skeleton-product-card">
      <div className="skeleton-image-box">
        <Skeleton width="100%" height="100%" borderRadius="4px" />
        <div className="skeleton-cart-pill">
          <Skeleton width="92px" height="28px" borderRadius="6px" />
        </div>
      </div>
      <div className="skeleton-details-box">
        <Skeleton height="16px" width="78%" borderRadius="4px" />
        <Skeleton height="16px" width="36%" borderRadius="4px" />
      </div>
    </div>
  );
}

export function SkeletonProductGrid({ count = 8 }) {
  return (
    <div className="skeleton-product-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonProductCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonBanner() {
  return <Skeleton className="skeleton-hero" />;
}

export function SkeletonHero() {
  return (
    <section className="hero-section hero-section--loading" aria-busy="true" aria-label="Loading hero banner">
      <div className="hero-skeleton-wrapper">
        <Skeleton className="hero-skeleton" />
      </div>
    </section>
  );
}

export function SkeletonCategories({ count = 4 }) {
  return (
    <div className="skeleton-category-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-category-card">
          <Skeleton height="360px" width="100%" borderRadius="0px" />
          <Skeleton height="20px" width="55%" borderRadius="4px" style={{ margin: '14px auto 0' }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="skeleton-table-wrapper">
      <div className="skeleton-table-row" style={{ borderBottom: '2px solid #e0e0e0' }}>
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} height="20px" width={`${80 / cols}%`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="skeleton-table-row">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height="16px" width={`${75 / cols}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height="16px" width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}

export function SkeletonDetails() {
  return (
    <div className="skeleton-details-layout">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Skeleton height="400px" width="100%" borderRadius="12px" />
        <div style={{ display: 'flex', gap: '12px' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height="80px" width="80px" borderRadius="8px" />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Skeleton height="32px" width="70%" />
        <Skeleton height="28px" width="30%" />
        <SkeletonText lines={4} />
        <Skeleton height="48px" width="100%" borderRadius="24px" />
      </div>
    </div>
  );
}

export default Skeleton;
