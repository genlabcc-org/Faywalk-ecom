import React, { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import SiteHeader from '../components/SiteHeader';
import Hero from '../components/Hero';
import SEO from '../components/SEO';
import './HomePage.css';
import { useStore } from '../hooks/useStore';
import { getNavPath } from "../services/categoryRoute";


const CategorySection = lazy(() => import('../components/CategorySection'));
const NewArrivals = lazy(() => import('../components/NewArrivals'));
const BestSellers = lazy(() => import('../components/BestSellers'));
const CustomerExperiences = lazy(() => import('../components/CustomerExperiences'));
const SiteFooter = lazy(() => import('../components/SiteFooter'));

const SectionLoader = () => (
  <div style={{ height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  </div>
);

export default function HomePage() {
  const navigate = useNavigate();
  const categories = useStore(state => state.categories);
  const setSelectedProduct = useStore(state => state.setSelectedProduct);

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    const pid = product?.product_id || product?.productId || product?.id;
    navigate(pid ? `/product/${pid}` : '/product');
  };

  const handleCategoryClick = (name, subName) => {
    navigate(getNavPath(name, categories, subName));
  };

  const handleNavClick = (link, subName) => {
    if (link === 'Home') {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate(getNavPath(link, categories, subName));
    }
  };

  return (
    <div className="homepage">
      <SEO
        title="FAYWALK | Premium Innerwear & Comfortable Clothing"
        description="Discover premium innerwear and everyday comfortable clothing for Men and Women at FAYWALK. High-quality cotton trunks, briefs, vests, camisoles and loungewear crafted for superior fit and lasting comfort."
        canonical="https://www.faywalk.com"
        keywords={[
          'FAYWALK',
          'premium innerwear',
          'men innerwear',
          'women innerwear',
          'cotton trunks',
          'briefs',
          'boxer briefs',
          'vests',
          'camisoles',
          'loungewear',
          'comfortable innerwear India'
        ]}
      />
      <TopBar />
      <SiteHeader activeLink="Home" onLinkClick={handleNavClick} />
      <Hero />

      <Suspense fallback={<SectionLoader />}>
        <div id="categories">
          <CategorySection onCategoryClick={handleCategoryClick} />
        </div>
        <div id="new-arrivals">
          <NewArrivals onProductClick={handleProductClick} />
        </div>
        <div id="best-sellers">
          <BestSellers onProductClick={handleProductClick} />
        </div>
        {/* <CollectionsSection /> */}
        <div id="reviews"><CustomerExperiences /></div>
        <SiteFooter />
      </Suspense>
    </div>
  );
}
