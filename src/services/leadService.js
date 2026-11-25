// Unified Lead Submission Service (Strict Server-Only Delivery)

export async function submitLead(leadData) {
  // Нормализация телефона до строгой E.164 перед отправкой на бэкенд
  let e164Phone = (leadData.phone || '').toString().trim();
  if (e164Phone.startsWith('+')) {
    e164Phone = '+' + e164Phone.replace(/\D/g, '');
  } else {
    const rawDigits = e164Phone.replace(/\D/g, '');
    if (rawDigits.length === 11 && (rawDigits.startsWith('7') || rawDigits.startsWith('8'))) {
      e164Phone = '+7' + rawDigits.substring(1);
    } else if (rawDigits.length === 10) {
      e164Phone = '+7' + rawDigits;
    }
  }

  // 1. Sanitize payload - strictly business data, ZERO tokens or client-side credentials
  const payload = {
    id: leadData.id,
    name: leadData.name,
    phone: e164Phone,
    breakdown: leadData.breakdown,
    brand: leadData.brand,
    district: leadData.district,
    metro: leadData.metro,
    urgency: leadData.urgency,
    discount: leadData.discount,
    estimatedPrice: leadData.estimatedPrice,
    company_website: leadData.company_website || undefined,
  };

  try {
    // 2. Call serverless API endpoint (auto-routes to live backend on GitHub Pages)
    const apiUrl = import.meta.env?.VITE_API_URL || (
      typeof window !== 'undefined' && window.location.hostname.includes('github.io')
        ? 'https://moskholod-service.netlify.app/api/send-lead'
        : '/api/send-lead'
    );

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok && result.ok) {
      return {
        success: true,
        // Fail-safe fallback: never assume CONFIRMED_FULL if server omitted deliveryStatus
        deliveryStatus: result.deliveryStatus || 'CONFIRMED_SHEETS_TG_UNKNOWN',
        leadId: result.leadId || leadData.id,
        lead: result.lead || leadData,
        channels: result.channels,
        message: result.message,
      };
    }

    // Server-side refusal, conflict (409 REPAIR_REQUIRED / PAYLOAD_HASH_MISMATCH) or gateway error
    const isNonRetryableConflict = response.status === 409 || result.error === 'REPAIR_REQUIRED';
    return {
      success: false,
      status: response.status,
      error: result.error || 'DELIVERY_ERROR',
      statusDetail: result.status || null,
      retryAllowed: result.retryAllowed !== undefined ? Boolean(result.retryAllowed) : !isNonRetryableConflict,
      message: result.message || 'Сервер не смог подтвердить приём заявки.',
      channels: result.channels,
      leadId: result.leadId || leadData.id,
    };

  } catch {
    console.warn('Network error during submitLead');
    return {
      success: false,
      status: 0,
      error: 'NETWORK_ERROR',
      retryAllowed: true,
      message: 'Не удалось установить соединение с сервером. Проверьте подключение к интернету и попробуйте снова.',
      leadId: leadData.id,
    };
  }
}
