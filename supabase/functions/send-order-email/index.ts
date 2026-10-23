import { handleCorsPreflight, corsHeaders } from "../_shared/cors.ts";

const ADMIN_EMAIL = "faywalkvibee@gmail.com";

function buildHtmlTemplate(data: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod: string;
  address: string;
  items: Array<{
    product_name?: string;
    name?: string;
    sku?: string;
    category?: string;
    size?: string;
    color?: string;
    quantity?: number;
    qty?: number;
    price?: number;
    image_url?: string;
  }>;
  itemsListFormatted: string;
  totalPrice: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
}) {
  const {
    orderId,
    customerName,
    customerEmail,
    customerPhone,
    paymentMethod,
    address,
    items,
    totalPrice,
    subtotal,
    discount,
    shippingFee,
  } = data;

  const orderDateStr = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const isCod = String(paymentMethod).toUpperCase().includes("COD") ||
    String(paymentMethod).toUpperCase().includes("CASH");

  const itemsHtml = (items && items.length > 0)
    ? items
        .map((it, idx) => {
          const name = it.product_name || it.name || "Product";
          const qty = it.quantity || it.qty || 1;
          const price = Number(it.price) || 0;
          const lineTotal = price * qty;
          const sku = it.sku || "N/A";
          const variant = [
            it.size ? `Size: ${it.size}` : null,
            it.color ? `Color: ${it.color}` : null,
          ].filter(Boolean).join(" · ");

          return `
            <tr style="border-bottom: 1px solid #f1f3f5;">
              <td style="padding: 12px 8px; font-size: 13px; color: #111827; font-weight: 600;">
                <div>${idx + 1}. ${name}</div>
                ${variant ? `<div style="font-size: 11.5px; color: #6b7280; font-weight: 400; margin-top: 2px;">${variant}</div>` : ""}
                ${sku !== "N/A" ? `<div style="font-size: 11px; color: #9ca3af; font-weight: 500; margin-top: 1px;">SKU: ${sku}</div>` : ""}
              </td>
              <td style="padding: 12px 8px; font-size: 13px; color: #4b5563; text-align: center;">${qty}</td>
              <td style="padding: 12px 8px; font-size: 13px; color: #4b5563; text-align: right;">₹${price.toLocaleString("en-IN")}</td>
              <td style="padding: 12px 8px; font-size: 13px; color: #002277; font-weight: 700; text-align: right;">₹${lineTotal.toLocaleString("en-IN")}</td>
            </tr>
          `;
        })
        .join("")
    : `
      <tr>
        <td colspan="4" style="padding: 12px; font-size: 13px; color: #4b5563; white-space: pre-wrap;">
          ${data.itemsListFormatted || "No item breakdown provided"}
        </td>
      </tr>
    `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Order Notification #${orderId}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827;">
  <div style="max-width: 620px; margin: 24px auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);">
    
    <!-- Header -->
    <div style="background-color: #002277; padding: 26px 28px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">FAYWALK</h1>
      <p style="margin: 6px 0 0; font-size: 13.5px; opacity: 0.9;">New Customer Order Notification</p>
    </div>

    <!-- Alert Bar -->
    <div style="background-color: #eff6ff; padding: 14px 28px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #dbeafe;">
      <div style="font-size: 13px; color: #1e40af; font-weight: 600;">
        Order ID: <strong style="color: #002277;">#${orderId}</strong>
      </div>
      <div style="font-size: 12px; color: #3b82f6;">
        ${orderDateStr}
      </div>
    </div>

    <div style="padding: 24px 28px;">
      
      <!-- Key Status Badges -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 10px 14px; background-color: #f8f9fa; border-radius: 8px; width: 48%; vertical-align: top;">
            <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 700; letter-spacing: 0.5px;">Payment Method</div>
            <div style="font-size: 14px; font-weight: 700; color: ${isCod ? "#d97706" : "#16a34a"}; margin-top: 4px;">
              ${paymentMethod}
            </div>
          </td>
          <td style="width: 4%;"></td>
          <td style="padding: 10px 14px; background-color: #f8f9fa; border-radius: 8px; width: 48%; vertical-align: top;">
            <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 700; letter-spacing: 0.5px;">Order Total</div>
            <div style="font-size: 16px; font-weight: 800; color: #002277; margin-top: 2px;">
              ₹${Number(totalPrice).toLocaleString("en-IN")}
            </div>
          </td>
        </tr>
      </table>

      <!-- Customer Information -->
      <div style="background-color: #f8f9fa; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px; font-size: 13.5px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 0.5px;">Customer Details</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 3px 0; color: #6b7280; width: 90px;">Name:</td>
            <td style="padding: 3px 0; font-weight: 600; color: #111827;">${customerName}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #6b7280;">Phone:</td>
            <td style="padding: 3px 0; font-weight: 600; color: #111827;">
              <a href="tel:${customerPhone}" style="color: #002277; text-decoration: none;">${customerPhone}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #6b7280;">Email:</td>
            <td style="padding: 3px 0; color: #111827;">
              <a href="mailto:${customerEmail}" style="color: #002277; text-decoration: none;">${customerEmail}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 4px 0 0; color: #6b7280; vertical-align: top;">Address:</td>
            <td style="padding: 4px 0 0; color: #374151; line-height: 1.45;">${address}</td>
          </tr>
        </table>
      </div>

      <!-- Items Table -->
      <h3 style="margin: 0 0 10px; font-size: 13.5px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 0.5px;">Order Items</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f1f3f5; border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 8px; font-size: 12px; font-weight: 700; color: #4b5563; text-align: left;">Product</th>
            <th style="padding: 8px; font-size: 12px; font-weight: 700; color: #4b5563; text-align: center; width: 45px;">Qty</th>
            <th style="padding: 8px; font-size: 12px; font-weight: 700; color: #4b5563; text-align: right; width: 75px;">Rate</th>
            <th style="padding: 8px; font-size: 12px; font-weight: 700; color: #4b5563; text-align: right; width: 85px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Totals Summary -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
        <tr>
          <td style="padding: 4px 0; color: #6b7280;">Subtotal:</td>
          <td style="padding: 4px 0; text-align: right; color: #374151; font-weight: 500;">₹${Number(subtotal).toLocaleString("en-IN")}</td>
        </tr>
        ${discount > 0 ? `
        <tr>
          <td style="padding: 4px 0; color: #059669;">Discount:</td>
          <td style="padding: 4px 0; text-align: right; color: #059669; font-weight: 600;">-₹${Number(discount).toLocaleString("en-IN")}</td>
        </tr>` : ""}
        <tr>
          <td style="padding: 4px 0; color: #6b7280;">Shipping Fee:</td>
          <td style="padding: 4px 0; text-align: right; color: #374151; font-weight: 500;">
            ${shippingFee > 0 ? `₹${Number(shippingFee).toLocaleString("en-IN")}` : `<span style="color: #059669; font-weight: 600;">Free</span>`}
          </td>
        </tr>
        <tr style="border-top: 2px solid #e5e7eb;">
          <td style="padding: 8px 0; font-size: 15px; font-weight: 700; color: #111827;">Grand Total:</td>
          <td style="padding: 8px 0; text-align: right; font-size: 17px; font-weight: 800; color: #002277;">
            ₹${Number(totalPrice).toLocaleString("en-IN")}
          </td>
        </tr>
      </table>

      <!-- Footer Note -->
      <div style="padding-top: 16px; border-top: 1px solid #f1f3f5; text-align: center; color: #9ca3af; font-size: 12px;">
        This is an automated order notification sent to Faywalk Admin.<br />
        Manage this order in your admin dashboard at <a href="https://faywalk.com/admin/orders" style="color: #002277; text-decoration: none;">faywalk.com/admin/orders</a>.
      </div>

    </div>
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCorsPreflight(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json();
    const {
      adminEmail = ADMIN_EMAIL,
      orderId = "N/A",
      customerName = "Customer",
      customerEmail = "N/A",
      customerPhone = "N/A",
      paymentMethod = "COD",
      address = "N/A",
      skuId = "N/A",
      category = "N/A",
      items = [],
      itemsListFormatted = "N/A",
      totalPrice = 0,
      subtotal = 0,
      discount = 0,
      shippingFee = 0,
    } = body;

    const brevoApiKey = Deno.env.get("BREVO_API_KEY") || body.brevoApiKey || "";

    const subject = `🛍️ [Faywalk] New Order #${orderId} (${paymentMethod}) - ₹${Number(totalPrice).toLocaleString("en-IN")}`;
    const htmlContent = buildHtmlTemplate({
      orderId,
      customerName,
      customerEmail,
      customerPhone,
      paymentMethod,
      address,
      items,
      itemsListFormatted,
      totalPrice,
      subtotal,
      discount,
      shippingFee,
    });

    const textContent = `New Order #${orderId}\nCustomer: ${customerName} (${customerPhone})\nAmount: ₹${totalPrice}\nPayment: ${paymentMethod}\nAddress: ${address}\n\n${itemsListFormatted}`;

    let brevoSuccess = false;
    let brevoResult: unknown = null;
    let brevoError: string | null = null;

    // 1. Attempt sending via Brevo Transactional Email API
    if (brevoApiKey) {
      try {
        const brevoPayload = {
          sender: {
            name: "Faywalk",
            email: "faywalkvibee@gmail.com",
          },
          to: [
            {
              email: adminEmail,
              name: "Faywalk Admin",
            },
          ],
          replyTo: {
            email: customerEmail && customerEmail !== "N/A" ? customerEmail : "faywalkvibee@gmail.com",
            name: customerName,
          },
          subject,
          htmlContent,
          textContent,
        };

        const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": brevoApiKey,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(brevoPayload),
        });

        brevoResult = await brevoRes.json().catch(() => ({}));
        if (brevoRes.ok) {
          brevoSuccess = true;
          console.log(`[Brevo] Order email successfully sent for #${orderId} to ${adminEmail}`);
        } else {
          brevoError = typeof brevoResult === "object" && brevoResult !== null
            ? JSON.stringify(brevoResult)
            : String(brevoResult);
          console.warn(`[Brevo] API returned error:`, brevoError);
        }
      } catch (err) {
        brevoError = err instanceof Error ? err.message : String(err);
        console.warn(`[Brevo] Network/Dispatch error:`, brevoError);
      }
    }

    if (brevoSuccess) {
      return new Response(
        JSON.stringify({
          success: true,
          provider: "brevo",
          recipient: adminEmail,
          result: brevoResult,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Brevo failed or was unavailable
    console.warn(`[send-order-email] Brevo dispatch failed for #${orderId}:`, brevoError);
    return new Response(
      JSON.stringify({
        success: false,
        provider: "brevo",
        error: brevoError || "Failed to deliver email via Brevo",
        recipient: adminEmail,
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
