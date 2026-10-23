import { SupabaseClient } from "@supabase/supabase-js";
import { RazorpayClient } from "./client.ts";
import { Product, Order } from "../../_shared/types.ts";
import { cancelShipmentForOrder } from "../../_shared/bookShipment.ts";

/** Normalise a state name for comparison (same logic as the frontend). */
function normState(s: string | null | undefined): string {
  return String(s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");
}

/** Pick the matching shipping-rate row and return the fee. */
function calcFee(
  rates: Array<{ state: string; fee: number; free_above: number | null }>,
  state: string,
  amountAfterDiscount: number,
): number {
  const row =
    rates.find((r) => normState(r.state) === normState(state)) ||
    rates.find((r) => r.state === "__default__");
  if (!row) return 0;
  if (row.free_above != null && amountAfterDiscount >= Number(row.free_above)) return 0;
  return Number(row.fee) || 0;
}

/** Server-side discount code → percentage map. The client cannot choose the %. */
const DISCOUNT_CODES: Record<string, number> = { WELCOME10: 10, FESTIVE20: 20 };
const discountPctFor = (code?: string | null) =>
  DISCOUNT_CODES[String(code || "").trim().toUpperCase()] ?? 0;

export interface CreateOrderInput {
  userId: string;
  items: Array<{
    productId: string | number;
    quantity?: number;
    price?: number;
    size?: string | null;
    color?: string | null;
  }>;
  addressId?: number | string;
  discountCode?: string | null;
  discountAmount?: number | null;
  discountPct?: number | null;
}

export interface CreateOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  productName: string;
  keyId?: string;
}

export interface VerifyPaymentInput {
  userId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  items: Array<{
    productId: string | number;
    quantity?: number;
    price?: number;
    size?: string | null;
    color?: string | null;
  }>;
  addressId?: number | string;
  discountCode?: string | null;
  discountAmount?: number | null;
  discountPct?: number | null;
}

export class RazorpayService {
  private client: RazorpayClient;
  private supabaseAdmin: SupabaseClient;

  constructor(supabaseAdmin: SupabaseClient) {
    this.client = new RazorpayClient();
    this.supabaseAdmin = supabaseAdmin;
  }

  /**
   * Compute shipping fee server-side (fail-closed):
   *   1. Verify the address belongs to the user and get its state
   *   2. Read active shipping_rates from the DB
   *   3. Run calcFee (same logic as the frontend)
   *   Throws on any failure — never silently grants free shipping.
   */
  private async computeShippingFee(
    userId: string,
    addressId: number | string | undefined,
    amountAfterDiscount: number,
  ): Promise<number> {
    if (!addressId) throw new Error("Delivery address is required");

    const { data: addr, error: addrErr } = await this.supabaseAdmin
      .from("addresses")
      .select("state")
      .eq("address_id", Number(addressId))
      .eq("user_id", userId)
      .maybeSingle();
    if (addrErr || !addr?.state) throw new Error("Invalid delivery address");

    const { data: rates, error: rateErr } = await this.supabaseAdmin
      .from("shipping_rates")
      .select("state, fee, free_above")
      .eq("is_active", true);
    if (rateErr || !rates?.length) throw new Error("Shipping rates unavailable");

    return calcFee(rates as any, addr.state, amountAfterDiscount);
  }

