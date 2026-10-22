import { supabase } from '../lib/supabase';
import { compressImage } from '../utils/imageCompression';

// const IMAGE_SIZES = {
//   card: { width: 400, height: 400 },
//   detail: { width: 800, height: 800 },
// };

export const productService = {
  /**
   * Retrieves all categories.
   * @returns {Promise<any[]>}
   */
  async getCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*, subcategories(*), products(count)')
        .order('sort_order', { ascending: true });
      if (!error && data) {
        return data.map(c => ({
          ...c,
          productCount: c.products?.[0]?.count ?? 0,
          subcategories: c.subcategories || []
        }));
      }
    } catch (e) {
      console.warn('Foreign key subcategories join fallback:', e);
    }

    const { data: cats, error: catErr } = await supabase
      .from('categories')
      .select('*, products(count)')
      .order('sort_order', { ascending: true });
    if (catErr) throw catErr;

    const { data: subs } = await supabase
      .from('subcategories')
      .select('*')
      .order('created_at', { ascending: false });

    const subsByParent = {};
    (subs || []).forEach(s => {
      if (s.parent_id) {
        if (!subsByParent[s.parent_id]) subsByParent[s.parent_id] = [];
        subsByParent[s.parent_id].push(s);
      }
    });

    return (cats || []).map(c => ({
      ...c,
      productCount: c.products?.[0]?.count ?? 0,
      subcategories: subsByParent[c.category_id] || subsByParent[c.id] || []
    }));
  },

  getResizedImageUrl(url, sizeKey = 'card', quality = 75) {
    if (!url || typeof url !== 'string') return url;
    let clean = url.replace('/storage/v1/render/image/public/', '/storage/v1/object/public/');
    if (clean.includes('?')) {
      clean = clean.split('?')[0];
    }
    return clean;
  },

  /**
   * Retrieves all products.
   * @returns {Promise<any[]>}
   */
  async getProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name), subcategories(name), product_variants(variant_id, price, compare_price, stock, sku, color, size, images)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  /**
   * Retrieves a single product by product_id with all details.
   * @param {string|number} productId
   * @returns {Promise<any>}
   */
  async getProductById(productId) {
    if (!productId) return null;
    const cleanId = String(productId).replace(/\/+$/, '').trim();

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name), subcategories(name), product_variants(variant_id, price, compare_price, stock, sku, color, size, images)')
        .eq('product_id', cleanId)
        .maybeSingle();

      if (!error && data) return data;
    } catch (e) {
      console.warn('getProductById lookup by product_id failed:', e);
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name), subcategories(name), product_variants(variant_id, price, compare_price, stock, sku, color, size, images)')
        .eq('id', cleanId)
        .maybeSingle();

      if (!error && data) return data;
    } catch (e) {
      console.warn('getProductById lookup by id fallback failed:', e);
    }

    return null;
  },

  /**
   * Deletes a product by product_id.
   * @param {string|number} productId 
   * @returns {Promise<void>}
   */
  async deleteProduct(productId) {
    const allUrls = await this.getProductImageUrls(productId).catch(() => []);

    try {
      await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', productId);
    } catch (e) {
      console.warn('Could not delete product variants prior to product:', e);
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('product_id', productId);
    if (error) throw error;

    await this.deleteR2Images(allUrls);
  },

  /**
   * Extracts clean R2 storage key (e.g. "products/variants/name-123.webp") from URL.
   * @param {string} url
   * @returns {string|null}
   */
  extractR2FilePath(url) {
    if (!url || typeof url !== 'string') return null;
    const r2Base = import.meta.env.VITE_R2_PUBLIC_URL;
    const match = url.match(/(?:banners|categories|products|subcategories)\/[^?#]+/);
    if (match) return decodeURIComponent(match[0]);
    if (r2Base && url.includes(r2Base)) {
      const rel = url.replace(`${r2Base}/`, '').split('?')[0].split('#')[0];
      return rel ? decodeURIComponent(rel) : null;
    }
    try {
      const parsed = new URL(url);
      const p = parsed.pathname.startsWith('/') ? parsed.pathname.slice(1) : parsed.pathname;
      return p ? decodeURIComponent(p.split('?')[0]) : null;
    } catch {
      return null;
    }
  },

  /**
   * Every image URL a product references (base images + all variant images).
   * @param {string|number} productId
   * @returns {Promise<string[]>}
   */
  async getProductImageUrls(productId) {
    if (!productId) return [];
    try {
      const { data: prod } = await supabase
        .from('products')
        .select('image_url, images')
        .eq('product_id', productId)
        .maybeSingle();

      const { data: vars } = await supabase
        .from('product_variants')
        .select('images')
        .eq('product_id', productId);

      const extractUrls = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) {
          return val.flatMap((item) => {
            if (!item) return [];
            if (typeof item === 'string') {
              if (item.startsWith('[') && item.endsWith(']')) {
                try {
                  return extractUrls(JSON.parse(item));
                } catch {}
              }
              return [item];
            }
            if (typeof item === 'object' && item.url) return [item.url];
            return [];
          });
        }
        if (typeof val === 'string') {
          if (val.startsWith('[') && val.endsWith(']')) {
            try {
              return extractUrls(JSON.parse(val));
            } catch {}
          }
          return [val];
        }
        return [];
      };

      const prodImageUrl = prod?.image_url ? [prod.image_url] : [];
      const prodImages = extractUrls(prod?.images);
      const varImages = (vars || []).flatMap((v) => extractUrls(v.images));

      return [...new Set([...prodImageUrl, ...prodImages, ...varImages])].filter(Boolean);
    } catch (err) {
      console.warn('getProductImageUrls failed:', err);
      return [];
    }
  },

  /**
   * Deletes image files from Cloudflare R2. Non-R2 URLs are skipped; failures are logged, not thrown.
   * @param {string[]} urls
   */
  async deleteR2Images(urls) {
    if (!urls || !urls.length) return;
    const r2FilePaths = [...new Set(urls.map((u) => this.extractR2FilePath(u)).filter(Boolean))];

    await Promise.all(
      r2FilePaths.map(async (filePath) => {
        try {
          await this.deleteSubcategoryImageR2(filePath);
        } catch (err) {
          console.warn(`Failed to delete image ${filePath} from R2:`, err);
        }
      })
    );
  },

  /**
   * After an edit: deletes from R2 the images the product used before (oldUrls) but no longer uses.
   * @param {string|number} productId
   * @param {string[]} oldUrls
   */
  async deleteRemovedProductImages(productId, oldUrls) {
    if (!oldUrls || !oldUrls.length) return;
    try {
      const currentUrls = await this.getProductImageUrls(productId);
      const currentKeys = new Set(
        currentUrls.map((u) => this.extractR2FilePath(u)).filter(Boolean)
      );

      const removedUrls = oldUrls.filter((url) => {
        const key = this.extractR2FilePath(url);
        return key && !currentKeys.has(key);
      });

      if (removedUrls.length > 0) {
        await this.deleteR2Images(removedUrls);
      }
    } catch (err) {
      console.warn('Failed to clean up removed product images:', err);
    }
  },

  /**
   * Deletes a category by category_id.
   * @param {string|number} categoryId 
   * @returns {Promise<void>}
   */
  async deleteCategory(categoryId) {
    const { data: subs, error: subError } = await supabase
      .from('subcategories')
      .select('subcategory_id')
      .eq('parent_id', categoryId);
    if (subError) throw subError;

    if (subs && subs.length) {
      const err = new Error('CATEGORY_HAS_SUBCATEGORIES');
      err.code = 'CATEGORY_HAS_SUBCATEGORIES';
      throw err;
    }

    const { data: existing } = await supabase
      .from('categories')
      .select('image_url')
      .eq('category_id', categoryId)
      .single();

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('category_id', categoryId);
    if (error) throw error;

    await this.deleteR2Images([existing?.image_url]);
  },

  /**
   * Helper to ensure Postgres text[] array columns (colors, sizes, images) are valid arrays.
   */
  formatProductPayload(productData) {
    if (!productData) return {};
    const payload = { ...productData };

    if (payload.colors !== undefined && payload.colors !== null) {
      if (typeof payload.colors === 'string') {
        payload.colors = payload.colors.split(',').map(c => c.trim()).filter(Boolean);
      } else if (!Array.isArray(payload.colors)) {
        payload.colors = [String(payload.colors)];
      }
      if (payload.colors.length === 0) payload.colors = null;
    }

    if (payload.sizes !== undefined && payload.sizes !== null) {
      if (typeof payload.sizes === 'string') {
        payload.sizes = payload.sizes.split(',').map(s => s.trim()).filter(Boolean);
      } else if (!Array.isArray(payload.sizes)) {
        payload.sizes = [String(payload.sizes)];
      }
      if (payload.sizes.length === 0) payload.sizes = null;
    }

    if (payload.images !== undefined && payload.images !== null) {
      if (!Array.isArray(payload.images)) {
        payload.images = [payload.images].filter(Boolean);
      }
    }

    return payload;
  },

  /**
   * Inserts a new product record.
   * @param {object} productData 
   * @returns {Promise<any>}
   */
  async insertProduct(productData) {
    const formatted = this.formatProductPayload(productData);
    const { data, error } = await supabase
      .from('products')
      .insert([formatted])
      .select();
    if (error) throw error;
    return data;
  },

  /**
   * Inserts a new category record.
   * @param {object} categoryData 
   * @returns {Promise<any>}
   */
  async insertCategory(categoryData) {
    const { data, error } = await supabase
      .from('categories')
      .insert([categoryData])
      .select();
    if (error) throw error;
    return data;
  },

  /**
   * Updates an existing category.
   * @param {string|number} categoryId 
   * @param {object} categoryData 
   * @returns {Promise<any>}
   */
  async updateCategory(categoryId, categoryData) {
    let existingImageUrl = null;
    try {
      const { data: existing } = await supabase
        .from('categories')
        .select('image_url')
        .eq('category_id', categoryId)
        .maybeSingle();
      existingImageUrl = existing?.image_url || null;
    } catch (e) {
      console.warn("Could not fetch existing category image:", e);
    }

    let { data, error } = await supabase
      .from('categories')
      .update(categoryData)
      .eq('category_id', categoryId)
      .select();

    if (error || !data || data.length === 0) {
      const res = await supabase
        .from('categories')
        .update(categoryData)
        .eq('id', categoryId)
        .select();
      if (!res.error && res.data && res.data.length > 0) {
        data = res.data;
        error = null;
      }
    }

    if (error) throw error;

    // Old image replaced or removed in this edit is deleted from R2
    const saved = data?.[0];
    const newImageUrl = saved ? saved.image_url : categoryData.image_url;
    if (existingImageUrl && existingImageUrl !== newImageUrl) {
      await this.deleteR2Images([existingImageUrl]);
    }
    return data;
  },

  /**
   * Updates an existing product.
   * @param {string|number} productId 
   * @param {object} productData 
   * @returns {Promise<any>}
   */
  async updateProduct(productId, productData) {
    const formatted = this.formatProductPayload(productData);
    const oldImageUrls = await this.getProductImageUrls(productId).catch(() => []);
    const { data, error } = await supabase
      .from('products')
      // Bump updated_at so storefront image caches know to refresh
      .update({ ...formatted, updated_at: new Date().toISOString() })
      .eq('product_id', productId)
      .select();
    if (error) throw error;

    // Images replaced or removed in this edit are deleted from R2
    await this.deleteRemovedProductImages(productId, oldImageUrls);
    return data;
  },

  /**
   * Uploads an image file to the product-images storage bucket.
   * @param {string} filePath 
   * @param {File} file 
   * @returns {Promise<any>}
   */
  async uploadProductImage(filePath, file, cacheControl = '31536000') {
    const compressedFile = await compressImage(file, 'detail');

    const formData = new FormData();
    formData.append('file', compressedFile);
    formData.append('filePath', filePath);
    formData.append('cacheControl', cacheControl);

    const { data, error } = await supabase.functions.invoke('upload-image', {
      body: formData,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Resolves the public URL for a product image.
   * @param {string} filePath 
   * @returns {string}
   */
  getProductImagePublicUrl(filePath) {
    return `${import.meta.env.VITE_R2_PUBLIC_URL}/${filePath}`;
  },

  /**
   * Uploads an image file to the category-images storage bucket.
   * @param {string} filePath 
   * @param {File} file 
   * @returns {Promise<any>}
   */
  async uploadCategoryImage(filePath, file, cacheControl = '31536000') {
    const compressedFile = await compressImage(file, 'card');

    const formData = new FormData();
    formData.append('file', compressedFile);
    formData.append('filePath', filePath);
    formData.append('cacheControl', cacheControl);

    const { data, error } = await supabase.functions.invoke('upload-image', {
      body: formData,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Resolves the public URL for a category image.
   * @param {string} filePath 
   * @returns {string}
   */
  getCategoryImagePublicUrl(filePath) {
    return `${import.meta.env.VITE_R2_PUBLIC_URL}/${filePath}`;
  },

  /**
   * Retrieves active products for a specific category name.
   * @param {string} categoryName
   * @returns {Promise<any[]>}
   */
  async getProductsByCategoryName(categoryName) {
    const isAll = !categoryName ||
      categoryName.toLowerCase() === 'all' ||
      categoryName.toLowerCase() === 'all products' ||
      categoryName.toLowerCase() === 'all-products' ||
      categoryName.toLowerCase() === 'trending' ||
      categoryName.toLowerCase() === 'trending now';

    let catData = null;
    if (!isAll) {
      const { data, error: catError } = await supabase
        .from('categories')
        .select('category_id')
        .ilike('name', categoryName)
        .eq('is_active', true)
        .maybeSingle();

      if (catError) throw catError;
      if (!data) return [];
      catData = data;
    }

    let queryData = null;
    try {
      let query = supabase
        .from('products')
        .select('product_id, name, description, price, compare_price, stock, image_url, images, sizes, colors, material, category_id, categories(name), has_variants, subcategory_id, subcategories(name), product_variants(variant_id, price, compare_price, stock, images, color, size)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (catData) {
        query = query.eq('category_id', catData.category_id);
      }

      const { data, error } = await query;
      if (!error && data) {
        queryData = data.map(p => ({
          ...p,
          category: p.categories?.name || p.category || (catData ? categoryName : null),
          subcategory: p.subcategories?.name || p.subcategory || null,
          material: p.material || p.fabric || '',
          fabric: p.material || p.fabric || ''
        }));
      }
    } catch (e) {
      console.warn('Subcategories join fallback in getProductsByCategoryName:', e);
    }

    if (!queryData) {
      let query = supabase
        .from('products')
        .select('product_id, name, description, price, compare_price, stock, image_url, images, sizes, colors, material, category_id, categories(name), has_variants, subcategory_id, subcategories(name), product_variants(variant_id, price, compare_price, stock, images, color, size)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (catData) {
        query = query.eq('category_id', catData.category_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const subIds = (data || []).map(p => p.subcategory_id).filter(Boolean);
      let subMap = {};
      if (subIds.length > 0) {
        const { data: subRows } = await supabase
          .from('subcategories')
          .select('subcategory_id, name')
          .in('subcategory_id', subIds);

        (subRows || []).forEach(s => {
          subMap[s.subcategory_id] = s.name;
        });
      }

      queryData = (data || []).map(p => ({
        ...p,
        category: p.categories?.name || p.category || (catData ? categoryName : null),
        subcategory: subMap[p.subcategory_id] || p.subcategory || null,
        material: p.material || p.fabric || '',
        fabric: p.material || p.fabric || ''
      }));
    }

    return queryData;
  },

  /**
   * Retrieves specific products by their IDs (lean columns only).
   * @param {Array<string|number>} productIds
   * @returns {Promise<any[]>}
   */

  async getProductsByIds(productIds) {
    if (!productIds || productIds.length === 0) return [];
    const { data, error } = await supabase
      .from('products')
      .select('product_id, name, price, compare_price, image_url, images, stock, sizes')
      .in('product_id', productIds);
    if (error) throw error;
    return data || [];
  },

  /**
   * Searches active products by name.
   * @param {string} query
   * @param {number} limit
   * @returns {Promise<any[]>}
   */
  async searchProductsByName(query, limit = 5) {
    const normalizedQuery = String(query || '').trim();
    if (!normalizedQuery) return [];

    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('is_active', true)
      .ilike('name', `%${normalizedQuery}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async uploadSubcategoryImage(filePath, file, cacheControl = '31536000') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filePath', filePath);
    formData.append('cacheControl', cacheControl);

    const { data, error } = await supabase.functions.invoke('upload-image', {
      body: formData,
    });
    if (error) throw error;
    return data;
  },

  async deleteSubcategoryImageR2(filePath) {
    const { data, error } = await supabase.functions.invoke('upload-image', {
      method: 'DELETE',
      body: { filePath },
    });
    if (error) throw error;
    return data
  },

  getSubcategoryImagePublicUrl(filePath) {
    return `${import.meta.env.VITE_R2_PUBLIC_URL}/${filePath}`;
  },

  /**
  * Retrieves subcategories.
  * @param {number|null} parentId
  * @returns {Promise<any[]>}
  */
  async getSubCategories(parentId = null) {
    let query = supabase
      .from("subcategories")
      .select("subcategory_id, name, image_url, parent_id, is_active")
      .order("created_at", { ascending: false });

    if (parentId !== null && parentId !== undefined) {
      query = query.eq("parent_id", parentId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Creates a subcategory.
   * @param {object} payload
   * @returns {Promise<any>}
   */
  async createSubcategory(payload) {
    const { data, error } = await supabase
      .from("subcategories")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Updates a subcategory.
   * @param {string} id
   * @param {object} payload
   * @returns {Promise<any>}
   */
  async updateSubcategory(id, payload) {
    let existingImageUrl = null;
    try {
      const { data: existing } = await supabase
        .from("subcategories")
        .select("image_url")
        .eq("subcategory_id", id)
        .maybeSingle();
      existingImageUrl = existing?.image_url || null;
    } catch (e) {
      console.warn("Could not fetch existing subcategory image:", e);
    }

    const { data, error } = await supabase
      .from("subcategories")
      .update(payload)
      .eq("subcategory_id", id)
      .select()
      .single();

    if (error) throw error;

    // Old image replaced or removed in this edit is deleted from R2
    if (data && existingImageUrl && existingImageUrl !== data.image_url) {
      await this.deleteR2Images([existingImageUrl]);
    }
    return data;
  },

  /**
   * Deletes a subcategory.
   * @param {string|number} id
   * @returns {Promise<void>}
   */
  async deleteSubcategory(id) {
    if (!id) return;
    let existingImageUrl = null;
    try {
      const { data: existing } = await supabase
        .from("subcategories")
        .select("image_url")
        .eq("subcategory_id", id)
        .maybeSingle();
      existingImageUrl = existing?.image_url || null;
    } catch (e) {
      console.warn("Could not fetch existing subcategory image prior to delete:", e);
    }

    const { error } = await supabase
      .from("subcategories")
      .delete()
      .eq("subcategory_id", id);

    if (error) throw error;

    if (existingImageUrl) {
      try {
        await this.deleteR2Images([existingImageUrl]);
      } catch (e) {
        console.warn("Failed to delete subcategory image from R2:", e);
      }
    }
  },
};
