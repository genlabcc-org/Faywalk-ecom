/// <reference path="../global.d.ts" />
// supabase/functions/razorpay-webhook/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";
import * as crypto from "node:crypto";
import { handleCorsPreflight, corsHeaders } from "../_shared/cors.ts";
import { bookShipmentForOrder } from "../_shared/bookShipment.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") || "faywalk_rzp_webhook_secret_2026";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Triggers order notification email via the send-order-email edge function
 */
async function sendNotificationEmail(order: any, orderItems: any[], address: any, user: any) {
  try {
    const customerName = address?.name || user?.name || "Valued Customer";
    const customerEmail = user?.email || address?.email || "N/A";
    const customerPhone = address?.mobile || address?.phone || user?.phone || "N/A";

    const formattedAddress = address
      ? [
          address.flat,
          address.area,
          address.city,
          address.state ? `${address.state} - ${address.pincode || address.pin_code}` : address.pincode,
        ]
          .filter(Boolean)
          .join(", ")
      : "N/A";

    const itemsListFormatted = (orderItems || [])
      .map(
        (it: any, idx: number) =>
          `[${idx + 1}] ${it.product_name || "Product"} (Qty: ${it.quantity || 1}) - ₹${it.price || 0}`
      )
      .join("\n");

    const emailPayload = {
      orderId: order.id,
      customerName,
      customerEmail,
      customerPhone,
      paymentMethod: "Razorpay (Online Payment)",
      address: formattedAddress,
      items: orderItems || [],
      itemsListFormatted,
      totalPrice: order.total_price || 0,
      subtotal: order.total_price || 0,
      discount: 0,
      shippingFee: order.shipping_fee || 0,
    };

    const res = await fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!res.ok) {
      console.warn(`[Razorpay Webhook] send-order-email returned ${res.status}:`, await res.text());
    } else {
      console.log(`[Razorpay Webhook] Order confirmation email sent for #${order.id}`);
    }
  } catch (err) {
    console.warn(`[Razorpay Webhook] Failed to dispatch order email for #${order?.id}:`, err);
  }
}

