import { supabase } from "../lib/supabase";

export const couponService = {
  /**
   * Fetch all coupons (for Admin Panel)
   */
  async getAllCoupons() {
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*, categories:category_id(category_id, name), subcategories:subcategory_id(subcategory_id, name)")
        .order("created_at", { ascending: false });

      if (error) {
        // Fallback without join if foreign key naming differs
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("coupons")
          .select("*")
          .order("created_at", { ascending: false });
        if (fallbackError) throw fallbackError;
        return fallbackData || [];
      }
      return data || [];
    } catch (err) {
      console.error("Error fetching coupons:", err);
      throw err;
    }
  },

  /**
   * Fetch all currently active & unexpired coupons for customer display
   */
  async getActiveCoupons(subtotal = 0, userId = null) {
    try {
      if (!userId) {
        const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: {} }));
        userId = session?.user?.id || null;
      }

      let { data, error } = await supabase
        .from("coupons")
        .select("*, categories:category_id(category_id, name), subcategories:subcategory_id(subcategory_id, name)")
        .eq("is_active", true)
        .order("discount_value", { ascending: false });

      if (error) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("coupons")
          .select("*")
          .eq("is_active", true)
          .order("discount_value", { ascending: false });
        if (fallbackError) {
          console.warn("Could not fetch active coupons:", fallbackError);
          return [];
        }
        data = fallbackData;
      }

      // Fetch user usage counts for coupons with per_user_limit
      let userUsageMap = {};
      if (userId && data && data.length > 0) {
        try {
          const couponIdsWithPerUserLimit = data
            .filter((c) => c.per_user_limit && Number(c.per_user_limit) > 0)
            .map((c) => c.id);

          if (couponIdsWithPerUserLimit.length > 0) {
            const { data: usages } = await supabase
              .from("coupon_usages")
              .select("coupon_id")
              .eq("user_id", String(userId))
              .in("coupon_id", couponIdsWithPerUserLimit);

            if (usages) {
              usages.forEach((u) => {
                userUsageMap[u.coupon_id] = (userUsageMap[u.coupon_id] || 0) + 1;
              });
            }
          }
        } catch (e) {
          console.warn("Could not check coupon usages for user:", e);
        }
      }

      const now = new Date();
      return (data || []).filter((c) => {
        if (!c.is_active) return false;
        if (c.start_date && new Date(c.start_date) > now) return false;
        if (c.expiry_date && new Date(c.expiry_date) < now) return false;
        if (c.usage_limit && c.used_count >= c.usage_limit) return false;
        // Filter out if user reached their individual per-user limit (defaults to 1)
        const userLimit = c.per_user_limit !== null && c.per_user_limit !== undefined ? Number(c.per_user_limit) : 1;
        if (userLimit > 0 && userUsageMap[c.id]) {
          if (userUsageMap[c.id] >= userLimit) return false;
        }
        return true;
      });
    } catch (err) {
      console.warn("Error fetching active coupons:", err);
      return [];
    }
  },

  /**
   * Create a new coupon
   */
  async createCoupon(couponData) {
    try {
      const cleanedCode = (couponData.code || "").trim().toUpperCase();
      if (!cleanedCode) {
        throw new Error("Coupon code is required");
      }

      const discountValue = Number(couponData.discount_value);
      if (isNaN(discountValue) || discountValue <= 0) {
        throw new Error("Discount value must be greater than 0");
      }

      if (couponData.discount_type === "percentage" && discountValue > 100) {
        throw new Error("Percentage discount cannot exceed 100%");
      }

      const payload = {
        code: cleanedCode,
        category_id: couponData.category_id ? Number(couponData.category_id) : null,
        subcategory_id: couponData.subcategory_id ? Number(couponData.subcategory_id) : null,
        discount_type: couponData.discount_type || "percentage",
        discount_value: discountValue,
        min_order_amount: couponData.min_order_amount ? Number(couponData.min_order_amount) : 0,
        max_discount_amount: couponData.max_discount_amount ? Number(couponData.max_discount_amount) : null,
        usage_limit: couponData.usage_limit ? Number(couponData.usage_limit) : null,
        per_user_limit: couponData.per_user_limit !== undefined && couponData.per_user_limit !== "" && couponData.per_user_limit !== null
          ? Number(couponData.per_user_limit)
          : 1,
        is_active: couponData.is_active !== undefined ? Boolean(couponData.is_active) : true,
        start_date: couponData.start_date || new Date().toISOString(),
        expiry_date: couponData.expiry_date || null,
      };

      const { data, error } = await supabase
        .from("coupons")
        .insert([payload])
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error(`Coupon code "${cleanedCode}" already exists.`);
        }
        throw error;
      }

      return data;
    } catch (err) {
      console.error("Error creating coupon:", err);
      throw err;
    }
  },

  /**
   * Update an existing coupon
   */
  async updateCoupon(id, updates) {
    try {
      const payload = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      if (payload.code) {
        payload.code = payload.code.trim().toUpperCase();
      }
      if (payload.category_id !== undefined) {
        payload.category_id = payload.category_id ? Number(payload.category_id) : null;
      }
      if (payload.subcategory_id !== undefined) {
        payload.subcategory_id = payload.subcategory_id ? Number(payload.subcategory_id) : null;
      }
      if (payload.discount_value !== undefined) {
        payload.discount_value = Number(payload.discount_value);
      }
      if (payload.min_order_amount !== undefined) {
        payload.min_order_amount = payload.min_order_amount ? Number(payload.min_order_amount) : 0;
      }
      if (payload.max_discount_amount !== undefined) {
        payload.max_discount_amount = payload.max_discount_amount ? Number(payload.max_discount_amount) : null;
      }
      if (payload.usage_limit !== undefined) {
        payload.usage_limit = payload.usage_limit ? Number(payload.usage_limit) : null;
      }
      if (payload.per_user_limit !== undefined) {
        payload.per_user_limit = payload.per_user_limit !== "" && payload.per_user_limit !== null
          ? Number(payload.per_user_limit)
          : 1;
      }

      const { data, error } = await supabase
        .from("coupons")
        .update(payload)
        .eq("id", id)
        .select("*, categories:category_id(category_id, name), subcategories:subcategory_id(subcategory_id, name)")
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error(`Coupon code "${payload.code}" already exists.`);
        }
        throw error;
      }

      return data;
    } catch (err) {
      console.error("Error updating coupon:", err);
      throw err;
    }
  },

  /**
   * Quick status toggle (active / inactive)
   */
  async toggleCouponStatus(id, isActive) {
    return this.updateCoupon(id, { is_active: isActive });
  },

  /**
   * Delete coupon
   */
  async deleteCoupon(id) {
    try {
      const { error } = await supabase
        .from("coupons")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Error deleting coupon:", err);
      throw err;
    }
  },

  /**
   * Validate coupon code for checkout
   * @param {string} code 
   * @param {number} subtotal 
   * @param {Array} items - List of items in cart/checkout
   * @param {Array} categories - Optional categories list for matching
   * @param {string} userId - Optional user ID for per-user limit checking
   */
  async validateCoupon(code, subtotal = 0, items = [], categories = [], userId = null) {
    try {
      const cleanedCode = String(code || "").trim().toUpperCase();
      if (!cleanedCode) {
        return { valid: false, error: "Please enter a coupon code." };
      }

      const { data: coupon, error } = await supabase
        .from("coupons")
        .select("*, categories:category_id(category_id, name), subcategories:subcategory_id(subcategory_id, name)")
        .ilike("code", cleanedCode)
        .maybeSingle();

      if (error) {
        console.error("Error validating coupon:", error);
        return { valid: false, error: "Unable to validate coupon code right now." };
      }

      if (!coupon) {
        return { valid: false, error: `Coupon code "${cleanedCode}" is invalid.` };
      }

      if (!coupon.is_active) {
        return { valid: false, error: `Coupon "${coupon.code}" is currently inactive.` };
      }

      const now = new Date();
      if (coupon.start_date && new Date(coupon.start_date) > now) {
        return { valid: false, error: `Coupon "${coupon.code}" is not yet active.` };
      }

      if (coupon.expiry_date && new Date(coupon.expiry_date) < now) {
        return { valid: false, error: `Coupon "${coupon.code}" has expired.` };
      }

      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        return { valid: false, error: `Coupon "${coupon.code}" has reached its maximum usage limit.` };
      }

      // Check per-user usage limit (defaults to 1)
      const maxUses = coupon.per_user_limit !== null && coupon.per_user_limit !== undefined
        ? Number(coupon.per_user_limit)
        : 1;

      if (maxUses > 0) {
        let currentUserId = userId;
        if (!currentUserId) {
          const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: {} }));
          currentUserId = sessionData?.session?.user?.id || null;
        }

        if (currentUserId) {
          try {
            const { count, error: usageErr } = await supabase
              .from("coupon_usages")
              .select("*", { count: "exact", head: true })
              .eq("coupon_id", coupon.id)
              .eq("user_id", String(currentUserId));

            if (!usageErr && count !== null && count >= maxUses) {
              return {
                valid: false,
                error: `You have already used coupon "${coupon.code}" the maximum allowed number of times (${maxUses} time${maxUses > 1 ? "s" : ""}).`,
              };
            }
          } catch (usageErr) {
            console.warn("Error checking per-user coupon usage:", usageErr);
          }
        }
      }

      // Check Category / Subcategory Restriction if specified
      let applicableSubtotal = subtotal;
      const targetCatId = coupon.category_id ? String(coupon.category_id) : null;
      const targetSubId = coupon.subcategory_id ? String(coupon.subcategory_id) : null;

      if (targetCatId || targetSubId) {
        const catName = coupon.categories?.name;
        const subName = coupon.subcategories?.name;
        const scopeLabel = subName ? `${catName ? catName + " > " : ""}${subName}` : catName;

        if (!items || items.length === 0) {
          return {
            valid: false,
            error: `This coupon is only valid for items in "${scopeLabel}".`,
          };
        }

        const isItemEligible = (item) => {
          // If subcategory is restricted
          if (targetSubId) {
            const itemSubId = String(item.subcategory_id || item.subcategoryId || "");
            if (itemSubId && itemSubId === targetSubId) return true;

            const itemSubName = String(
              item.subcategory || item.subcategory_name || item.subcategories?.name || ""
            ).trim().toLowerCase();
            if (subName && itemSubName === subName.trim().toLowerCase()) return true;
            return false;
          }

          // If category is restricted
          if (targetCatId) {
            if (item.category_id && String(item.category_id) === targetCatId) return true;
            if (item.categoryId && String(item.categoryId) === targetCatId) return true;

            const itemCatName = String(
              item.category || item.category_name || item.categories?.name || ""
            ).trim().toLowerCase();

            if (catName && itemCatName === catName.trim().toLowerCase()) {
              return true;
            }

            if (categories && categories.length > 0) {
              const matchedCat = categories.find(
                (c) => String(c.category_id || c.id) === targetCatId
              );
              if (matchedCat && itemCatName === String(matchedCat.name).trim().toLowerCase()) {
                return true;
              }
            }
            return false;
          }

          return true;
        };

        const matchingItems = items.filter(isItemEligible);

        if (matchingItems.length === 0) {
          return {
            valid: false,
            error: `Coupon "${coupon.code}" is only valid for items in "${scopeLabel}". No eligible items in your cart.`,
          };
        }

        // Compute subtotal of only matching items
        applicableSubtotal = matchingItems.reduce((sum, item) => {
          const price = Number(String(item.price || 0).replace(/[₹,\s]/g, "")) || 0;
          const qty = Number(item.qty || item.quantity || 1) || 1;
          return sum + price * qty;
        }, 0);
      }

      const minOrder = Number(coupon.min_order_amount || 0);
      if (minOrder > 0 && applicableSubtotal < minOrder) {
        return {
          valid: false,
          error: (targetCatId || targetSubId)
            ? `Minimum order amount of ₹${minOrder.toLocaleString("en-IN")} required for eligible items.`
            : `Minimum order amount of ₹${minOrder.toLocaleString("en-IN")} required for this coupon.`,
        };
      }

      // Calculate discount amount based on applicable items subtotal
      let discountAmount = 0;
      if (coupon.discount_type === "percentage") {
        discountAmount = Math.round((applicableSubtotal * Number(coupon.discount_value)) / 100);
        if (coupon.max_discount_amount && Number(coupon.max_discount_amount) > 0) {
          discountAmount = Math.min(discountAmount, Number(coupon.max_discount_amount));
        }
      } else {
        // Fixed discount cannot exceed applicable subtotal
        discountAmount = Math.min(Number(coupon.discount_value), applicableSubtotal);
      }

      return {
        valid: true,
        coupon,
        discountAmount,
        code: coupon.code,
        pct: coupon.discount_type === "percentage" ? Number(coupon.discount_value) : null,
        type: coupon.discount_type,
        value: Number(coupon.discount_value),
        categoryName: coupon.categories?.name || null,
        applicableSubtotal,
      };
    } catch (err) {
      console.error("Coupon validation error:", err);
      return { valid: false, error: "Error checking coupon code." };
    }
  },

  /**
   * Record coupon usage when an order is placed
   * @param {Object} params
   * @param {number} [params.couponId]
   * @param {string} params.couponCode
   * @param {string} params.userId
   * @param {string} [params.orderId]
   */
  async recordCouponUsage({ couponId, couponCode, userId, orderId }) {
    try {
      if (!couponId && !couponCode) return;

      let targetCouponId = couponId ? Number(couponId) : null;
      let targetCode = String(couponCode || "").toUpperCase();

      // Look up coupon ID if only code provided
      if (!targetCouponId && targetCode) {
        const { data: c } = await supabase
          .from("coupons")
          .select("id, code, used_count")
          .ilike("code", targetCode)
          .maybeSingle();
        if (c) {
          targetCouponId = c.id;
          targetCode = c.code;
        }
      }

      // 1. Insert into coupon_usages table
      await supabase.from("coupon_usages").insert({
        coupon_id: targetCouponId,
        coupon_code: targetCode,
        user_id: userId ? String(userId) : null,
        order_id: orderId ? String(orderId) : null,
      });

      // 2. Increment used_count on the coupon
      if (targetCouponId) {
        const { data: c } = await supabase
          .from("coupons")
          .select("used_count")
          .eq("id", targetCouponId)
          .maybeSingle();

        if (c) {
          await supabase
            .from("coupons")
            .update({ used_count: (c.used_count || 0) + 1 })
            .eq("id", targetCouponId);
        }
      }
    } catch (err) {
      console.warn("Failed to record coupon usage:", err);
    }
  },
};

export default couponService;
