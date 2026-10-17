import { SupabaseClient } from "@supabase/supabase-js";
import { RazorpayClient } from "./client.ts";
import { Product, Order } from "../../_shared/types.ts";

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

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const items = input.items;
    // 1. Query product details and variants from database for all items
    const productIds = items.map(item => item.productId).filter(Boolean);
    const { data: rawProducts, error: dbError } = await this.supabaseAdmin
      .from("products")
      .select("product_id, name, price, discount_price, image_url, images, sku, product_variants(*)")
      .in("product_id", productIds);
    const products = (rawProducts || []) as unknown as any[];

    if (dbError || !products || products.length === 0) {
      throw new Error(`Products not found or database query failed: ${dbError?.message || "Unknown error"}`);
    }

    // 2. Calculate subtotal and resolve variant details
    let subtotal = 0;
    const resolvedItemDetails: Array<{
      productId: any;
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
        name: product.name || "Unknown Product",
        price: itemPrice,
        quantity: qty,
        size: item.size || null,
        color: item.color || null,
        image: itemImage,
        sku: itemSku,
      });
    }

    // Apply discount (server-side code lookup) and shipping fee
    const discountAmount = Math.round((subtotal * discountPctFor(input.discountCode)) / 100);

    const shipping = await this.computeShippingFee(input.userId, input.addressId, subtotal - discountAmount);
    // GST is already included in product price — do not add extra
    const grandTotal = Math.max(0, subtotal - discountAmount) + shipping;
    const amountInPaise = Math.round(grandTotal * 100);

    const mainItem = resolvedItemDetails[0];
    const productName = resolvedItemDetails.length > 1
      ? `${mainItem?.name || 'Product'} + ${resolvedItemDetails.length - 1} other(s)`
      : mainItem?.name || "Faywalk Order";

    // 3. Create order on Razorpay
    const receiptId = `receipt_order_${Date.now()}`;
    const notes: Record<string, string> = {
      product_name: productName,
      user_id: String(input.userId),
    };
    if (input.addressId) {
      notes.address_id = String(input.addressId);
    }
    const rzOrder = await this.client.createOrder(amountInPaise, receiptId, notes);

    // 4. Verify address ownership
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

    // 5. Store pending checkout session metadata in checkout_sessions table
    // The orders table is kept completely clean of unpaid/abandoned checkouts.
    // The order and order_items are created strictly upon verified payment via the Razorpay webhook.
    try {
      const { error: sessionError } = await this.supabaseAdmin
        .from("checkout_sessions")
        .upsert({
          id: rzOrder.id,
          user_id: input.userId,
          address_id: safeAddressId,
          product_name: productName,
          quantity: resolvedItemDetails.reduce((sum, item) => sum + item.quantity, 0),
          total_price: grandTotal,
          shipping_fee: shipping,
          items: resolvedItemDetails,
        });

      if (sessionError) {
        console.warn("[Razorpay] Warning: Failed to save checkout session:", sessionError.message);
      }
    } catch (dbEx) {
      console.warn("[Razorpay] Error saving checkout session:", dbEx);
    }

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
      .select("product_id, name, price, discount_price, image_url, images, sku, product_variants(*)")
      .in("product_id", productIds);
    const products = (rawProducts || []) as unknown as any[];

    if (dbError || !products || products.length === 0) {
      throw new Error(`Products not found or database query failed: ${dbError?.message || "Unknown error"}`);
    }

    let subtotal = 0;
    const resolvedItemDetails: Array<{
      productId: any;
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
        name: product.name || "Unknown Product",
        price: itemPrice,
        quantity: qty,
        size: item.size || null,
        color: item.color || null,
        image: itemImage,
        sku: itemSku,
      });
    }

    const discountAmount = Math.round((subtotal * discountPctFor(input.discountCode)) / 100);

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
}
