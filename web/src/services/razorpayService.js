import { supabase } from '../lib/supabase';

async function extractEdgeError(error) {
  if (!error) return 'Unknown error';
  let msg = error.message;
  if (error.context && typeof error.context.json === 'function') {
    try {
      const b = await error.context.json();
      if (b?.error) return b.error;
      if (b?.message) return b.message;
    } catch {}
  }
  if (error.context && typeof error.context.text === 'function') {
    try {
      const t = await error.context.text();
      if (t) {
        try {
          const j = JSON.parse(t);
          if (j?.error) return j.error;
          if (j?.message) return j.message;
        } catch {
          return t;
        }
      }
    } catch {}
  }
  return msg || String(error);
}

export const razorpayService = {
  /**
   * Refunds a payment for an order via Razorpay using secure Supabase backend Edge Functions.
   * @param {string} orderId 
   * @param {string} [reason]
   * @returns {Promise<{ success: boolean, refundId?: string, error?: string }>}
   */
  async refundOrder(orderId, reason = 'Admin initiated order cancellation & refund', extraNotes = {}) {
    if (!orderId) throw new Error('Missing orderId for refund');

    let lastError = null;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // 1. Primary: Invoke razorpay edge function
    try {
      const { data, error } = await supabase.functions.invoke('razorpay', {
        body: {
          action: 'refund_order',
          orderId,
          reason,
          extraNotes,
        },
        headers,
      });

      if (!error && data?.success) {
        return data;
      }

      if (error) {
        const errMsg = await extractEdgeError(error);
        lastError = new Error(errMsg);
        console.warn('razorpay edge function refund error, trying fallback:', errMsg);
      } else if (data?.error) {
        lastError = new Error(data.error);
      }
    } catch (err) {
      lastError = err;
      console.warn('razorpay edge function invocation exception:', err);
    }

    // 2. Secondary fallback: Invoke icarry edge function (running with full admin service-role)
    try {
      const { data, error } = await supabase.functions.invoke('icarry', {
        body: {
          action: 'refund',
          payload: {
            orderId,
            reason,
            extraNotes,
          },
        },
        headers,
      });

      if (!error && data?.success) {
        return data;
      }

      if (error) {
        const errMsg = await extractEdgeError(error);
        throw new Error(errMsg);
      }

      if (data?.error) {
        throw new Error(data.error);
      }
    } catch (fallbackErr) {
      console.error('Secondary refund fallback error:', fallbackErr);
      throw (lastError || fallbackErr);
    }

    throw (lastError || new Error('Failed to process Razorpay refund'));
  },
};
