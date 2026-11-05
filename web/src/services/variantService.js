import { supabase } from '../lib/supabase';
import { compressImage } from '../utils/imageCompression';
import { productService } from './productService';

// ── SKU generation ──────────────────────────────────────────
const generateBaseSku = (productName) => {
  const words = productName?.trim().split(/\s+/).filter(Boolean) || [];
  if (words.length === 0) return `FAY-${Math.floor(100000 + Math.random() * 900000)}`;

  const initials = words
    .slice(0, -1)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  const lastWordPart = words[words.length - 1].slice(0, 3).toUpperCase();
  const slug = (initials + lastWordPart).slice(0, 6) || `${Math.floor(1000 + Math.random() * 9000)}`;

  return `FAY-${slug}`;
};

const generateVariantSku = (baseSku, index) => `${baseSku}-V${index + 1}`;

const makeUniqueSku = (desiredSku, baseSku, index, usedSkus) => {
  let candidate = (desiredSku || '').trim() || generateVariantSku(baseSku, index);
  if (!usedSkus.has(candidate.toLowerCase())) {
    usedSkus.add(candidate.toLowerCase());
    return candidate;
  }
  let suffix = 2;
  while (usedSkus.has(`${candidate}-${suffix}`.toLowerCase())) {
    suffix++;
  }
  const unique = `${candidate}-${suffix}`;
  usedSkus.add(unique.toLowerCase());
  return unique;
};

