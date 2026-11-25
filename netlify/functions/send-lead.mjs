// Netlify Serverless Function: send-lead (v2.3 Production Pilot — Hardened)
// Two-phase commit lead ingestion:
// Phase 1: record_and_claim_lead with RFC 8785 canonical JSON & HMAC-SHA256 signature
// Phase 2: Telegram Bot API delivery & confirm_tg status reconciliation in FSM

import crypto from 'node:crypto';

// ============================================================================
// CANONICAL SERIALIZATION & CRYPTO UTILITIES (RFC 8785 COMPATIBLE)
// ============================================================================

const VALID_LEAD_ID_REGEX = /^[A-Za-z0-9_\-]+$/;
const E164_REGEX = /^\+[1-9]\d{7,14}$/;
const VALID_TG_MESSAGE_ID_REGEX = /^[1-9]\d{0,19}$/;

export function buildCanonicalJsonString(val) {
  if (val === null) return 'null';
  if (val === undefined) return undefined;

  const t = typeof val;
  if (t === 'number') {
    if (!Number.isFinite(val)) return 'null';
    return JSON.stringify(val);
  }
  if (t === 'boolean' || t === 'string') {
    return JSON.stringify(val);
  }

  if (Array.isArray(val)) {
    const items = val.map((item) => {
      const res = buildCanonicalJsonString(item);
      return res === undefined ? 'null' : res;
    });
    return '[' + items.join(',') + ']';
  }

  if (t === 'object') {
    const sortedKeys = Object.keys(val).sort();
    const pairs = [];
    for (const k of sortedKeys) {
      const v = val[k];
      if (v !== undefined && typeof v !== 'function' && typeof v !== 'symbol') {
        const serialized = buildCanonicalJsonString(v);
        if (serialized !== undefined) {
          pairs.push(JSON.stringify(k) + ':' + serialized);
        }
      }
    }
    return '{' + pairs.join(',') + '}';
  }

  return JSON.stringify(val);
}

export function normalizePayloadToCanonicalString(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') {
    try {
      return buildCanonicalJsonString(JSON.parse(payload));
    } catch {
      return payload.trim();
    }
  }
  return buildCanonicalJsonString(payload);
}

export function buildCanonicalSignString(data) {
  const auth = data.auth || {};
  const envelope = {
    action: (data.action || '').toString().trim(),
    errorMessage: (data.errorMessage || '').toString().trim(),
    leadId: (data.leadId || '').toString().trim(),
    messageId: data.messageId !== undefined && data.messageId !== null ? data.messageId.toString().trim() : '',
    nonce: (auth.nonce || '').toString().trim(),
    notes: (data.notes || '').toString().trim(),
    payload: normalizePayloadToCanonicalString(data.payload),
    payloadHash: (data.payloadHash || '').toString().trim(),
    resolution: (data.resolution || '').toString().trim(),
    statusTokenHash: (data.statusTokenHash || '').toString().trim(),
    tgStatus: (data.tgStatus || '').toString().trim(),
    timestamp: auth.timestamp !== undefined && auth.timestamp !== null ? auth.timestamp.toString().trim() : ''
  };
  return buildCanonicalJsonString(envelope);
}

