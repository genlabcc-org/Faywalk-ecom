// supabase/functions/icarry/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCorsPreflight, corsHeaders } from "../_shared/cors.ts";
import { icarryCall, ENDPOINTS } from "../_shared/icarry.ts";
import { bookShipmentForOrder, cancelShipmentForOrder } from "../_shared/bookShipment.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Global admin client with service_role privileges
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// In-memory pincode cache (2 hours TTL)
const pincodeCache = new Map<string, { data: any; exp: number }>();

/**
 * Checks if the given user ID belongs to public.users with role = 'admin' (case-insensitive).
 */
async function checkIsAdmin(user: any): Promise<boolean> {
  if (!user) return false;
  if (user.is_service_role) return true;
  const userId = typeof user === "string" ? user : user.id;
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.warn(`[iCarry] checkIsAdmin DB error for user ${userId}:`, error.message);
    }

    const role = (data?.role || "").toString().trim().toLowerCase();
    console.log(`[iCarry] checkIsAdmin: userId=${userId}, dbRole='${data?.role}'`);
    if (role === "admin" || role === "super admin" || role === "superadmin") {
      return true;
    }

    // Also check auth.users metadata as fallback
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const metaRole = (authUser?.user?.app_metadata?.role || authUser?.user?.user_metadata?.role || "").toString().trim().toLowerCase();
    if (metaRole === "admin" || metaRole === "super admin" || metaRole === "superadmin") {
      return true;
    }
  } catch (err) {
    console.warn("[iCarry] Admin check exception:", err);
  }
  return false;
}

/**
 * Extracts and verifies the user from the Authorization header.
 */
async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    console.warn("[iCarry Auth] Missing Authorization header");
    return null;
  }
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    console.warn("[iCarry Auth] Empty Bearer token");
    return null;
  }

  // If token is service role key, accept immediately
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) {
    return { id: "service_role", email: "system@supabase.internal", is_service_role: true };
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    console.warn("[iCarry Auth] getUser failed with token:", error?.message);
    return null;
  }
  return user;
}

