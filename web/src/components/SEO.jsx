import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const DEFAULT_SITE_TITLE = 'FAYWALK | Premium Innerwear & Clothing';
const DEFAULT_TITLE = 'FAYWALK | Premium Innerwear & Comfortable Clothing';
const DEFAULT_DESCRIPTION = 'Discover premium innerwear and everyday comfortable clothing for Men and Women at FAYWALK. Crafted with breathable fabrics for ultimate fit, comfort, and longevity.';
const DEFAULT_KEYWORDS = 'FAYWALK, innerwear, premium innerwear, men innerwear, women innerwear, cotton trunks, briefs, boxer briefs, vests, camisoles, loungewear, comfortable clothing India';
const SITE_URL = 'https://www.faywalk.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.png`;

/**
 * Universal SEO component for managing metadata, OpenGraph, Twitter Cards,
 * canonical links, robots, and JSON-LD structured data.
 */
export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  canonical,
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  ogImageAlt = 'FAYWALK Premium Innerwear',
  robots = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  productData,
  breadcrumbs,
  schema,
}) {
  const location = useLocation();

  useEffect(() => {
    // 1. Update Title
    const formattedTitle = title
      ? (title.includes('FAYWALK') ? title : `${title} | FAYWALK`)
      : DEFAULT_TITLE;
    document.title = formattedTitle;

    // Helper to safely set or create a <meta> tag
    const setMetaTag = (attribute, key, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attribute}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attribute, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // 2. Primary Meta Tags
    setMetaTag('name', 'description', description);
    if (keywords) {
      const kwString = Array.isArray(keywords) ? keywords.join(', ') : keywords;
      setMetaTag('name', 'keywords', kwString);
    }
    setMetaTag('name', 'robots', robots);

    // 3. Canonical Link
    const currentCanonical = canonical || `${SITE_URL}${location.pathname === '/' ? '' : location.pathname}`;
    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', currentCanonical);

    // 4. OpenGraph Meta Tags
    const resolvedImage = ogImage.startsWith('http')
      ? ogImage
      : `${SITE_URL}${ogImage.startsWith('/') ? '' : '/'}${ogImage}`;

    setMetaTag('property', 'og:site_name', 'FAYWALK');
    setMetaTag('property', 'og:locale', 'en_IN');
    setMetaTag('property', 'og:title', formattedTitle);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', currentCanonical);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:image', resolvedImage);
    setMetaTag('property', 'og:image:secure_url', resolvedImage);
    if (ogImageAlt) {
      setMetaTag('property', 'og:image:alt', ogImageAlt);
    }

    // Product-specific OpenGraph tags
    if (ogType === 'product' && productData) {
      if (productData.price) {
        setMetaTag('property', 'product:price:amount', String(productData.price));
        setMetaTag('property', 'product:price:currency', productData.currency || 'INR');
      }
      if (productData.availability) {
        setMetaTag('property', 'product:availability', productData.availability);
      }
      if (productData.brand) {
        setMetaTag('property', 'product:brand', productData.brand);
      }
    }

    // 5. Twitter Card Meta Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', formattedTitle);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', resolvedImage);
    if (ogImageAlt) {
      setMetaTag('name', 'twitter:image:alt', ogImageAlt);
    }

    // 6. Structured Data (JSON-LD)
    const jsonLdElements = [];

    // Optional Page/Custom Schema
    const schemasToInject = [];

    if (schema) {
      if (Array.isArray(schema)) {
        schemasToInject.push(...schema);
      } else {
        schemasToInject.push(schema);
      }
    }

    // BreadcrumbList Schema
    if (breadcrumbs && breadcrumbs.length > 0) {
      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: crumb.path.startsWith('http') ? crumb.path : `${SITE_URL}${crumb.path}`,
        })),
      };
      schemasToInject.push(breadcrumbSchema);
    }

    // Product Schema
    if (productData) {
      const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: productData.name || formattedTitle,
        image: Array.isArray(productData.images)
          ? productData.images
          : [resolvedImage],
        description: productData.description || description,
        brand: {
          '@type': 'Brand',
          name: productData.brand || 'FAYWALK',
        },
        sku: productData.sku || String(productData.id || ''),
        offers: {
          '@type': 'Offer',
          url: currentCanonical,
          priceCurrency: productData.currency || 'INR',
          price: productData.price || '0',
          itemCondition: 'https://schema.org/NewCondition',
          availability: productData.inStock === false
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
          seller: {
            '@type': 'Organization',
            name: 'FAYWALK',
          },
        },
      };

      if (productData.ratingValue && productData.reviewCount) {
        productSchema.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: String(productData.ratingValue),
          reviewCount: String(productData.reviewCount),
        };
      }

      schemasToInject.push(productSchema);
    }

    // Manage JSON-LD script tags in document head
    let scriptTag = document.getElementById('dynamic-json-ld');
    if (schemasToInject.length > 0) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'dynamic-json-ld';
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(
        schemasToInject.length === 1 ? schemasToInject[0] : schemasToInject
      );
    } else if (scriptTag) {
      scriptTag.remove();
    }

    return () => {
      // Clean up dynamic script tag on unmount
      const existingScript = document.getElementById('dynamic-json-ld');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [
    title,
    description,
    keywords,
    canonical,
    ogType,
    ogImage,
    ogImageAlt,
    robots,
    productData,
    breadcrumbs,
    schema,
    location.pathname,
  ]);

  return null;
}