  /**
   * Look up and validate coupon from the database or fallbacks.
   * Supports both percentage and fixed discounts, max discount caps,
   * min order thresholds, and category restrictions.
   */
  private async computeDiscount(
    subtotal: number,
    discountCode?: string | null,
    clientDiscountAmount?: number | null,
    clientDiscountPct?: number | null,
    resolvedItems?: any[]
  ): Promise<{ discountAmount: number; discountCode: string | null }> {
    if (!discountCode || !String(discountCode).trim()) {
      // If client supplied a pre-verified discountAmount with no code
      if (clientDiscountAmount && clientDiscountAmount > 0) {
        return { discountAmount: Math.min(subtotal, Math.max(0, Math.round(clientDiscountAmount))), discountCode: null };
      }
      return { discountAmount: 0, discountCode: null };
    }

    const code = String(discountCode).trim().toUpperCase();

    try {
      // 1. Query Supabase coupons table
      const { data: coupon, error } = await this.supabaseAdmin
        .from("coupons")
        .select("*, categories:category_id(category_id, name), subcategories:subcategory_id(subcategory_id, name)")
        .ilike("code", code)
        .maybeSingle();

      if (!error && coupon) {
        if (!coupon.is_active) {
          console.warn(`[computeDiscount] Coupon ${code} is inactive`);
          return { discountAmount: 0, discountCode: null };
        }

        const now = new Date();
        if (coupon.start_date && new Date(coupon.start_date) > now) {
          return { discountAmount: 0, discountCode: null };
        }
        if (coupon.expiry_date && new Date(coupon.expiry_date) < now) {
          return { discountAmount: 0, discountCode: null };
        }
        if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
          return { discountAmount: 0, discountCode: null };
        }

        // Calculate applicable subtotal (category/subcategory matching if restricted)
        let applicableSubtotal = subtotal;
        const targetCatId = coupon.category_id ? String(coupon.category_id) : null;
        const targetSubId = coupon.subcategory_id ? String(coupon.subcategory_id) : null;

        if ((targetCatId || targetSubId) && resolvedItems && resolvedItems.length > 0) {
          const matching = resolvedItems.filter((item: any) => {
            if (targetSubId) {
              return String(item.subcategory_id || "") === targetSubId;
            }
            if (targetCatId) {
              return String(item.category_id || "") === targetCatId;
            }
            return false;
          });
          if (matching.length > 0) {
            applicableSubtotal = matching.reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
          } else {
            console.warn(`[computeDiscount] No eligible items in order for coupon ${code} (targetSub: ${targetSubId}, targetCat: ${targetCatId})`);
            return { discountAmount: 0, discountCode: null };
          }
        }

        const minOrder = Number(coupon.min_order_amount || 0);
        if (minOrder > 0 && applicableSubtotal < minOrder) {
          console.warn(`[computeDiscount] Subtotal ${applicableSubtotal} below min order ${minOrder} for coupon ${code}`);
          return { discountAmount: 0, discountCode: null };
        }

        let discount = 0;
        if (coupon.discount_type === "percentage") {
          discount = Math.round((applicableSubtotal * Number(coupon.discount_value)) / 100);
          if (coupon.max_discount_amount && Number(coupon.max_discount_amount) > 0) {
            discount = Math.min(discount, Number(coupon.max_discount_amount));
          }
        } else {
          // Fixed discount amount
          discount = Math.min(Number(coupon.discount_value || 0), applicableSubtotal);
        }

        return { discountAmount: Math.max(0, discount), discountCode: code };
      }
    } catch (err) {
      console.warn(`[computeDiscount] Error checking coupons table for ${code}:`, err);
    }

    // 2. Hardcoded fallback (WELCOME10, FESTIVE20)
    const hardcodedPct = DISCOUNT_CODES[code];
    if (hardcodedPct) {
      return {
        discountAmount: Math.round((subtotal * hardcodedPct) / 100),
        discountCode: code,
      };
    }

    // 3. Fallback to client verified amount/percentage if within subtotal
    if (clientDiscountAmount && clientDiscountAmount > 0) {
      const safeAmount = Math.min(subtotal, Math.max(0, Math.round(clientDiscountAmount)));
      return { discountAmount: safeAmount, discountCode: code };
    }
    if (clientDiscountPct && clientDiscountPct > 0) {
      const safeAmount = Math.round((subtotal * Math.min(100, clientDiscountPct)) / 100);
      return { discountAmount: safeAmount, discountCode: code };
    }

    return { discountAmount: 0, discountCode: null };
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const items = input.items;
    // 1. Query product details and variants from database for all items
    const productIds = items.map(item => item.productId).filter(Boolean);
    const { data: rawProducts, error: dbError } = await this.supabaseAdmin
      .from("products")
      .select("product_id, name, price, discount_price, image_url, images, sku, category_id, subcategory_id, product_variants(*)")
      .in("product_id", productIds);
    const products = (rawProducts || []) as unknown as any[];

    if (dbError || !products || products.length === 0) {
      throw new Error(`Products not found or database query failed: ${dbError?.message || "Unknown error"}`);
    }

