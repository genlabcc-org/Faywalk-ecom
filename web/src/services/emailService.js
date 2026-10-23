import { supabase } from '../lib/supabase';
import { getColorName } from '../utils/colorUtils';

const ADMIN_EMAIL = 'faywalkvibee@gmail.com';
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'faywalkvibee@gmail.com';
const BREVO_KEY = import.meta.env.VITE_BREVO_API_KEY || import.meta.env.BREVO_API_KEY || '';

export const emailService = {
  /**
   * Sends a minimal, professional order notification email to faywalkvibee@gmail.com via Brevo.
   * @param {Object} orderData
   * @returns {Promise<boolean>}
   */
  async sendOrderNotificationEmail(orderData) {
    try {
      const {
        orderId = 'N/A',
        customerName = 'Customer',
        customerEmail = 'N/A',
        customerPhone = 'N/A',
        paymentMethod = 'COD',
        address = {},
        items = [],
        totalPrice = 0,
        subtotal = 0,
        discount = 0,
        shippingFee = 0,
      } = orderData;

      // Format shipping address line
      const formattedAddress = typeof address === 'string'
        ? address
        : [
            address.name || customerName,
            address.mobile ? `Phone: ${address.mobile}` : null,
            address.flat ? `Address: ${address.flat}` : null,
            address.area ? address.area : null,
            address.landmark ? `Landmark: ${address.landmark}` : null,
            address.city ? `${address.city}, ${address.state || ''} - ${address.pincode || ''}` : null,
          ].filter(Boolean).join(', ');

      // Extract SKU IDs and Categories for separate rows
      const skuList = items
        .map(item => item.sku || item.sku_id || 'N/A')
        .filter((val, i, self) => self.indexOf(val) === i)
        .join(', ');

      const categoryList = items
        .map(item => item.category || item.category_name || item.categories?.name || 'N/A')
        .filter((val, i, self) => self.indexOf(val) === i)
        .join(', ');

      // Format minimal item breakdown with friendly color names
      const itemsListFormatted = items.map((item, idx) => {
        const name = item.product_name || item.name || 'Product';
        const qty = item.quantity || item.qty || 1;
        const price = item.price || 0;
        const colorLabel = item.color ? getColorName(item.color) : null;
        const specs = [
          item.size ? `Size: ${item.size}` : null,
          colorLabel ? `Color: ${colorLabel}` : null
        ].filter(Boolean).join(' | ');

        return `[${idx + 1}] ${name}${specs ? ` (${specs})` : ''}\n    • Quantity: ${qty}\n    • Unit Price: ₹${Number(price).toLocaleString('en-IN')}`;
      }).join('\n\n');

      const subject = `🛍️ [Faywalk] New Order #${orderId} (${paymentMethod}) - ₹${Number(totalPrice).toLocaleString('en-IN')}`;

      // 1. Try sending via Supabase Edge Function (send-order-email)
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke('send-order-email', {
          body: {
            adminEmail: ADMIN_EMAIL,
            brevoApiKey: BREVO_KEY,
            orderId,
            customerName,
            customerEmail,
            customerPhone,
            paymentMethod,
            address: formattedAddress,
            skuId: skuList,
            category: categoryList,
            items,
            itemsListFormatted,
            totalPrice,
            subtotal,
            discount,
            shippingFee,
          },
        });

        if (!fnError && fnData?.success) {
          console.log(`[emailService] Order notification sent via Edge Function (${fnData.provider || 'brevo'}).`);
          return true;
        }
        if (fnError) {
          console.warn('[emailService] Edge function invoke error:', fnError);
        }
      } catch (e) {
        console.warn('[emailService] Edge function attempt failed:', e);
      }

      // 2. Direct Brevo API Call fallback
      if (BREVO_KEY) {
        try {
          const itemsRowsHtml = items.map((it, idx) => {
            const name = it.product_name || it.name || 'Product';
            const qty = it.quantity || it.qty || 1;
            const price = Number(it.price) || 0;
            const lineTotal = price * qty;
            const colorLabel = it.color ? getColorName(it.color) : null;
            const variant = [
              it.size ? `Size: ${it.size}` : null,
              colorLabel ? `Color: ${colorLabel}` : null,
            ].filter(Boolean).join(' · ');

            return `
              <tr style="border-bottom: 1px solid #f1f3f5;">
                <td style="padding: 10px 8px; font-size: 13px; color: #111827; font-weight: 600;">
                  <div>${idx + 1}. ${name}</div>
                  ${variant ? `<div style="font-size: 11.5px; color: #6b7280; font-weight: 400; margin-top: 2px;">${variant}</div>` : ''}
                </td>
                <td style="padding: 10px 8px; font-size: 13px; color: #4b5563; text-align: center;">${qty}</td>
                <td style="padding: 10px 8px; font-size: 13px; color: #4b5563; text-align: right;">₹${price.toLocaleString('en-IN')}</td>
                <td style="padding: 10px 8px; font-size: 13px; color: #002277; font-weight: 700; text-align: right;">₹${lineTotal.toLocaleString('en-IN')}</td>
              </tr>
            `;
          }).join('');

          const htmlContent = `
            <!DOCTYPE html>
            <html>
            <body style="margin: 0; padding: 20px; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                <div style="background-color: #002277; padding: 22px; text-align: center; color: #ffffff;">
                  <h1 style="margin: 0; font-size: 22px;">FAYWALK</h1>
                  <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">New Order #${orderId}</p>
                </div>
                <div style="padding: 24px;">
                  <div style="background-color: #eff6ff; padding: 12px 16px; border-radius: 8px; margin-bottom: 18px; font-size: 13px; color: #1e40af;">
                    <strong>Total: ₹${Number(totalPrice).toLocaleString('en-IN')}</strong> · Payment: <strong>${paymentMethod}</strong>
                  </div>
                  <div style="background-color: #f8f9fa; padding: 14px; border-radius: 8px; margin-bottom: 18px; font-size: 13px;">
                    <div style="font-weight: 700; margin-bottom: 6px;">Customer Information:</div>
                    <div><strong>Name:</strong> ${customerName}</div>
                    <div><strong>Phone:</strong> ${customerPhone}</div>
                    <div><strong>Email:</strong> ${customerEmail}</div>
                    <div style="margin-top: 6px;"><strong>Delivery Address:</strong> ${formattedAddress}</div>
                  </div>
                  <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
                    <thead>
                      <tr style="background-color: #f1f3f5; border-bottom: 2px solid #e5e7eb;">
                        <th style="padding: 8px; font-size: 12px; text-align: left;">Item</th>
                        <th style="padding: 8px; font-size: 12px; text-align: center;">Qty</th>
                        <th style="padding: 8px; font-size: 12px; text-align: right;">Price</th>
                        <th style="padding: 8px; font-size: 12px; text-align: right;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsRowsHtml}
                    </tbody>
                  </table>
                  <div style="text-align: right; font-size: 14px; font-weight: 700; color: #002277; padding-top: 10px; border-top: 1px solid #e5e7eb;">
                    Grand Total: ₹${Number(totalPrice).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </body>
            </html>
          `;

          const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'api-key': BREVO_KEY,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              sender: {
                name: 'Faywalk',
                email: 'faywalkvibee@gmail.com',
              },
              to: [
                {
                  email: ADMIN_EMAIL,
                  name: 'Faywalk Admin',
                },
              ],
              replyTo: {
                email: customerEmail && customerEmail !== 'N/A' ? customerEmail : 'faywalkvibee@gmail.com',
                name: customerName,
              },
              subject,
              htmlContent,
            }),
          });

          if (brevoRes.ok) {
            console.log(`[emailService] Order email sent directly via Brevo for #${orderId}`);
            return true;
          } else {
            const brevoErr = await brevoRes.json().catch(() => ({}));
            console.warn('[emailService] Direct Brevo response error:', brevoErr);
          }
        } catch (err) {
          console.warn('[emailService] Direct Brevo attempt error:', err);
        }
      }

      // 3. Fallback to FormSubmit
      console.log(`[emailService] Using FormSubmit fallback for order #${orderId}...`);
      const formSubmitPayload = {
        _subject: subject,
        _template: 'table',
        _captcha: 'false',
        'Order Number': `#${orderId}`,
        'Payment Method': paymentMethod,
        'Customer Name': customerName,
        'Customer Email': customerEmail,
        'Customer Phone': customerPhone,
        'Shipping Address': formattedAddress || 'N/A',
        'SKU': skuList || 'N/A',
        'Category': categoryList || 'N/A',
        'Order Breakdown': itemsListFormatted || 'N/A',
        'Subtotal': `₹${Number(subtotal).toLocaleString('en-IN')}`,
        'Discount': discount > 0 ? `-₹${Number(discount).toLocaleString('en-IN')}` : '₹0',
        'Shipping': shippingFee > 0 ? `₹${Number(shippingFee).toLocaleString('en-IN')}` : 'Free',
        'Total Amount': `₹${Number(totalPrice).toLocaleString('en-IN')}`,
      };

      const response = await fetch(`https://formsubmit.co/ajax/${ADMIN_EMAIL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(formSubmitPayload),
      });

      if (response.ok) {
        console.log('[emailService] FormSubmit fallback email dispatched to', ADMIN_EMAIL);
        return true;
      }
    } catch (err) {
      console.error('[emailService] Failed to send order notification email:', err);
    }
    return false;
  },

  /**
   * Sends a contact inquiry email to jreshma930@gmail.com via Brevo.
   * Multi-tier delivery:
   * 1. Direct Brevo API call with BREVO_KEY
   * 2. Supabase Edge Function ('send-contact-email')
   * 3. FormSubmit fallback
   *
   * @param {Object} contactData
   * @param {string} contactData.firstName
   * @param {string} contactData.lastName
   * @param {string} contactData.phone
   * @param {string} contactData.email
   * @param {string} contactData.message
   * @returns {Promise<{ success: boolean, provider?: string, error?: string }>}
   */
  async sendContactUsEmail(contactData) {
    try {
      const {
        firstName = '',
        lastName = '',
        phone = '',
        email = '',
        message = '',
      } = contactData || {};

      if (!email || !message) {
        return { success: false, error: 'Email and message are required.' };
      }

      const fullName = `${firstName} ${lastName}`.trim() || 'Website Visitor';
      const targetEmail = CONTACT_EMAIL;
      const dateStr = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      const subject = `📩 [Faywalk Contact] New Inquiry from ${fullName}`;

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>New Contact Inquiry - ${fullName}</title>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb;">
            <div style="background-color: #002277; padding: 26px 28px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 2px;">FAYWALK</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #93c5fd; letter-spacing: 0.5px; text-transform: uppercase;">
                Contact Us Inquiry
              </p>
            </div>
            <div style="padding: 28px 24px;">
              <div style="background-color: #f0f7ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px 18px; margin-bottom: 22px;">
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #1e40af; font-weight: 700; margin-bottom: 4px;">
                  New Message Received
                </div>
                <div style="font-size: 16px; font-weight: 700; color: #002277;">
                  ${fullName}
                </div>
                <div style="font-size: 12.5px; color: #64748b; margin-top: 2px;">
                  Received: ${dateStr}
                </div>
              </div>

              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13.5px;">
                <tr style="border-bottom: 1px solid #f1f3f5;">
                  <td style="padding: 10px 0; color: #6b7280; width: 120px; font-weight: 500;">Full Name:</td>
                  <td style="padding: 10px 0; color: #111827; font-weight: 600;">${fullName}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f3f5;">
                  <td style="padding: 10px 0; color: #6b7280; font-weight: 500;">Email:</td>
                  <td style="padding: 10px 0; color: #002277; font-weight: 600;">
                    <a href="mailto:${email}" style="color: #002277; text-decoration: none;">${email}</a>
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f3f5;">
                  <td style="padding: 10px 0; color: #6b7280; font-weight: 500;">Phone:</td>
                  <td style="padding: 10px 0; color: #111827; font-weight: 600;">
                    ${phone ? `<a href="tel:${phone}" style="color: #111827; text-decoration: none;">${phone}</a>` : '<span style="color: #9ca3af;">Not provided</span>'}
                  </td>
                </tr>
              </table>

              <div style="margin-bottom: 24px;">
                <div style="font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Message:
                </div>
                <div style="background-color: #f9fafb; border-left: 4px solid #002277; border-radius: 4px; padding: 16px 18px; font-size: 14px; line-height: 1.6; color: #1f2937; white-space: pre-wrap;">
${message}
                </div>
              </div>

              <div style="text-align: center; margin: 26px 0 10px;">
                <a href="mailto:${email}?subject=Re:%20Your%20inquiry%20to%20Faywalk"
                   style="display: inline-block; background-color: #002277; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">
                  Reply to ${fullName}
                </a>
              </div>

              <div style="padding-top: 20px; border-top: 1px solid #f1f3f5; text-align: center; color: #9ca3af; font-size: 11.5px;">
                Submitted via Faywalk Contact Us form (faywalk.com).
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `New Contact Form Inquiry\nName: ${fullName}\nEmail: ${email}\nPhone: ${phone}\nDate: ${dateStr}\n\nMessage:\n${message}`;

      // 1. Direct Brevo API Call
      if (BREVO_KEY) {
        try {
          const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'api-key': BREVO_KEY,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              sender: {
                name: 'Faywalk Contact Form',
                email: 'faywalkvibee@gmail.com',
              },
              to: [
                {
                  email: targetEmail,
                  name: 'Reshma',
                },
              ],
              replyTo: {
                email: email,
                name: fullName,
              },
              subject,
              htmlContent,
              textContent,
            }),
          });

          if (brevoRes.ok) {
            console.log(`[emailService] Contact email sent directly via Brevo to ${targetEmail}`);
            return { success: true, provider: 'brevo' };
          } else {
            const errJson = await brevoRes.json().catch(() => ({}));
            console.warn('[emailService] Direct Brevo response error:', errJson);
          }
        } catch (err) {
          console.warn('[emailService] Direct Brevo attempt failed:', err);
        }
      }

      // 2. Try Supabase Edge Function
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke('send-contact-email', {
          body: {
            recipientEmail: targetEmail,
            brevoApiKey: BREVO_KEY,
            firstName,
            lastName,
            phone,
            email,
            message,
          },
        });

        if (!fnError && fnData?.success) {
          console.log(`[emailService] Contact email sent via Edge Function (${fnData.provider || 'brevo'}).`);
          return { success: true, provider: fnData.provider || 'edge-function' };
        }
        if (fnError) {
          console.warn('[emailService] Edge function invoke error:', fnError);
        }
      } catch (e) {
        console.warn('[emailService] Edge function attempt failed:', e);
      }

      // 3. Fallback to FormSubmit
      try {
        console.log(`[emailService] Using FormSubmit fallback for contact inquiry to ${targetEmail}...`);
        const formSubmitPayload = {
          _subject: subject,
          _template: 'table',
          _captcha: 'false',
          'Full Name': fullName,
          'Email': email,
          'Phone': phone || 'N/A',
          'Message': message,
          'Submitted At': dateStr,
        };

        const response = await fetch(`https://formsubmit.co/ajax/${targetEmail}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(formSubmitPayload),
        });

        if (response.ok) {
          console.log('[emailService] FormSubmit fallback email dispatched to', targetEmail);
          return { success: true, provider: 'formsubmit' };
        }
      } catch (fsErr) {
        console.warn('[emailService] FormSubmit fallback error:', fsErr);
      }

      return { success: false, error: 'Failed to send contact inquiry' };
    } catch (err) {
      console.error('[emailService] Failed to send contact email:', err);
      return { success: false, error: err.message };
    }
  },
};
