import { supabase } from '../lib/supabase';

/** Strip currency symbols & commas so "₹1,299" → 1299 */
const parsePrice = (v) => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/[₹,\s]/g, ''));
  return isNaN(n) ? 0 : n;
};

const getOriginalImageUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  let clean = url.replace('/storage/v1/render/image/public/', '/storage/v1/object/public/');
  if (clean.includes('?')) {
    const [baseUrl, query] = clean.split('?');
    const params = new URLSearchParams(query);
    params.delete('width');
    params.delete('height');
    params.delete('resize');
    params.delete('quality');
    params.delete('format');
    const remaining = params.toString();
    clean = remaining ? `${baseUrl}?${remaining}` : baseUrl;
  }
  return clean;
};

const normalizeColor = (c) => String(c || '').trim().toLowerCase();

/** Colors the product actually offers (its variant colors plus its own colors list) */
const getRealColors = (product, variants) => {
  const productColors = Array.isArray(product.colors)
    ? product.colors
    : String(product.colors || '').split(',');
  return [...variants.map(v => v.color), ...productColors].map(normalizeColor).filter(Boolean);
};

export const cartService = {
  /**
   * Retrieves all cart items for a user.
   * @param {string} userId
   * @returns {Promise<any[]>}
   */
  async getCartItems(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('cart_items')
      .select('*, products(*, categories(name), product_variants(*))')
      .eq('user_id', userId);

    if (error) throw error;

    return (data || []).map(item => {
      const product = item.products;
      if (!product) {
        return {
          id: item.id,
          productId: item.product_id,
          name: 'Product',
          price: 0,
          originalPrice: 0,
          category: '',
          qty: item.qty || 1,
          size: item.size || '',
          color: item.color || '',
          image: '/src/assets/cart/bangle1.webp',
          deliveryDate: "2 - 3 days"
        };
      }

      const variants = product.product_variants || [];
      let matchedVariant = null;
      if (variants.length > 0) {
        matchedVariant = variants.find(v => {
          const matchSize = item.size ? String(v.size || '').trim().toLowerCase() === String(item.size).trim().toLowerCase() : true;
          const matchColor = item.color ? String(v.color || '').trim().toLowerCase() === String(item.color).trim().toLowerCase() : true;
          return matchSize && matchColor;
        }) || variants.find(v => {
          return item.size ? String(v.size || '').trim().toLowerCase() === String(item.size).trim().toLowerCase() : true;
        }) || variants[0];
      }

      let price = 0;
      let originalPrice = 0;
      let image = product.image_url || (product.images && product.images[0]) || '/src/assets/cart/bangle1.webp';

      if (matchedVariant) {
        price = parsePrice(matchedVariant.price);
        originalPrice = parsePrice(matchedVariant.compare_price || Math.round(price * 1.3));
        if (matchedVariant.images && matchedVariant.images.length > 0) {
          image = matchedVariant.images[0];
        }
      } else {
        const rawPrice = parsePrice(product.price);
        const rawDiscount = parsePrice(product.discount_price);
        price = rawDiscount > 0 ? rawPrice - rawDiscount : rawPrice;
        originalPrice = parsePrice(product.compare_price || Math.round(rawPrice * 1.3));
      }

      const sku = matchedVariant?.sku || product.sku || '';

      // Older cart rows may hold a placeholder color the product never offered — hide it
      const storedColor = item.color || '';
      const realColor = getRealColors(product, variants).includes(normalizeColor(storedColor)) ? storedColor : '';

      return {
        id: item.id,
        productId: item.product_id,
        name: product.name || '',
        price: price,
        originalPrice: originalPrice,
        category: product.categories?.name || '',
        sku: sku,
        qty: item.qty || 1,
        size: item.size || '',
        color: realColor,
        // Exact value in the DB row; part of the cart's unique key, so sync must use it
        storedColor,
        image: getOriginalImageUrl(image),
        deliveryDate: "2 - 3 days"
      };
    });
  },

  /**
   * Adds a single item to user's cart.
   * @param {string} userId
   * @param {number} productId
   * @param {number} qty
   * @param {string|null} size
   * @param {string|null} color
   */
  async addCartItem(userId, productId, qty = 1, size = null, color = null) {
    const normSize = size || '';
    const normColor = color || '';
    const { data, error } = await supabase
      .from('cart_items')
      .upsert({
        user_id: userId,
        product_id: productId,
        qty,
        size: normSize,
        color: normColor
      }, { onConflict: 'user_id,product_id,size,color' })
      .select();

    if (error) throw error;
    return data;
  },

  /**
   * Updates quantity of a cart item.
   * @param {string} itemId
   * @param {number} qty
   */
  async updateCartItemQty(itemId, qty) {
    const { data, error } = await supabase
      .from('cart_items')
      .update({ qty })
      .eq('id', itemId)
      .select();

    if (error) throw error;
    return data;
  },

  /**
   * Deletes specific cart items by their primary key IDs.
   * @param {string[]} itemIds
   */
  async deleteCartItems(itemIds) {
    if (!itemIds || itemIds.length === 0) return;
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .in('id', itemIds);

    if (error) throw error;
  },

  /**
   * Synchronizes multiple cart items to DB (upsert).
   * @param {any[]} items
   */
  async syncCartItems(items) {
    if (!items || items.length === 0) return;
    const { data, error } = await supabase
      .from('cart_items')
      .upsert(items, { onConflict: 'user_id,product_id,size,color' })
      .select();

    if (error) throw error;
    return data;
  }
};