    // 2. Calculate subtotal and resolve variant details
    let subtotal = 0;
    const resolvedItemDetails: Array<{
      productId: any;
      category_id?: any;
      subcategory_id?: any;
      name: string;
      price: number;
      quantity: number;
      size: string | null;
      color: string | null;
      image: string | null;
      sku: string | null;
    }> = [];

    for (const item of items) {
      const product = products.find(p => String(p.product_id) === String(item.productId));
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      const variants = product.product_variants || [];
      let itemPrice = 0;
      let itemImage = product.image_url || (product.images && product.images[0]) || null;
      let itemSku: string | null = product.sku || null;

      if (variants.length > 0) {
        const matchedVariant = variants.find((v: any) => {
          const matchSize = item.size ? String(v.size || '').trim().toLowerCase() === String(item.size).trim().toLowerCase() : true;
          const matchColor = item.color ? String(v.color || '').trim().toLowerCase() === String(item.color).trim().toLowerCase() : true;
          return matchSize && matchColor;
        }) || variants.find((v: any) => {
          return item.size ? String(v.size || '').trim().toLowerCase() === String(item.size).trim().toLowerCase() : true;
        }) || variants[0];

        itemPrice = Number(matchedVariant?.price || 0);
        itemSku = matchedVariant?.sku || itemSku;
        if (matchedVariant?.images && matchedVariant.images.length > 0) {
          itemImage = matchedVariant.images[0];
        }
      }

      if (itemPrice === 0) {
        const rawPrice = Number(product.price || 0);
        const rawDiscount = Number(product.discount_price || 0);
        itemPrice = rawDiscount > 0 ? rawPrice - rawDiscount : rawPrice;
      }

      if (itemPrice === 0) {
        throw new Error(`Product ${item.productId} has no valid price in the database`);
      }

      const qty = Number(item.quantity || 1);
      subtotal += itemPrice * qty;

      resolvedItemDetails.push({
        productId: product.product_id,
        category_id: product.category_id,
        subcategory_id: product.subcategory_id,
        name: product.name || "Unknown Product",
        price: itemPrice,
        quantity: qty,
        size: item.size || null,
        color: item.color || null,
        image: itemImage,
        sku: itemSku,
      });
    }

    // Apply discount (server-side database & coupon lookup) and shipping fee
    const { discountAmount, discountCode: validatedCode } = await this.computeDiscount(
      subtotal,
      input.discountCode,
      input.discountAmount,
      input.discountPct,
      resolvedItemDetails
    );

    const shipping = await this.computeShippingFee(input.userId, input.addressId, subtotal - discountAmount);
    // GST is already included in product price — do not add extra
    const grandTotal = Math.max(0, subtotal - discountAmount) + shipping;
    const amountInPaise = Math.round(grandTotal * 100);

    const mainItem = resolvedItemDetails[0];
    const productName = resolvedItemDetails.length > 1
      ? `${mainItem?.name || 'Product'} + ${resolvedItemDetails.length - 1} other(s)`
      : mainItem?.name || "Faywalk Order";

    // 3. Verify address ownership
    let safeAddressId: number | null = null;
    if (input.addressId) {
      try {
        const { data: addr } = await this.supabaseAdmin
          .from("addresses")
          .select("address_id")
          .eq("address_id", Number(input.addressId))
          .eq("user_id", input.userId)
          .maybeSingle();
        safeAddressId = addr?.address_id ?? null;
      } catch (err) {
        console.warn("Failed to verify address ownership, falling back to null:", err);
        safeAddressId = null;
      }
    }

    // 4. Create order on Razorpay with complete order & product metadata in notes
    // No temporary database table (checkout_sessions) is needed; all order data is securely held
    // in Razorpay's verified notes and retrieved upon payment verification by the webhook.
    const receiptId = `receipt_order_${Date.now()}`;
    const totalQty = resolvedItemDetails.reduce((sum, item) => sum + item.quantity, 0);

    const notes: Record<string, string> = {
      product_name: productName.slice(0, 255),
      user_id: String(input.userId).slice(0, 40),
      total_items: String(resolvedItemDetails.length),
      quantity: String(totalQty),
      total_price: String(grandTotal),
      shipping_fee: String(shipping),
      discount_amount: String(discountAmount),
    };

