// Netlify Serverless Function: send-lead
// Processes new leads, validates data, sends alerts to Telegram & Google Sheets

export default async (req, context) => {
  // 1. CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, error: 'Method Not Allowed' }), 
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const data = await req.json();

    // 2. Anti-spam Honeypot Check
    if (data.company_website || data.bot_field) {
      console.warn('Bot submission blocked via honeypot:', data);
      return new Response(
        JSON.stringify({ ok: true, leadId: 'REQ-SPAM', status: 'filtered' }), 
        { status: 200, headers: corsHeaders }
      );
    }

    // 3. Data Validation
    const name = (data.name || '').trim();
    const rawPhone = (data.phone || '').replace(/\D/g, '');

    if (!rawPhone || rawPhone.length < 10) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Некорректный номер телефона' }), 
        { status: 400, headers: corsHeaders }
      );
    }

    // Normalize phone format
    let cleanPhone = rawPhone;
    if (cleanPhone.length === 10) cleanPhone = '7' + cleanPhone;
    if (cleanPhone.startsWith('8') && cleanPhone.length === 11) {
      cleanPhone = '7' + cleanPhone.substring(1);
    }

    const leadId = data.id || `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const formattedDate = now.toLocaleDateString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      timeZone: 'Europe/Moscow' 
    });
    const formattedTime = now.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Europe/Moscow' 
    });

    const lead = {
      id: leadId,
      name: name || 'Не указано',
      phone: data.phone || `+${cleanPhone}`,
      cleanPhone: cleanPhone,
      breakdown: data.breakdown || 'Диагностика',
      brand: data.brand || 'Не указана',
      district: data.district || 'Москва',
      metro: data.metro || '',
      urgency: data.urgency || 'Срочно',
      discount: data.discount || '15%',
      estimatedPrice: data.estimatedPrice || 'от 1 350 ₽',
      date: formattedDate,
      time: formattedTime,
      source: data.source || 'Квиз-калькулятор (Москва)',
      createdAt: now.toISOString(),
    };

    // 4. Server-Side Channel Delivery (ONLY via process.env - NEVER from client payload)
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    const tgChatId = process.env.TELEGRAM_CHAT_ID;
    const sheetsUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

    const tgConfigured = Boolean(tgToken && tgChatId);
    const sheetsConfigured = Boolean(sheetsUrl);

    // If no notification channel is configured on server:
    if (!tgConfigured && !sheetsConfigured) {
      console.warn('send-lead: No delivery channels configured (missing TELEGRAM_BOT_TOKEN/CHAT_ID and GOOGLE_SHEETS_WEBHOOK_URL)');
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'CHANNELS_NOT_CONFIGURED',
          message: 'Серверные каналы оповещения (Telegram / Google Sheets) ещё не подключены.',
          leadId: lead.id,
          channels: {
            telegram: { configured: false, sent: false },
            sheets: { configured: false, sent: false }
          }
        }), 
        { status: 503, headers: corsHeaders }
      );
    }

    let tgSent = false;
    let tgError = null;

    if (tgConfigured) {
      try {
        const text = 
          `🚨 <b>НОВЫЙ ЛИД: РЕМОНТ ХОЛОДИЛЬНИКА</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `👤 <b>Клиент:</b> ${lead.name}\n` +
          `📞 <b>Телефон:</b> <code>${lead.phone}</code>\n` +
          `❄️ <b>Марка:</b> <b>${lead.brand}</b>\n` +
          `🔧 <b>Поломка:</b> ${lead.breakdown}\n` +
          `📍 <b>Район:</b> ${lead.district}${lead.metro ? ` (м. ${lead.metro})` : ''}\n` +
          `🕒 <b>Срочность:</b> ${lead.urgency}\n` +
          `🏷 <b>Скидка:</b> ${lead.discount} (оценка: ${lead.estimatedPrice})\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `🆔 <b>ID заявки:</b> <code>${lead.id}</code>\n` +
          `⏱ <b>Время:</b> ${lead.date} ${lead.time} (МСК)\n` +
          `⚡ <b>Регламент: перезвонить за 5 минут!</b>`;

        const tgPayload = {
          chat_id: tgChatId,
          text: text,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { 
                  text: '💬 Написать в WhatsApp', 
                  url: `https://wa.me/${lead.cleanPhone}?text=${encodeURIComponent(`Здравствуйте, ${lead.name}! Вы оставляли заявку на ремонт холодильника ${lead.brand}.`)}` 
                }
              ]
            ]
          }
        };

        const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tgPayload)
        });

        const tgResult = await tgRes.json();
        tgSent = tgResult.ok === true;
        if (!tgSent) {
          tgError = tgResult.description || 'Telegram API returned non-ok status';
        }
      } catch (err) {
        tgError = err.message;
      }
    }

    // 5. Send to Google Sheets (if Webhook URL configured on server)
    let sheetsSent = false;
    let sheetsError = null;

    if (sheetsConfigured) {
      try {
        const sheetRes = await fetch(sheetsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lead),
        });
        sheetsSent = sheetRes.ok;
        if (!sheetsSent) {
          sheetsError = `Google Sheets HTTP ${sheetRes.status}`;
        }
      } catch (err) {
        sheetsError = err.message;
        console.warn('Sheets webhook error:', err);
      }
    }

    // 6. Delivery confirmation evaluation
    // If configured channels completely failed to deliver:
    const anySent = tgSent || sheetsSent;
    if (!anySent) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'DELIVERY_FAILED',
          message: 'Не удалось доставить уведомление о заявке ни по одному из настроенных каналов.',
          leadId: lead.id,
          channels: {
            telegram: { configured: tgConfigured, sent: tgSent, error: tgError },
            sheets: { configured: sheetsConfigured, sent: sheetsSent, error: sheetsError }
          }
        }), 
        { status: 502, headers: corsHeaders }
      );
    }

    // Partial vs full success
    const isFull = (!tgConfigured || tgSent) && (!sheetsConfigured || sheetsSent);

    return new Response(
      JSON.stringify({
        ok: true,
        deliveryStatus: isFull ? 'CONFIRMED_FULL' : 'CONFIRMED_PARTIAL',
        leadId: lead.id,
        lead: lead,
        channels: {
          telegram: { configured: tgConfigured, sent: tgSent, error: tgError },
          sheets: { configured: sheetsConfigured, sent: sheetsSent, error: sheetsError }
        }
      }), 
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('send-lead error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal Server Error', details: error.message }), 
      { status: 500, headers: corsHeaders }
    );
  }
};