export function sha256Hex(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

export function hmacHex(text, secret) {
  return crypto.createHmac('sha256', secret).update(text, 'utf8').digest('hex');
}

export function sanitizeErrorText(errOrMsg, secrets = []) {
  if (!errOrMsg) return '';
  let msg = typeof errOrMsg === 'string' ? errOrMsg : (errOrMsg.message || 'Unknown error');

  // Redact any Telegram API URLs and bot<id>:<secret> patterns
  msg = msg.replace(/https?:\/\/api\.telegram\.org\/[^\s"']*/gi, 'https://api.telegram.org/bot[REDACTED]');
  msg = msg.replace(/bot\d+:[A-Za-z0-9_\-]+/gi, 'bot[REDACTED]');
  msg = msg.replace(/\/bot[^/\s"']+\//gi, '/bot[REDACTED]/');

  for (const sec of secrets) {
    if (sec && typeof sec === 'string' && sec.length >= 4) {
      msg = msg.split(sec).join('[REDACTED]');
    }
  }

  return msg.trim().slice(0, 300);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// NETLIFY FUNCTION HANDLER
// ============================================================================

export default async (req, context) => {
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
      JSON.stringify({ ok: false, error: 'METHOD_NOT_ALLOWED', message: 'Method Not Allowed' }),
      { status: 405, headers: corsHeaders }
    );
  }

  const sheetsUrl = (process.env.GOOGLE_SHEETS_WEBHOOK_URL || '').trim();
  const hmacSecret = (process.env.HMAC_SECRET || '').trim();
  const tgToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const tgChatId = (process.env.TELEGRAM_CHAT_ID || '').trim();
  const knownSecrets = [hmacSecret, tgToken, sheetsUrl].filter(Boolean);

  const sheetsTimeoutMs = Math.max(50, Number(process.env.SHEETS_FETCH_TIMEOUT_MS) || 4500);
  const tgTimeoutMs = Math.max(50, Number(process.env.TELEGRAM_FETCH_TIMEOUT_MS) || 3000);
  const confirmTimeoutMs = Math.max(50, Number(process.env.CONFIRM_FETCH_TIMEOUT_MS) || 2000);

  try {
    let data = null;
    try {
      data = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'INVALID_JSON',
          message: 'Некорректный формат JSON в запросе.'
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'BAD_REQUEST',
          message: 'Тело запроса должно быть JSON-объектом.'
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Anti-spam Honeypot Check
    if (data.company_website || data.bot_field) {
      console.warn('send-lead: Bot submission blocked via honeypot');
      return new Response(
        JSON.stringify({ ok: true, leadId: 'REQ-SPAM', status: 'filtered' }),
        { status: 200, headers: corsHeaders }
      );
    }

    // 2. Phone Format Validation (Strict E.164: ^\+[1-9]\d{7,14}$)
    const rawPhone = (data.phone || '').toString().trim();
    let cleanPhone = '';

    if (rawPhone.startsWith('+')) {
      cleanPhone = '+' + rawPhone.replace(/\D/g, '');
    } else {
      const digits = rawPhone.replace(/\D/g, '');
      if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
        cleanPhone = '+7' + digits.substring(1);
      } else if (digits.length === 10) {
        cleanPhone = '+7' + digits;
      } else {
        cleanPhone = '';
      }
    }

    if (!E164_REGEX.test(cleanPhone)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'INVALID_PHONE_FORMAT',
          message: 'Номер телефона должен быть в строгом международном формате E.164 (начиная с +, от 8 до 15 цифр, например: +79991112233)'
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 3. Cryptographically Strong Lead ID Resolution (8..64 chars, GAS v2.3 compatible)
    let leadId = (data.id || data.leadId || '').toString().trim();
    if (!leadId || leadId.length < 8 || leadId.length > 64 || !VALID_LEAD_ID_REGEX.test(leadId)) {
      leadId = 'REQ-' + crypto.randomBytes(12).toString('hex').toUpperCase();
    }

    // 4. Display Date and Time (Europe/Moscow) — kept OUTSIDE hashed payload for time-stable idempotency
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

    // 5. Security Status Token (Zero-PII Client Verification for initial record)
    const statusToken = crypto.randomUUID();
    const statusTokenHash = sha256Hex(statusToken);

    // 6. Deterministic Canonical Lead Payload (Zero time-drift, zero metro duplication)
    const name = (data.name || '').toString().trim();
    const cleanDistrict = (data.district || data.location || '').toString().trim() || 'Москва';
    const rawMetro = (data.metro || '').toString().trim();
    const cleanMetro = rawMetro.replace(/^(?:м\.|метро)\s*/i, '').trim();
    const displayLocation = cleanDistrict + (cleanMetro ? ` (м. ${cleanMetro})` : '');

    // NOTE: Do NOT put volatile server date/time into `payload` so `payloadHash` stays 100% stable across retries.
    // Do NOT put pre-concatenated `location` alongside `metro`, because GAS v2.3 builds `(location || district) + (metro ? " (м. " + metro + ")" : "")`.
    const payload = {
      brand: (data.brand || '').toString().trim() || 'Не указана',
      breakdown: (data.breakdown || '').toString().trim() || 'Диагностика',
      discount: (data.discount || '').toString().trim() || '10%',
      district: cleanDistrict,
      estimatedPrice: (data.estimatedPrice || '').toString().trim() || 'от 1 350 ₽',
      id: leadId,
      leadId: leadId,
      metro: cleanMetro,
      name: name || 'Не указано',
      phone: cleanPhone,
      source: (data.source || '').toString().trim() || 'Квиз-калькулятор (Москва)',
      urgency: (data.urgency || '').toString().trim() || 'Срочно'
    };

    const canonicalPayload = buildCanonicalJsonString(payload);
    const payloadHash = sha256Hex(canonicalPayload);

    const displayLead = {
      ...payload,
      location: displayLocation,
      date: formattedDate,
      time: formattedTime
    };

    // 7. Server Configuration Validation
    if (!sheetsUrl || !hmacSecret) {
      console.warn('send-lead: Server delivery configuration missing (GOOGLE_SHEETS_WEBHOOK_URL or HMAC_SECRET)');
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'CONFIGURATION_ERROR',
          message: 'Серверный шлюз реестра заявок временно не настроен. Пожалуйста, позвоните диспетчеру напрямую.',
          leadId: leadId
        }),
        { status: 503, headers: corsHeaders }
      );
    }

    // ========================================================================
    // FIRST PHASE: record_and_claim_lead in Google Apps Script
    // ========================================================================
    const claimTimestamp = Date.now();
    const claimNonce = 'req-' + crypto.randomBytes(12).toString('hex');
    const claimReq = {
      action: 'record_and_claim_lead',
      leadId: leadId,
      payload: payload,
      payloadHash: payloadHash,
      statusTokenHash: statusTokenHash,
      auth: {
        timestamp: claimTimestamp,
        nonce: claimNonce
      }
    };
    const claimSignable = buildCanonicalSignString(claimReq);
    claimReq.auth.signature = hmacHex(claimSignable, hmacSecret);

    let claimRes;
    let claimData = null;
    let isClaimJson = false;

    try {
      claimRes = await fetch(sheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(claimReq),
        signal: AbortSignal.timeout(sheetsTimeoutMs)
      });
      const rawBody = await claimRes.text();
      try {
        claimData = JSON.parse(rawBody);
        isClaimJson = Boolean(claimData && typeof claimData === 'object' && !Array.isArray(claimData));
      } catch {
        isClaimJson = false;
      }
    } catch (netErr) {
      console.error('send-lead: Network/timeout error connecting to GAS:', sanitizeErrorText(netErr, knownSecrets));
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'GATEWAY_NETWORK_ERROR',
          retryAllowed: true,
          message: 'Не удалось связаться с реестром заявок (таймаут или сбой сети). Вы можете повторить отправку через несколько секунд.',
          leadId: leadId
        }),
        { status: 502, headers: corsHeaders }
      );
    }

    // Upstream returned non-JSON (e.g. HTML error/quota page from Google) -> 502 Bad Gateway, never 400
    if (!isClaimJson) {
      console.error(`send-lead: Non-JSON response from GAS (HTTP ${claimRes.status})`);
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'BAD_GATEWAY_RESPONSE',
          retryAllowed: true,
          message: 'Шлюз реестра заявок вернул некорректный формат ответа. Повторите попытку позже.',
          leadId: leadId
        }),
        { status: 502, headers: corsHeaders }
      );
    }

    // CRITICAL: Stop immediately if record_and_claim_lead was rejected
    if (claimData.ok !== true) {
      console.warn('send-lead: GAS rejected claim:', claimData.error, claimData.status);
      const eqCode = Number(claimData.httpCodeEquivalent);
      const httpCode = Number.isInteger(eqCode) && eqCode >= 400 && eqCode < 600
        ? eqCode
        : (claimRes.status >= 400 && claimRes.status < 600 ? claimRes.status : 502);
      const isConflict = httpCode === 409;

      return new Response(
        JSON.stringify({
          ok: false,
          error: claimData.error || 'SHEETS_RECORD_FAILED',
          status: claimData.status || 'REJECTED',
          retryAllowed: !isConflict,
          message: sanitizeErrorText(claimData.message, knownSecrets) || 'Реестр заявок отклонил сохранение.',
          leadId: leadId
        }),
        { status: httpCode, headers: corsHeaders }
      );
    }

    // Handle idempotency when lead is already registered with identical payloadHash
    if (
      claimData.action === 'record_and_claim_lead' &&
      claimData.status === 'ALREADY_RECORDED' &&
      claimData.leadId === leadId
    ) {
      if (claimData.fsmState === 'COMMITTED') {
        // NOTE: Do NOT return CONFIRMED_FULL here because ALREADY_RECORDED does not carry Telegram message_id
        // (and COMMITTED may have been reached via manual dispatcher reconciliation).
        // Do NOT return newly generated statusToken because GAS preserves the original status_token_hash.
        return new Response(
          JSON.stringify({
            ok: true,
            deliveryStatus: 'ALREADY_COMMITTED',
            leadId: leadId,
            statusToken: null,
            lead: displayLead,
            message: 'Заявка уже была сохранена и подтверждена ранее.'
          }),
          { status: 200, headers: corsHeaders }
        );
      }

      if (claimData.fsmState === 'SAVED_TG_SKIPPED') {
        return new Response(
          JSON.stringify({
            ok: true,
            deliveryStatus: 'CONFIRMED_SHEETS_ONLY',
            leadId: leadId,
            statusToken: null,
            lead: displayLead,
            message: 'Заявка уже сохранена в реестре диспетчера (канал Telegram отключён).'
          }),
          { status: 200, headers: corsHeaders }
        );
      }

      if (claimData.fsmState === 'CLAIMED') {
        console.warn(`send-lead: Duplicate submission for leadId ${leadId} in CLAIMED state. Telegram dispatch blocked.`);
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'REPAIR_REQUIRED',
            status: 'CLAIMED_IN_PROGRESS_OR_TIMEOUT',
            retryAllowed: false,
            leadId: leadId,
            message: 'Ваша заявка уже сохранена в реестре диспетчера и ожидает подтверждения доставки. Повторная отправка заблокирована во избежание дублей — диспетчер проверит заявку вручную.'
          }),
          { status: 409, headers: corsHeaders }
        );
      }

      if (claimData.fsmState === 'SAVED_TG_FAILED' || claimData.fsmState === 'TG_STATUS_UNKNOWN') {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'REPAIR_REQUIRED',
            status: claimData.fsmState,
            retryAllowed: false,
            leadId: leadId,
            message: 'Ваша заявка уже сохранена в реестре диспетчера и передана на ручную сверку уведомления. Повторная отправка не требуется.'
          }),
          { status: 409, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          ok: false,
          error: 'REPAIR_REQUIRED',
          status: claimData.fsmState || 'UNKNOWN_FSM_STATE',
          retryAllowed: false,
          leadId: leadId,
          message: 'Ваша заявка уже зарегистрирована в системе и находится на ручном контроле диспетчера. Повторная отправка заблокирована.'
        }),
        { status: 409, headers: corsHeaders }
      );
    }

    // STRICT POSITIVE GATE: Proceed to Phase 2 ONLY on unambiguous RECORDED + CLAIMED confirmation from GAS
    const isUnambiguousRecorded =
      claimData.ok === true &&
      claimData.action === 'record_and_claim_lead' &&
      claimData.status === 'RECORDED' &&
      claimData.fsmState === 'CLAIMED' &&
      claimData.leadId === leadId;

    if (!isUnambiguousRecorded) {
      console.error('send-lead: Ambiguous Phase 1 response from GAS; blocking Telegram dispatch:', claimData.status, claimData.action);
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'UNEXPECTED_GATEWAY_RESPONSE',
          status: 'AMBIGUOUS_PHASE1_RESPONSE',
          retryAllowed: false,
          message: 'Получен неоднозначный ответ от шлюза реестра заявок. Автоматическая отправка остановлена для защиты от дублирования и потери данных.',
          leadId: leadId
        }),
        { status: 502, headers: corsHeaders }
      );
    }

    // ========================================================================
    // SECOND PHASE: Telegram Delivery & confirm_tg in FSM
    // ========================================================================
    const tgConfigured = Boolean(tgToken && tgChatId);

    let tgStatus = 'UNKNOWN';
    let tgMessageId = null;
    let tgInternalErrorNote = null;
    let tgPublicErrorCode = null;

    if (!tgConfigured) {
      tgStatus = 'SKIPPED';
      tgInternalErrorNote = 'Telegram bot token or chat ID not configured on server';
      tgPublicErrorCode = 'TG_NOT_CONFIGURED';
    } else {
      try {
        const text =
          `🚨 <b>НОВЫЙ ЛИД: РЕМОНТ ХОЛОДИЛЬНИКА</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `👤 <b>Клиент:</b> ${escapeHtml(displayLead.name)}\n` +
          `📞 <b>Телефон:</b> <code>${escapeHtml(displayLead.phone)}</code>\n` +
          `❄️ <b>Марка:</b> <b>${escapeHtml(displayLead.brand)}</b>\n` +
          `🔧 <b>Поломка:</b> ${escapeHtml(displayLead.breakdown)}\n` +
          `📍 <b>Район:</b> ${escapeHtml(displayLead.location)}\n` +
          `🕒 <b>Срочность:</b> ${escapeHtml(displayLead.urgency)}\n` +
          `🏷 <b>Скидка:</b> ${escapeHtml(displayLead.discount)} (оценка: ${escapeHtml(displayLead.estimatedPrice)})\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `🆔 <b>ID заявки:</b> <code>${escapeHtml(displayLead.id)}</code>\n` +
          `⏱ <b>Время:</b> ${escapeHtml(displayLead.date)} ${escapeHtml(displayLead.time)} (МСК)\n` +
          `⚡ <b>Регламент: перезвонить за 5 минут!</b>`;

        const waPhone = displayLead.phone.replace(/\D/g, '');
        const tgPayload = {
          chat_id: tgChatId,
          text: text,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '💬 Написать в WhatsApp',
                  url: `https://wa.me/${waPhone}?text=${encodeURIComponent(`Здравствуйте, ${displayLead.name}! Вы оставляли заявку на ремонт холодильника ${displayLead.brand}.`)}`
                }
              ]
            ]
          }
        };

        const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tgPayload),
          signal: AbortSignal.timeout(tgTimeoutMs)
        });

        const tgResult = await tgRes.json().catch(() => null);
        const rawMsgId = tgResult?.result?.message_id !== undefined && tgResult?.result?.message_id !== null
          ? String(tgResult.result.message_id).trim()
          : '';
        const hasValidMessageId = VALID_TG_MESSAGE_ID_REGEX.test(rawMsgId);

        if (tgRes.ok && tgResult && tgResult.ok === true && hasValidMessageId) {
          tgStatus = 'SENT';
          tgMessageId = rawMsgId;
        } else if (tgResult && tgResult.ok === false) {
          tgStatus = 'FAILED';
          tgInternalErrorNote = sanitizeErrorText(tgResult.description || `Telegram HTTP ${tgRes.status}`, knownSecrets);
          tgPublicErrorCode = `TG_API_REJECTED_${tgRes.status}`;
        } else {
          // Ambiguous HTTP response or missing/invalid message_id -> safe UNKNOWN state, NO retry
          tgStatus = 'UNKNOWN';
          tgInternalErrorNote = `Ambiguous Telegram response (HTTP ${tgRes.status}, validMessageId=${hasValidMessageId})`;
          tgPublicErrorCode = 'TG_AMBIGUOUS_RESPONSE';
        }
      } catch (err) {
        // Network timeout, AbortError, socket hang up, DNS error:
        // Strictly UNKNOWN — NEVER retry automatically to prevent duplicate notifications.
        tgStatus = 'UNKNOWN';
        tgInternalErrorNote = sanitizeErrorText(err, knownSecrets) || 'Network or timeout error during Telegram dispatch';
        tgPublicErrorCode = 'TG_NETWORK_OR_TIMEOUT';
      }
    }

    // Call confirm_tg in Google Apps Script to synchronize FSM
    const confirmNonce = 'cnf-' + crypto.randomBytes(12).toString('hex');
    const confirmReq = {
      action: 'confirm_tg',
      leadId: leadId,
      tgStatus: tgStatus,
      ...(tgMessageId ? { messageId: tgMessageId } : {}),
      ...(tgInternalErrorNote ? { errorMessage: tgInternalErrorNote.slice(0, 500) } : {}),
      auth: {
        timestamp: Date.now(),
        nonce: confirmNonce
      }
    };
    const confirmSignable = buildCanonicalSignString(confirmReq);
    confirmReq.auth.signature = hmacHex(confirmSignable, hmacSecret);

    let confirmData = null;
    try {
      const confirmRes = await fetch(sheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(confirmReq),
        signal: AbortSignal.timeout(confirmTimeoutMs)
      });
      confirmData = await confirmRes.json().catch(() => null);
    } catch (confErr) {
      console.warn('send-lead: confirm_tg network/timeout error:', sanitizeErrorText(confErr, knownSecrets));
    }

    const isFsmConfirmed = Boolean(
      confirmData &&
      confirmData.ok === true &&
      confirmData.action === 'confirm_tg' &&
      confirmData.leadId === leadId
    );
    const finalFsmState = isFsmConfirmed ? confirmData.fsmState : 'CLAIMED';

    // Fail-safe default: NEVER return CONFIRMED_FULL unless both valid numeric messageId AND FSM COMMITTED are proven
    let deliveryStatus = 'CONFIRMED_SHEETS_TG_UNKNOWN';
    if (
      tgStatus === 'SENT' &&
      VALID_TG_MESSAGE_ID_REGEX.test(tgMessageId || '') &&
      isFsmConfirmed &&
      finalFsmState === 'COMMITTED'
    ) {
      deliveryStatus = 'CONFIRMED_FULL';
    } else if (tgStatus === 'SENT' && VALID_TG_MESSAGE_ID_REGEX.test(tgMessageId || '')) {
      deliveryStatus = 'CONFIRMED_SHEETS_FSM_PENDING';
    } else if (tgStatus === 'SKIPPED') {
      deliveryStatus = 'CONFIRMED_SHEETS_ONLY';
    } else if (tgStatus === 'FAILED') {
      deliveryStatus = 'CONFIRMED_SHEETS_TG_FAILED';
    } else {
      deliveryStatus = 'CONFIRMED_SHEETS_TG_UNKNOWN';
    }

    return new Response(
      JSON.stringify({
        ok: true,
        deliveryStatus: deliveryStatus,
        leadId: leadId,
        statusToken: statusToken,
        lead: displayLead,
        channels: {
          sheets: {
            sent: true,
            status: claimData.status,
            fsmConfirmed: isFsmConfirmed,
            fsmState: finalFsmState
          },
          telegram: {
            configured: tgConfigured,
            sent: tgStatus === 'SENT' && VALID_TG_MESSAGE_ID_REGEX.test(tgMessageId || ''),
            status: tgStatus,
            messageId: tgMessageId,
            error: tgPublicErrorCode
          }
        }
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('send-lead unhandled error:', sanitizeErrorText(error, knownSecrets));
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Внутренняя ошибка сервера при обработке заявки.'
      }),
      { status: 500, headers: corsHeaders }
    );
  }
};
