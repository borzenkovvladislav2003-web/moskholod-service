// Unified Lead Submission Service

export async function submitLead(leadData) {
  // 1. Get any custom testing overrides from localStorage
  const tgToken = localStorage.getItem('sergey_tg_token');
  const tgChatId = localStorage.getItem('sergey_tg_chat_id');
  const sheetsUrl = localStorage.getItem('sergey_sheets_url');

  const payload = {
    ...leadData,
    tgToken: tgToken || undefined,
    tgChatId: tgChatId || undefined,
    sheetsWebhookUrl: sheetsUrl || undefined,
  };

  try {
    // 2. Call serverless Netlify function
    const response = await fetch('/api/send-lead', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const result = await response.json();
      return { success: true, lead: result.lead || leadData, fromServer: true };
    } else {
      console.warn('Server responded with error:', response.status);
    }
  } catch (err) {
    console.warn('Network or server error during submitLead, using fallback:', err);
  }

  // 3. Fallback: Direct Client-Side Telegram (if credentials stored locally)
  if (tgToken && tgChatId) {
    try {
      const text = 
        `🚨 <b>НОВЫЙ ЛИД (КЛИЕНТ-ФОЛЛБЕК): РЕМОНТ ХОЛОДИЛЬНИКА</b>\n\n` +
        `👤 <b>Имя:</b> ${leadData.name}\n` +
        `📞 <b>Телефон:</b> <code>${leadData.phone}</code>\n` +
        `❄️ <b>Марка:</b> ${leadData.brand}\n` +
        `🔧 <b>Поломка:</b> ${leadData.breakdown}\n` +
        `📍 <b>Район:</b> ${leadData.district} ${leadData.metro ? `(${leadData.metro})` : ''}\n` +
        `🕒 <b>Срочность:</b> ${leadData.urgency}\n` +
        `🏷 <b>Скидка:</b> ${leadData.discount}\n` +
        `🆔 <b>ID:</b> ${leadData.id}`;

      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: tgChatId,
          text: text,
          parse_mode: 'HTML',
        }),
      });
    } catch (e) {
      console.warn('Client Telegram fallback error:', e);
    }
  }

  return { success: true, lead: leadData, fromServer: false };
}