export const variantService = {
  /**
   * Creates a base product plus all its variants in one flow.
   */
  async createProductWithVariants(productData, variants) {
    const validPrices = (variants || []).map(v => parseFloat(v.sellingPrice ?? v.price)).filter(n => !isNaN(n) && n >= 0);
    const validComparePrices = (variants || []).map(v => parseFloat(v.price ?? v.compare_price)).filter(n => !isNaN(n) && n >= 0);
    const fallbackPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
    const fallbackComparePrice = validComparePrices.length > 0 ? Math.max(...validComparePrices) : null;
    const totalStock = (variants || []).reduce((sum, v) => sum + (parseInt(v.stockQuantity ?? v.stock) || 0), 0);

    const baseSku = productData.sku?.trim() || generateBaseSku(productData.name);

    // 1. Upload all variant images FIRST before creating any database rows
    // so failed/interrupted uploads never leave ghost products in the DB.
    const preparedVariants = [];
    const usedSkus = new Set();
    const seenSizeColor = new Set();
    const colorUploadCache = new Map();

    for (let i = 0; i < (variants || []).length; i++) {
      const v = variants[i];
      const sizeKey = (v.sizeDimension || '').trim().toLowerCase();
      const colorKey = (v.color || '').trim().toLowerCase();
      const comboKey = `${sizeKey}::${colorKey}`;
      if (seenSizeColor.has(comboKey)) continue;
      seenSizeColor.add(comboKey);

      let uploadedUrls = [];
      const cacheKey = v.color ? v.color.toLowerCase() : null;
      if (cacheKey && colorUploadCache.has(cacheKey)) {
        uploadedUrls = colorUploadCache.get(cacheKey);
      } else if (v.media?.length) {
        uploadedUrls = await this._uploadVariantImages(v.media, productData.name);
        if (cacheKey) colorUploadCache.set(cacheKey, uploadedUrls);
      }
      const imageUrls = [...(v.images || []), ...uploadedUrls];

      preparedVariants.push({
        sku: makeUniqueSku(v.sku, baseSku, i, usedSkus),
        size: v.sizeDimension || null,
        color: v.color || null,
        price: parseFloat(v.sellingPrice) || 0,
        compare_price: parseFloat(v.price) || null,
        stock: parseInt(v.stockQuantity) || 0,
        stock_alert: parseInt(v.minStockAlert) || null,
        images: imageUrls,
        is_active: true,
      });
    }

    // Clean up any prior orphan products with the same SKU that have 0 variants (from earlier failed saves)
    if (baseSku) {
      try {
        const { data: sameSkuProducts } = await supabase
          .from('products')
          .select('product_id, product_variants(variant_id)')
          .eq('sku', baseSku);
        const orphanIds = (sameSkuProducts || [])
          .filter(p => !p.product_variants || p.product_variants.length === 0)
          .map(p => p.product_id);
        if (orphanIds.length > 0) {
          await supabase.from('products').delete().in('product_id', orphanIds);
        }
      } catch (e) {
        console.warn('Could not clean up orphan products:', e);
      }
    }

    const firstWithImages = preparedVariants.find(v => v.images?.length > 0);
    const coverImages = firstWithImages ? firstWithImages.images : (productData.images || []);
    const coverImageUrl = coverImages[0] || productData.image_url || null;

    const cleanDescription = String(productData.description || '').split('\n<!--CARE_INSTRUCTIONS-->\n')[0];
    const cleanCare = String(productData.care_instructions || '').trim() || null;

    const payload = {
      ...productData,
      description: cleanDescription,
      care_instructions: cleanCare,
      sku: baseSku,
      price: productData.price != null && !isNaN(parseFloat(productData.price)) ? parseFloat(productData.price) : fallbackPrice,
      compare_price: productData.compare_price != null && !isNaN(parseFloat(productData.compare_price)) ? parseFloat(productData.compare_price) : fallbackComparePrice,
      stock: productData.stock != null && !isNaN(parseInt(productData.stock)) ? parseInt(productData.stock) : totalStock,
      images: coverImages,
      image_url: coverImageUrl,
      has_variants: true,
    };

    let { data: product, error: productError } = await supabase
      .from('products')
      .insert([payload])
      .select()
      .single();

    if (productError) throw productError;
    product = productService.normalizeProductCare(product);

    try {
      const variantRows = preparedVariants.map((row) => ({
        ...row,
        product_id: product.product_id,
      }));

      let { data: insertedVariants, error: variantError } = await supabase
        .from('product_variants')
        .insert(variantRows)
        .select();

      // If a 409 / unique SKU collision happens with another product's SKU, suffix SKUs and retry once
      if (variantError && (variantError.code === '23505' || String(variantError.message || '').includes('sku'))) {
        const retryRows = variantRows.map((r) => ({
          ...r,
          sku: `${r.sku}-${Math.floor(100 + Math.random() * 900)}`,
        }));
        const retryRes = await supabase
          .from('product_variants')
          .insert(retryRows)
          .select();
        insertedVariants = retryRes.data;
        variantError = retryRes.error;
      }

      if (variantError) {
        throw variantError;
      }

      return { product, variants: insertedVariants };
    } catch (err) {
      await supabase.from('products').delete().eq('product_id', product.product_id);
      throw err;
    }
  },

  /**
   * Fetches a product plus its variants — for the edit form.
   */
  async getProductWithVariants(productId) {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('product_id', productId)
      .single();
    if (productError) throw productError;

    const variants = await this.getVariantsByProductId(productId);
    return { product: productService.normalizeProductCare(product), variants };
  },

  /**
   * Updates an existing product plus its variants (create/update/delete in one call).
   */
  async updateProductWithVariants(productId, productData, variants, deletedVariantIds = []) {
    const oldImageUrls = await productService.getProductImageUrls(productId).catch(() => []);

    const validPrices = (variants || []).map(v => parseFloat(v.sellingPrice ?? v.price)).filter(n => !isNaN(n) && n >= 0);
    const validComparePrices = (variants || []).map(v => parseFloat(v.price ?? v.compare_price)).filter(n => !isNaN(n) && n >= 0);
    const fallbackPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
    const fallbackComparePrice = validComparePrices.length > 0 ? Math.max(...validComparePrices) : null;
    const totalStock = (variants || []).reduce((sum, v) => sum + (parseInt(v.stockQuantity ?? v.stock) || 0), 0);

    const cleanDescription = String(productData.description || '').split('\n<!--CARE_INSTRUCTIONS-->\n')[0];
    const cleanCare = String(productData.care_instructions || '').trim() || null;

    const updatePayload = {
      ...productData,
      description: cleanDescription,
      care_instructions: cleanCare,
      price: productData.price != null && !isNaN(parseFloat(productData.price)) ? parseFloat(productData.price) : fallbackPrice,
      compare_price: productData.compare_price != null && !isNaN(parseFloat(productData.compare_price)) ? parseFloat(productData.compare_price) : fallbackComparePrice,
      stock: productData.stock != null && !isNaN(parseInt(productData.stock)) ? parseInt(productData.stock) : totalStock,
      updated_at: new Date().toISOString(),
    };

    let { data: product, error: productError } = await supabase
      .from('products')
      // Bump updated_at so storefront image caches know to refresh
      .update(updatePayload)
      .eq('product_id', productId)
      .select()
      .single();

    if (productError) throw productError;
    product = productService.normalizeProductCare(product);

    const { data: existingDbVariants } = await supabase
      .from('product_variants')
      .select('variant_id, size, color, sku')
      .eq('product_id', productId);

    const dbVarList = existingDbVariants || [];
    const dbById = new Map(dbVarList.map((row) => [String(row.variant_id), row]));
    const dbBySizeColor = new Map(
      dbVarList.map((row) => [
        `${(row.size || '').trim().toLowerCase()}::${(row.color || '').trim().toLowerCase()}`,
        row,
      ])
    );

    const baseSku = product.sku?.trim() || generateBaseSku(product.name);
    const existingVariantUpdates = [];
    const newVariantRows = [];
    const keptVariantIds = new Set();
    const usedSkus = new Set();
    const seenSizeColor = new Set();
    const colorUploadCache = new Map();

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const sizeKey = (v.sizeDimension || '').trim().toLowerCase();
      const colorKey = (v.color || '').trim().toLowerCase();
      const comboKey = `${sizeKey}::${colorKey}`;
      if (seenSizeColor.has(comboKey)) continue;
      seenSizeColor.add(comboKey);

      let uploadedUrls = [];
      const cacheKey = v.color ? v.color.toLowerCase() : null;
      if (cacheKey && colorUploadCache.has(cacheKey)) {
        uploadedUrls = colorUploadCache.get(cacheKey);
      } else if (v.media?.length) {
        uploadedUrls = await this._uploadVariantImages(v.media, product.name);
        if (cacheKey) colorUploadCache.set(cacheKey, uploadedUrls);
      }
      const imageUrls = [...(v.images || []), ...uploadedUrls];

      // Match existing DB row by variant_id or by (size, color) to avoid 409 conflicts
      let matchedVariantId = v.variant_id && dbById.has(String(v.variant_id)) ? v.variant_id : null;
      if (!matchedVariantId) {
        const comboMatch = dbBySizeColor.get(comboKey);
        if (comboMatch && !keptVariantIds.has(String(comboMatch.variant_id))) {
          matchedVariantId = comboMatch.variant_id;
        }
      }

      const rowData = {
        sku: makeUniqueSku(v.sku, baseSku, i, usedSkus),
        size: v.sizeDimension || null,
        color: v.color || null,
        price: parseFloat(v.sellingPrice) || 0,
        compare_price: parseFloat(v.price) || null,
        stock: parseInt(v.stockQuantity) || 0,
        stock_alert: parseInt(v.minStockAlert) || null,
        images: imageUrls,
        is_active: true,
      };

      if (matchedVariantId) {
        keptVariantIds.add(String(matchedVariantId));
        existingVariantUpdates.push({ variant_id: matchedVariantId, data: rowData });
      } else {
        newVariantRows.push({
          product_id: productId,
          ...rowData,
        });
      }
    }

    // Delete any DB variants for this product that are no longer present (plus explicit deletedVariantIds)
    const staleDbIds = dbVarList
      .map((r) => r.variant_id)
      .filter((id) => !keptVariantIds.has(String(id)));
    const allIdsToDelete = [...new Set([...deletedVariantIds, ...staleDbIds])].filter(Boolean);

    if (allIdsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('product_variants')
        .delete()
        .in('variant_id', allIdsToDelete);
      if (deleteError) throw deleteError;
    }

    const savedVariants = [];

    // 1. Update existing variants individually (avoids non-DEFAULT identity INSERT error)
    if (existingVariantUpdates.length > 0) {
      const updatedResults = await Promise.all(
        existingVariantUpdates.map(async ({ variant_id, data }) => {
          const { data: updated, error } = await supabase
            .from('product_variants')
            .update(data)
            .eq('variant_id', variant_id)
            .select()
            .single();
          if (error) throw error;
          return updated;
        })
      );
      savedVariants.push(...updatedResults);
    }

    // 2. Insert newly added variants (omit variant_id so DB automatically generates it)
    if (newVariantRows.length > 0) {
      let { data: inserted, error: insertError } = await supabase
        .from('product_variants')
        .insert(newVariantRows)
        .select();

      // If a 409 / unique SKU collision happens with another product's SKU, suffix SKUs and retry once
      if (insertError && (insertError.code === '23505' || String(insertError.message || '').includes('sku'))) {
        const retryRows = newVariantRows.map((r) => ({
          ...r,
          sku: `${r.sku}-${Math.floor(100 + Math.random() * 900)}`,
        }));
        const retryRes = await supabase
          .from('product_variants')
          .insert(retryRows)
          .select();
        inserted = retryRes.data;
        insertError = retryRes.error;
      }

      if (insertError) throw insertError;
      if (inserted) savedVariants.push(...inserted);
    }

    // ── Keep base product images in sync on edit too ──
    let finalProduct = product;
    const firstWithImages = savedVariants.find(v => v.images?.length > 0);
    if (firstWithImages) {
      const { data: updatedProduct, error: syncError } = await supabase
        .from('products')
        .update({ images: firstWithImages.images, image_url: firstWithImages.images[0] })
        .eq('product_id', productId)
        .select()
        .single();
      if (!syncError && updatedProduct) {
        finalProduct = updatedProduct;
      }
    } else {
      const { data: updatedProduct, error: syncError } = await supabase
        .from('products')
        .update({ images: [], image_url: null })
        .eq('product_id', productId)
        .select()
        .single();
      if (!syncError && updatedProduct) {
        finalProduct = updatedProduct;
      }
    }

    // Images replaced or removed in this edit (incl. deleted variants) are deleted from R2
    await productService.deleteRemovedProductImages(productId, oldImageUrls);

    return { product: productService.normalizeProductCare(finalProduct), variants: savedVariants };
  },

  /**
   * Retrieves all active variants for a product.
   */
  async getVariantsByProductId(productId) {
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async updateVariant(variantId, variantData) {
    const { variant_id, ...cleanData } = variantData || {};
    const { data, error } = await supabase
      .from('product_variants')
      .update(cleanData)
      .eq('variant_id', variantId)
      .select();
    if (error) throw error;
    return data;
  },

  async deleteVariant(variantId) {
    const { error } = await supabase
      .from('product_variants')
      .delete()
      .eq('variant_id', variantId);
    if (error) throw error;
  },

  async _uploadVariantImages(mediaItems, productName) {
    if (!mediaItems || mediaItems.length === 0) return [];
    const urls = [];
    const safeSlug = (productName || 'product')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'product';

    for (const item of mediaItems) {
      const rawFile = item.file || item;
      const compressedFile = await compressImage(rawFile, 'variant');

      const fileExt = compressedFile.name?.split('.').pop() || 'webp';
      const fileName = `${safeSlug}-variant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${fileExt}`;
      const filePath = `products/variants/${fileName}`;

      let lastErr = null;
      let publicUrl = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        const formData = new FormData();
        formData.append('file', compressedFile, fileName);
        formData.append('filePath', filePath);
        formData.append('cacheControl', '31536000');

        const { data, error } = await supabase.functions.invoke('upload-image', {
          body: formData,
        });

        if (!error && data?.publicUrl) {
          publicUrl = data.publicUrl;
          lastErr = null;
          break;
        }
        lastErr = error || new Error('Failed to upload variant image');
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }

      if (lastErr) throw lastErr;
      urls.push(publicUrl);
    }
    return urls;
  },
};