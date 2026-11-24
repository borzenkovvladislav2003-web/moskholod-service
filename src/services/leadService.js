// Unified Lead Submission Service (Strict Server-Only Delivery)

export async function submitLead(leadData) {
  // 1. Sanitize payload - strictly business data, ZERO tokens or client-side credentials
  const payload = {
    id: leadData.id,
    name: leadData.name,
    phone: leadData.phone,
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
    const apiUrl = import.meta.env.VITE_API_URL || (
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
        deliveryStatus: result.deliveryStatus || 'CONFIRMED_FULL',
        leadId: result.leadId || leadData.id,
        lead: result.lead || leadData,
        channels: result.channels,
      };
    }

    // Server-side refusal or channel failure
    return {
      success: false,
      status: response.status,
      error: result.error || 'DELIVERY_ERROR',
      message: result.message || 'Сервер не смог подтвердить доставку заявки.',
      channels: result.channels,
      leadId: result.leadId || leadData.id,
    };

  } catch (err) {
    console.warn('Network error during submitLead:', err);
    return {
      success: false,
      error: 'NETWORK_ERROR',
      message: 'Не удалось установить соединение с сервером. Пожалуйста, проверьте подключение к интернету.',
      leadId: leadData.id,
    };
  }
}
