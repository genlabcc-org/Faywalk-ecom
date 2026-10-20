import { supabase } from '../lib/supabase';

const invoke = async (action, payload) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const { data, error } = await supabase.functions.invoke('icarry', {
    body: { action, payload },
    headers,
  });
  if (error) {
    let msg = error.message;
    if (error.context && typeof error.context.json === 'function') {
      try {
        const body = await error.context.json();
        if (body?.error) msg = body.error;
        else if (body?.message) msg = body.message;
      } catch {}
    } else if (error.context && typeof error.context.text === 'function') {
      try {
        const text = await error.context.text();
        if (text) {
          try {
            const body = JSON.parse(text);
            if (body?.error) msg = body.error;
            else if (body?.message) msg = body.message;
          } catch {
            msg = text;
          }
        }
      } catch {}
    }
    const err = new Error(msg);
    err.original = error;
    throw err;
  }
  return data;
};

export const icarryService = {
  checkPincode: (pincode) => invoke('pincode', { pincode: String(pincode) }),
  track:        (orderId) => invoke('track', { orderId }),
  label:        (orderId) => invoke('label', { orderId }),
  cancel:       (orderId) => invoke('cancel', { orderId }),
  retryBooking: (orderId) => invoke('retryBooking', { orderId }),
};