    if (safeAddressId) {
      notes.address_id = String(safeAddressId).slice(0, 40);
    }
    if (validatedCode || input.discountCode) {
      notes.discount_code = String(validatedCode || input.discountCode).slice(0, 40);
    }

    // Summary of products
    const productSummary = resolvedItemDetails
      .map(item => `${item.name}${item.size ? ` (${item.size})` : ''} x${item.quantity}`)
      .join(', ');
    notes.product_details = productSummary.slice(0, 255);

    // Compact item JSON for webhook order_items creation
    const compactItems = resolvedItemDetails.map(it => ({
      p: it.productId,
      n: it.name,
      q: it.quantity,
      pr: it.price,
      s: it.size || undefined,
      c: it.color || undefined,
      sku: it.sku || undefined,
    }));
    const compactJson = JSON.stringify(compactItems);
    if (compactJson.length <= 250) {
      notes.items_json = compactJson;
    } else {
      resolvedItemDetails.slice(0, 4).forEach((it, idx) => {
        notes[`item_${idx + 1}`] = JSON.stringify({
          p: it.productId,
          n: it.name.slice(0, 50),
          q: it.quantity,
          pr: it.price,
          s: it.size || undefined,
          sku: it.sku || undefined,
        }).slice(0, 255);
      });
    }

    const rzOrder = await this.client.createOrder(amountInPaise, receiptId, notes);