Deno.serve(async (req: Request) => {
  // 1. Handle CORS preflight
  const corsResponse = handleCorsPreflight(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action, payload = {} } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: "Missing action in request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 1. PINCODE CHECK (Public, no authentication required)
    // ─────────────────────────────────────────────────────────────
    if (action === "pincode") {
      const pincode = String(payload.pincode ?? payload ?? "").trim();
      if (!pincode) {
        return new Response(JSON.stringify({ error: "Pincode is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Return instant cached result if valid
      const hit = pincodeCache.get(pincode);
      if (hit && hit.exp > Date.now()) {
        return new Response(JSON.stringify(hit.data), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await icarryCall(ENDPOINTS.pincode, { pincode });
      if (data && data.success === 1) {
        pincodeCache.set(pincode, { data, exp: Date.now() + 2 * 60 * 60 * 1000 });
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate user for all remaining actions
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid or missing token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAdmin = await checkIsAdmin(user);

    // ─────────────────────────────────────────────────────────────
    // 2. TRACK SHIPMENT (Logged-in user: own order only; Admin: any order)
    // ─────────────────────────────────────────────────────────────
    if (action === "track") {
      const orderId = String(payload.orderId ?? "").trim();
      if (!orderId) {
        return new Response(JSON.stringify({ error: "orderId is required to track shipment" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let query = supabaseAdmin
        .from("orders")
        .select("id, user_id, waybill, shipment_id, courier_name, tracking_url, delivery_status")
        .eq("id", orderId);

      // Non-admin users can only track their own orders
      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      }

      const { data: order, error: orderErr } = await query.maybeSingle();

      if (orderErr) {
        console.warn(`[iCarry Track] Error querying order #${orderId}:`, orderErr.message);
      }

      if (orderErr || !order) {
        return new Response(JSON.stringify({ error: "Order not found or access denied" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const awb = order.waybill;
      const shipmentId = order.shipment_id;

      if (!awb && !shipmentId) {
        return new Response(JSON.stringify({
          error: "Shipment has not been booked or assigned a waybill yet",
          delivery_status: order.delivery_status,
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const trackPayload: Record<string, any> = {};
      if (awb) trackPayload.awb = awb;
      if (shipmentId) trackPayload.shipment_id = shipmentId;

      const data = await icarryCall(ENDPOINTS.track, trackPayload);
      return new Response(JSON.stringify({
        ...data,
        orderId: order.id,
        courier_name: order.courier_name,
        tracking_url: order.tracking_url,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 2.5. BOOK SHIPMENT FOR COD / NEW ORDER (Customer own order or Admin)
    // ─────────────────────────────────────────────────────────────
    if (action === "bookCodOrder" || action === "book") {
      const orderId = String(payload.orderId ?? "").trim();
      if (!orderId) {
        return new Response(JSON.stringify({ error: "orderId is required to book shipment" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let query = supabaseAdmin
        .from("orders")
        .select("id, user_id, payment, delivery_status, shipment_id, waybill")
        .eq("id", orderId);

      // Non-admin can only book their own order
      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      }

      const { data: order, error: orderErr } = await query.maybeSingle();

      if (orderErr || !order) {
        return new Response(JSON.stringify({ error: "Order not found or access denied" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If already booked, return existing info (idempotent)
      if (order.delivery_status === "Booked" && (order.shipment_id || order.waybill)) {
        return new Response(JSON.stringify({
          ok: true,
          alreadyBooked: true,
          shipment_id: order.shipment_id,
          waybill: order.waybill,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[iCarry] Booking shipment for COD/Order #${orderId} (requested by user ${user.id})...`);
      const result = await bookShipmentForOrder(supabaseAdmin, orderId);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // ADMIN-ONLY ACTIONS: label, cancel, retryBooking
    // ─────────────────────────────────────────────────────────────
    if (!isAdmin) {
      console.warn(`[iCarry] Admin access rejected for action '${action}' - userId=${user.id}, email=${user.email || 'N/A'}`);
      return new Response(JSON.stringify({ error: "Forbidden: Admin privileges required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. PRINT LABEL (Admin only)
    if (action === "label") {
      let shipmentId = payload.shipment_id;
      if (!shipmentId && payload.orderId) {
        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("shipment_id")
          .eq("id", payload.orderId)
          .maybeSingle();
        shipmentId = order?.shipment_id;
      }

      if (!shipmentId) {
        return new Response(JSON.stringify({ error: "Missing shipment_id for label printing" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await icarryCall(ENDPOINTS.label, { shipment_id: shipmentId });
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. CANCEL SHIPMENT (Admin only)
    if (action === "cancel") {
      const orderId = payload.orderId;
      const shipmentId = payload.shipment_id;

      const result = await cancelShipmentForOrder(supabaseAdmin, orderId, shipmentId);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. RETRY BOOKING (Admin only)
    if (action === "retryBooking") {
      const orderId = String(payload.orderId ?? "").trim();
      if (!orderId) {
        return new Response(JSON.stringify({ error: "Missing orderId for retryBooking" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await bookShipmentForOrder(supabaseAdmin, orderId);
      return new Response(JSON.stringify(result), {
        status: result.ok ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. PROCESS RAZORPAY REFUND (Admin only)
    if (action === "refund") {
      const orderId = String(payload.orderId ?? "").trim();
      const reason = payload.reason || "Admin initiated cancellation & refund";
      if (!orderId) {
        return new Response(JSON.stringify({ error: "Missing orderId for refund" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: order, error: orderErr } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();

      if (orderErr || !order) {
        return new Response(JSON.stringify({ error: `Order #${orderId} not found` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const paymentId = order.razorpay_payment_id || order.payment_id;
      if (!paymentId) {
        return new Response(JSON.stringify({ error: `Order #${orderId} does not have a Razorpay payment ID` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const keyId = Deno.env.get("RAZORPAY_KEY_ID") || "";
      const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET") || "";
      if (!keyId || !keySecret) {
        return new Response(JSON.stringify({ error: "Razorpay credentials not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── STEP 1: Cancel iCarry shipment BEFORE processing Razorpay refund ──
      const cancelRes = await cancelShipmentForOrder(supabaseAdmin, orderId);
      if (cancelRes?.error) {
        console.warn(`[refund] iCarry cancel notice (continuing with refund): ${cancelRes.error}`);
      } else if (cancelRes?.skipped) {
        console.log(`[refund] No active iCarry shipment for order ${orderId} — courier cancel skipped.`);
      } else {
        console.log(`[refund] iCarry shipment cancelled successfully before refund.`);
      }

      const { data: items } = await supabaseAdmin
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);

      // 2. Fetch customer address info if available
      let customerName = "";
      let customerPhone = "";
      if (order.address_id) {
        try {
          const { data: addr } = await supabaseAdmin
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

      const basicAuth = btoa(`${keyId}:${keySecret}`);
      const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reverse_all: 1,
          notes: refundNotes,
        }),
      });

      if (!rzpRes.ok) {
        const errText = await rzpRes.text();
        let errMsg = errText;
        try {
          const j = JSON.parse(errText);
          errMsg = j.error?.description || j.error?.message || errText;
        } catch { }
        return new Response(JSON.stringify({ error: `Razorpay refund failed: ${errMsg}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const refundData = await rzpRes.json();

      const updatePayload: Record<string, any> = {
        status: "Refund Completed",
        delivery_status: "Cancelled",
      };
      if (order.payment_status !== undefined) updatePayload.payment_status = "refunded";
      if (order.notes !== undefined) updatePayload.notes = order.notes ? `${order.notes} | Refunded via Razorpay (${refundData?.id})` : `Refunded via Razorpay (${refundData?.id})`;

      await supabaseAdmin.from("orders").update(updatePayload).eq("id", orderId);

      return new Response(JSON.stringify({
        success: true,
        refundId: refundData?.id,
        refund: refundData,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: "${action}"` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.error("iCarry router error:", errMsg);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