Deno.serve(async (req: Request) => {
  // 1. CORS Preflight
  const corsResponse = handleCorsPreflight(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: true, message: "Method ignored" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      console.warn("[Razorpay Webhook] Missing x-razorpay-signature header");
      return new Response(JSON.stringify({ error: "Missing signature header" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Verify Razorpay HMAC signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.warn("[Razorpay Webhook] 401 Unauthorized: Signature mismatch");
      return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Parse JSON body
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch (parseErr) {
      console.error("[Razorpay Webhook] Failed to parse JSON:", parseErr);
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = body.event;
    console.log(`[Razorpay Webhook] Received verified event: "${event}"`);

    // We handle order.paid and payment.captured
    if (event !== "order.paid" && event !== "payment.captured") {
      console.log(`[Razorpay Webhook] Event "${event}" acknowledged and ignored.`);
      return new Response(JSON.stringify({ ok: true, message: `Event ${event} ignored` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentEntity = body.payload?.payment?.entity;
    const orderEntity = body.payload?.order?.entity;

    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
    const razorpayPaymentId = paymentEntity?.id;
    const notes = paymentEntity?.notes || orderEntity?.notes || {};

    if (!razorpayOrderId) {
      console.warn("[Razorpay Webhook] No order_id found in event payload:", body);
      return new Response(JSON.stringify({ ok: true, note: "No order_id in payload" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Razorpay Webhook] Processing payment for Razorpay Order: ${razorpayOrderId}, Payment: ${razorpayPaymentId}`);

    // 4. Find order in database
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*)")
      .eq("razorpay_order_id", razorpayOrderId)
      .maybeSingle();

    if (orderErr) {
      console.error(`[Razorpay Webhook] Database error fetching order for ${razorpayOrderId}:`, orderErr);
      return new Response(JSON.stringify({ ok: false, error: orderErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order) {
      // If already Paid, don't re-process
      if ((order.status || "").toLowerCase() === "paid" || (order.payment || "").toLowerCase() === "paid") {
        console.log(`[Razorpay Webhook] Order #${order.id} is already marked as Paid. Skipping duplicate processing.`);
        return new Response(JSON.stringify({ ok: true, message: "Order already paid" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark order as Paid
      console.log(`[Razorpay Webhook] Updating order #${order.id} from "${order.status}" to "Paid"`);
      const { data: updatedOrder, error: updateErr } = await supabaseAdmin
        .from("orders")
        .update({
          status: "Paid",
          payment: "Razorpay",
          razorpay_payment_id: razorpayPaymentId || order.razorpay_payment_id,
        })
        .eq("id", order.id)
        .select()
        .single();

      if (updateErr) {
        console.error(`[Razorpay Webhook] Failed to update order #${order.id}:`, updateErr);
      }

      // Fetch customer address and profile for booking and emails
      let addressData = null;
      if (order.address_id) {
        const { data: addr } = await supabaseAdmin
          .from("addresses")
          .select("*")
          .eq("address_id", order.address_id)
          .maybeSingle();
        addressData = addr;
      }

      let userData = null;
      if (order.user_id) {
        const { data: usr } = await supabaseAdmin
          .from("users")
          .select("name, email, phone")
          .eq("id", order.user_id)
          .maybeSingle();
        userData = usr;
      }

      // 5. Book shipment with iCarry
      try {
        console.log(`[Razorpay Webhook] Auto-booking shipment with iCarry for order #${order.id}...`);
        const bookingResult = await bookShipmentForOrder(supabaseAdmin, order.id);
        console.log(`[Razorpay Webhook] iCarry booking result for #${order.id}:`, bookingResult);
      } catch (shipErr) {
        console.error(`[Razorpay Webhook] iCarry booking error for #${order.id}:`, shipErr);
      }

      // 6. Send order notification email
      await sendNotificationEmail(updatedOrder || order, order.order_items || [], addressData, userData);

      return new Response(JSON.stringify({ ok: true, message: `Order #${order.id} marked as Paid` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 5. Order does not exist yet in orders table.
    // Ensure idempotency: check if already created by a concurrent webhook
    // ─────────────────────────────────────────────────────────────
    const { data: existingCheck } = await supabaseAdmin
      .from("orders")
      .select("*")
      .or(`razorpay_order_id.eq.${razorpayOrderId},razorpay_payment_id.eq.${razorpayPaymentId}`)
      .maybeSingle();

    if (existingCheck) {
      console.log(`[Razorpay Webhook] Order #${existingCheck.id} already exists in orders table.`);
      if (existingCheck.status !== "Paid") {
        await supabaseAdmin
          .from("orders")
          .update({
            status: "Paid",
            payment: "Razorpay",
            razorpay_payment_id: razorpayPaymentId,
          })
          .eq("id", existingCheck.id);
      }
      return new Response(JSON.stringify({ ok: true, message: `Order #${existingCheck.id} already processed` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = notes.user_id || null;
    const addressId = notes.address_id ? Number(notes.address_id) : null;
    const amountInRupees = notes.total_price
      ? Number(String(notes.total_price).replace(/[^0-9.]/g, ''))
      : (paymentEntity?.amount ? Number(paymentEntity.amount) / 100 : 0);
    const shippingFee = notes.shipping_fee ? Number(notes.shipping_fee) : 0;
    const itemName = notes.product_name || "Online Order";
    const quantity = notes.quantity ? Number(notes.quantity) : 1;
    const discountAmount = notes.discount_amount
      ? Number(String(notes.discount_amount).replace(/[^0-9.]/g, ''))
      : 0;
    const couponCode = notes.discount_code ? String(notes.discount_code).trim().toUpperCase() : null;

    // Create the order strictly upon verified payment!
    const { data: newOrder, error: createErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        address_id: addressId,
        item_name: itemName,
        quantity: quantity,
        total_price: amountInRupees,
        shipping_fee: shippingFee,
        discount_amount: discountAmount,
        coupon_code: couponCode,
        payment: "Razorpay",
        type: "Regular",
        status: "Paid",
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
      })
      .select()
      .single();

    if (createErr || !newOrder) {
      console.error("[Razorpay Webhook] Failed to create order after payment:", createErr);
      return new Response(JSON.stringify({ ok: false, error: createErr?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Razorpay Webhook] Order #${newOrder.id} successfully created upon payment.`);

    // Record coupon usage if coupon code applied
    if (couponCode) {
      try {
        const { data: cData } = await supabaseAdmin
          .from("coupons")
          .select("id, used_count")
          .ilike("code", couponCode)
          .maybeSingle();

        if (cData?.id) {
          if (userId) {
            await supabaseAdmin.from("coupon_usages").insert({
              coupon_id: cData.id,
              user_id: String(userId),
              order_id: String(newOrder.id),
            });
          }
          try {
            await supabaseAdmin.rpc("increment_coupon_usage", { coupon_id: cData.id });
          } catch {
            await supabaseAdmin
              .from("coupons")
              .update({ used_count: (cData.used_count || 0) + 1 })
              .eq("id", cData.id);
          }
        }
      } catch (cErr) {
        console.warn("[Razorpay Webhook] Error recording coupon usage:", cErr);
      }
    }

    // Extract product items directly from Razorpay notes
    let rawItems: any[] = [];
    if (notes.items_json) {
      try {
        rawItems = JSON.parse(notes.items_json);
      } catch {}
    }
    if (rawItems.length === 0) {
      for (let i = 1; i <= 10; i++) {
        const itemVal = notes[`item_${i}`];
        if (!itemVal) break;
        try {
          if (itemVal.startsWith("{")) {
            rawItems.push(JSON.parse(itemVal));
          } else {
            const parts = itemVal.split(" | ");
            const name = parts[0] || itemName;
            let sku = null, size = null, color = null, qty = 1, price = 0;
            parts.forEach((p: string) => {
              if (p.startsWith("SKU:")) sku = p.replace("SKU:", "").trim();
              if (p.startsWith("Size:")) size = p.replace("Size:", "").trim();
              if (p.startsWith("Color:")) color = p.replace("Color:", "").trim();
              if (p.startsWith("Qty:")) qty = Number(p.replace("Qty:", "").trim()) || 1;
              if (p.startsWith("₹")) price = Number(p.replace("₹", "").trim()) || 0;
            });
            rawItems.push({ name, sku, size, color, quantity: qty, price });
          }
        } catch {}
      }
    }

    if (rawItems.length === 0) {
      rawItems.push({
        name: itemName,
        quantity: quantity,
        price: Math.max(0, amountInRupees - shippingFee),
      });
    }

    const orderItemsToInsert = rawItems.map((item: any) => ({
      order_id: newOrder.id,
      product_id: item.productId || item.product_id || item.p || null,
      product_name: item.name || item.product_name || item.n || itemName,
      quantity: item.quantity || item.qty || item.q || 1,
      price: item.price || item.pr || 0,
      size: item.size || item.s || null,
      color: item.color || item.c || null,
      sku: item.sku || null,
      image_url: item.image || item.image_url || null,
    }));

    if (orderItemsToInsert.length > 0) {
      const { error: itemsErr } = await supabaseAdmin
        .from("order_items")
        .insert(orderItemsToInsert);

      if (itemsErr) {
        console.warn("[Razorpay Webhook] Error inserting order items:", itemsErr.message);
      }
    }

    // Fetch customer address and user profile for courier booking & emails
    let addressData = null;
    if (addressId) {
      const { data: addr } = await supabaseAdmin
        .from("addresses")
        .select("*")
        .eq("address_id", addressId)
        .maybeSingle();
      addressData = addr;
    }

    let userData = null;
    if (userId) {
      const { data: usr } = await supabaseAdmin
        .from("users")
        .select("name, email, phone")
        .eq("id", userId)
        .maybeSingle();
      userData = usr;
    }

    // Auto-book shipment with iCarry
    try {
      console.log(`[Razorpay Webhook] Auto-booking shipment with iCarry for order #${newOrder.id}...`);
      const bookingResult = await bookShipmentForOrder(supabaseAdmin, newOrder.id);
      console.log(`[Razorpay Webhook] iCarry booking result for #${newOrder.id}:`, bookingResult);
    } catch (shipErr) {
      console.error(`[Razorpay Webhook] iCarry booking error for #${newOrder.id}:`, shipErr);
    }

    // Send order confirmation email
    await sendNotificationEmail(newOrder, orderItemsToInsert, addressData, userData);

    return new Response(JSON.stringify({ ok: true, orderId: newOrder.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[Razorpay Webhook] Unexpected error:", errMsg);
    return new Response(JSON.stringify({ ok: false, error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