    return {
      orderId: rzOrder.id,
      amount: amountInPaise,
      currency: "INR",
      productName,
      keyId: this.client.getKeyId(),
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<Order> {
    // 1. Verify Razorpay HMAC signature
    const isSignatureValid = this.client.verifySignature(
      input.razorpay_order_id,
      input.razorpay_payment_id,
      input.razorpay_signature
    );

    if (!isSignatureValid) {
      throw new Error("Invalid signature verification failed");
    }

    // 2. Fetch authentic product details to record final order amount
    const productIds = input.items.map(item => item.productId).filter(Boolean);
    const { data: rawProducts, error: dbError } = await this.supabaseAdmin
      .from("products")
      .select("product_id, name, price, discount_price, image_url, images, sku, category_id, subcategory_id, product_variants(*)")
      .in("product_id", productIds);
    const products = (rawProducts || []) as unknown as any[];

    if (dbError || !products || products.length === 0) {
      throw new Error(`Products not found or database query failed: ${dbError?.message || "Unknown error"}`);
    }

    let subtotal = 0;
    const resolvedItemDetails: Array<{
      productId: any;
      category_id?: any;
      subcategory_id?: any;
      name: string;
      price: number;
      quantity: number;
      size: string | null;
      color: string | null;
      image: string | null;
      sku: string | null;
    }> = [];

    for (const item of input.items) {
      const product = products.find(p => String(p.product_id) === String(item.productId));
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      const variants = product.product_variants || [];
      let itemPrice = 0;
      let itemImage = product.image_url || (product.images && product.images[0]) || null;
      let itemSku: string | null = product.sku || null;

      if (variants.length > 0) {
        const matchedVariant = variants.find((v: any) => {
          const matchSize = item.size ? String(v.size || '').trim().toLowerCase() === String(item.size).trim().toLowerCase() : true;
          const matchColor = item.color ? String(v.color || '').trim().toLowerCase() === String(item.color).trim().toLowerCase() : true;
          return matchSize && matchColor;
        }) || variants.find((v: any) => {
          return item.size ? String(v.size || '').trim().toLowerCase() === String(item.size).trim().toLowerCase() : true;
        }) || variants[0];

        itemPrice = Number(matchedVariant?.price || 0);
        itemSku = matchedVariant?.sku || itemSku;
        if (matchedVariant?.images && matchedVariant.images.length > 0) {
          itemImage = matchedVariant.images[0];
        }
      }

      if (itemPrice === 0) {
        const rawPrice = Number(product.price || 0);
        const rawDiscount = Number(product.discount_price || 0);
        itemPrice = rawDiscount > 0 ? rawPrice - rawDiscount : rawPrice;
      }

      if (itemPrice === 0) {
        throw new Error(`Product ${item.productId} has no valid price in the database`);
      }

      const qty = Number(item.quantity || 1);
      subtotal += itemPrice * qty;

      resolvedItemDetails.push({
        productId: product.product_id,
        category_id: product.category_id,
        subcategory_id: product.subcategory_id,
        name: product.name || "Unknown Product",
        price: itemPrice,
        quantity: qty,
        size: item.size || null,
        color: item.color || null,
        image: itemImage,
        sku: itemSku,
      });
    }

    const { discountAmount, discountCode: validatedCode } = await this.computeDiscount(
      subtotal,
      input.discountCode,
      input.discountAmount,
      input.discountPct,
      resolvedItemDetails
    );

    const shipping = await this.computeShippingFee(input.userId, input.addressId, subtotal - discountAmount);
    // GST is already included in product price — do not add extra
    const grandTotal = Math.max(0, subtotal - discountAmount) + shipping;

    const mainItem = resolvedItemDetails[0];
    const itemName = resolvedItemDetails.length > 1
      ? `${mainItem?.name} + ${resolvedItemDetails.length - 1} other(s)`
      : mainItem?.name || "Faywalk Order";

    // 3. Verify address ownership if addressId was provided (falls back to null without throwing)
    let safeAddressId: number | null = null;
    if (input.addressId) {
      try {
        const { data: addr } = await this.supabaseAdmin
          .from("addresses")
          .select("address_id")
          .eq("address_id", Number(input.addressId))
          .eq("user_id", input.userId)
          .maybeSingle();
        safeAddressId = addr?.address_id ?? null;
      } catch (err) {
        console.warn("Failed to verify address ownership, falling back to null:", err);
        safeAddressId = null;
      }
    }

    // 4. Check if the order was pre-created as "Pending" during createOrder
    const { data: existingOrder } = await this.supabaseAdmin
      .from("orders")
      .select("*")
      .eq("razorpay_order_id", input.razorpay_order_id)
      .maybeSingle();

    let order: Order | null = null;

    if (existingOrder) {
      console.log(`[Razorpay] Found existing pending order #${existingOrder.id}. Updating status to Paid.`);
      const { data: updatedOrder, error: updateError } = await this.supabaseAdmin
        .from("orders")
        .update({
          status: "Paid",
          payment: "Razorpay",
          razorpay_payment_id: input.razorpay_payment_id,
          razorpay_signature: input.razorpay_signature,
        } as unknown as never)
        .eq("id", existingOrder.id)
        .select()
        .single();

      if (updateError) {
        console.warn("[Razorpay] Failed to update pending order to Paid:", updateError.message);
      }
      order = (updatedOrder || existingOrder) as unknown as Order;
    } else {
      // Fallback: Insert fresh order record if no pre-created record exists
      const { data: rawOrder, error: insertError } = await this.supabaseAdmin
        .from("orders")
        .insert({
          user_id: input.userId,
          address_id: safeAddressId,
          item_name: itemName,
          quantity: resolvedItemDetails.reduce((sum, item) => sum + item.quantity, 0),
          total_price: grandTotal,
          shipping_fee: shipping,
          discount_amount: discountAmount,
          coupon_code: validatedCode || input.discountCode || null,
          payment: "Razorpay",
          type: "Regular",
          status: "Paid",
          razorpay_order_id: input.razorpay_order_id,
          razorpay_payment_id: input.razorpay_payment_id,
          razorpay_signature: input.razorpay_signature,
        } as unknown as never)
        .select()
        .single();
      order = rawOrder as unknown as Order | null;

      if (insertError || !order) {
        throw new Error(`Failed to insert order: ${insertError?.message || "Unknown error"}`);
      }

      // Insert child order items for each item in order
      const orderItemsToInsert = resolvedItemDetails.map(item => ({
        order_id: order!.id,
        product_id: item.productId,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        color: item.color,
        image_url: item.image,
        sku: item.sku,
      }));

      const { error: itemsInsertError } = await this.supabaseAdmin
        .from("order_items")
        .insert(orderItemsToInsert as unknown as never[]);

      if (itemsInsertError) {
        throw new Error(`Failed to insert order items: ${itemsInsertError.message}`);
      }
    }

    // Note: Shipment booking and confirmation emails are strictly managed by razorpay-webhook to prevent duplicate bookings.

    return order;
  }

  async refundOrder(orderId: string | number, reason?: string): Promise<{ success: boolean; refundId?: string; refund: any; order: any }> {
    const { data: order, error: orderErr } = await this.supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      throw new Error(`Order #${orderId} not found`);
    }

    const paymentId = order.razorpay_payment_id || order.payment_id;
    if (!paymentId) {
      throw new Error(`Order #${orderId} does not have a Razorpay payment ID`);
    }

    // 0. First cancel any active courier shipment with iCarry BEFORE refunding via Razorpay
    try {
      console.log(`[refundOrder] Cancelling iCarry shipment for order #${orderId} before Razorpay refund...`);
      const cancelRes = await cancelShipmentForOrder(this.supabaseAdmin, String(orderId));
      if (cancelRes?.error) {
        console.warn(`[refundOrder] iCarry cancel warning: ${cancelRes.error}`);
      } else if (cancelRes?.skipped) {
        console.log(`[refundOrder] No active iCarry shipment for order #${orderId} — courier cancel skipped.`);
      } else {
        console.log(`[refundOrder] iCarry shipment cancelled successfully before refund.`);
      }
    } catch (cancelErr) {
      console.warn(`[refundOrder] Non-fatal exception cancelling iCarry shipment:`, cancelErr);
    }

    // 1. Fetch order items for product details
    const { data: items } = await this.supabaseAdmin
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    // 2. Fetch customer address info if available
    let customerName = "";
    let customerPhone = "";
    if (order.address_id) {
      try {
        const { data: addr } = await this.supabaseAdmin
          .from("addresses")
          .select("name, full_name, phone, phone_number")
          .eq("address_id", Number(order.address_id))
          .maybeSingle();
        if (addr) {
          customerName = addr.full_name || addr.name || "";
          customerPhone = addr.phone_number || addr.phone || "";
        }
      } catch { }
    }

    // 3. Build comprehensive notes object for Razorpay refund
    const refundNotes: Record<string, string> = {
      order_id: String(orderId).slice(0, 40),
      reason: String(reason || "Admin requested refund & cancellation").slice(0, 255),
      order_amount: `₹${order.total_price || order.total_amount || 0}`,
    };

    if (customerName) refundNotes.customer_name = customerName.slice(0, 255);
    if (customerPhone) refundNotes.customer_phone = customerPhone.slice(0, 40);

    const orderItems = (items && items.length > 0) ? items : (Array.isArray(order.items) ? order.items : []);
    if (orderItems.length > 0) {
      refundNotes.total_items = String(orderItems.length);
      const productSummary = orderItems
        .map((it: any) => `${it.product_name || it.name || 'Item'}${it.size ? ` (${it.size})` : ''} x${it.quantity || 1}`)
        .join(', ');
      refundNotes.product_details = productSummary.slice(0, 255);

      orderItems.slice(0, 4).forEach((it: any, idx: number) => {
        const itemStr = [
          it.product_name || it.name,
          it.sku ? `SKU:${it.sku}` : '',
          it.size ? `Size:${it.size}` : '',
          it.color ? `Color:${it.color}` : '',
          `Qty:${it.quantity || 1}`,
          it.price ? `₹${it.price}` : '',
        ].filter(Boolean).join(' | ');
        refundNotes[`item_${idx + 1}`] = itemStr.slice(0, 255);
      });
    } else if (order.item_name) {
      refundNotes.product_details = `${order.item_name} (Qty: ${order.quantity || 1})`.slice(0, 255);
    }

    const refund = await this.client.createRefund(paymentId, undefined, refundNotes);

    const updatePayload: Record<string, any> = {
      status: "Refund Completed",
      delivery_status: "Cancelled",
    };
    if (order.payment_status !== undefined) {
      updatePayload.payment_status = "refunded";
    }
    if (order.notes !== undefined) {
      updatePayload.notes = order.notes ? `${order.notes} | Refunded via Razorpay (${refund?.id || ''})` : `Refunded via Razorpay (${refund?.id || ''})`;
    }

    const { data: updatedOrder, error: updateErr } = await this.supabaseAdmin
      .from("orders")
      .update(updatePayload as unknown as never)
      .eq("id", orderId)
      .select()
      .maybeSingle();

    if (updateErr) {
      console.warn("Refund succeeded on Razorpay but failed to update order record:", updateErr.message);
    }

    return {
      success: true,
      refundId: refund?.id,
      refund,
      order: updatedOrder || order,
    };
  }
}
