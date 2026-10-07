import React, { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import SiteHeader from '../components/SiteHeader';
import Hero from '../components/Hero';
import './HomePage.css';
import { useStore } from '../hooks/useStore';
import { getNavPath } from "../services/categoryRoute";

const BannerSection = lazy(() => import('../components/BannerSection'));
const CategorySection = lazy(() => import('../components/CategorySection'));
const NewArrivals = lazy(() => import('../components/NewArrivals'));
const BestSellers = lazy(() => import('../components/BestSellers'));
const CollectionsSection = lazy(() => import('../components/CollectionsSection'));
const RealExperience = lazy(() => import('../components/RealExperience'));
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
    navigate('/product');
  };

  const handleCategoryClick = (name) => {
    navigate(getNavPath(name, categories));
  };

  const handleNavClick = (link) => {
    if (link === 'Home') {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate(getNavPath(link, categories));
    }
  };

  return (
    <div className="homepage">
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
        {/* <BannerSection /> */}
        {/* <CollectionsSection /> */}
        <RealExperience />
        <div id="reviews"><CustomerExperiences /></div>
        <SiteFooter />
      </Suspense>
    </div>
  );
}
