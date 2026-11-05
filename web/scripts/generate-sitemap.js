import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables from web/.env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const DOMAIN = 'https://www.faywalk.com';

const staticRoutes = [
  { url: '/', changefreq: 'daily', priority: '1.0' },
  { url: '/all-products', changefreq: 'daily', priority: '0.9' },
  { url: '/products', changefreq: 'daily', priority: '0.9' },
  { url: '/contact', changefreq: 'monthly', priority: '0.7' },
  { url: '/terms', changefreq: 'monthly', priority: '0.5' },
  { url: '/privacy', changefreq: 'monthly', priority: '0.5' },
];

async function generateSitemap() {
  console.log('Generating sitemap for FAYWALK...');
  const urls = [...staticRoutes];

  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

      // Fetch active categories
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('name, slug')
        .eq('is_active', true);

      if (!catError && categories) {
        categories.forEach((cat) => {
          const slug = cat.slug || cat.name?.toLowerCase().trim().replace(/\s+/g, '-');
          if (slug) {
            urls.push({
              url: `/category/${slug}`,
              changefreq: 'weekly',
              priority: '0.8',
            });
          }
        });
      }

      // Fetch active products
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('product_id, name, updated_at, image_url, images')
        .eq('is_active', true);

      if (!prodError && products) {
        products.forEach((prod) => {
          const id = prod.product_id || prod.id;
          if (id) {
            const img = prod.image_url || prod.images?.[0];
            urls.push({
              url: `/product/${id}`,
              lastmod: prod.updated_at ? new Date(prod.updated_at).toISOString().split('T')[0] : undefined,
              changefreq: 'weekly',
              priority: '0.8',
              image: img,
              imageTitle: prod.name,
            });
          }
        });
      }
    } catch (err) {
      console.warn('Could not fetch dynamic items from Supabase, writing static sitemap:', err.message);
    }
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls
  .map((entry) => {
    return `  <url>
    <loc>${DOMAIN}${entry.url}</loc>
    ${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''}
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
    ${
      entry.image
        ? `<image:image>
      <image:loc>${entry.image.startsWith('http') ? entry.image : `${DOMAIN}${entry.image}`}</image:loc>
      ${entry.imageTitle ? `<image:title><![CDATA[${entry.imageTitle}]]></image:title>` : ''}
    </image:image>`
        : ''
    }
  </url>`;
  })
  .join('\n')}
</urlset>`;

  const publicSitemapPath = path.resolve(__dirname, '../public/sitemap.xml');
  fs.writeFileSync(publicSitemapPath, sitemapXml.trim() + '\n', 'utf-8');
  console.log(`Successfully generated sitemap with ${urls.length} URLs at ${publicSitemapPath}`);
}

generateSitemap();

