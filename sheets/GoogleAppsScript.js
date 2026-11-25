/**
 * «МоскХолод Сервис» — Google Apps Script (Версия 2.3 Production Pilot)
 * Реестр заявок: ремонт холодильников в Москве и МО.
 *
 * Таблица: «МоскХолод — Реестр заявок»
 * ID таблицы: 1pkWbrwh-D83JGXjS88yThWKd5vxSIQTPv9POH3nWbIc
 *
 * Архитектура листов:
 * 1. «Лиды» (15 колонок A:O) — операционный реестр диспетчера Сергея:
 *    A: Дата | B: Время (МСК) | C: ID заявки | D: Имя клиента | E: Телефон
 *    F: Марка холодильника | G: Неисправность | H: Округ Москвы / Метро
 *    I: Срочность выезда | J: Скидка | K: Оценка стоимости | L: Статус заявки
 *    M: Назначенный мастер | N: Заметки диспетчера | O: Доставка TG
 *    ВНИМАНИЕ: Колонки L, M, N (12, 13, 14) являются бизнес-полями диспетчера.
 *              Автоматизация ни при каких условиях их не перезаписывает.
 *
 * 2. «_Тех_FSM» (10 колонок, скрытый) — конечный автомат и журнал целостности:
 *    A: lead_id | B: sheet_row | C: fsm_state | D: payload_hash | E: status_token_hash
 *    F: created_at | G: updated_at | H: tg_status | I: tg_message_id | J: notes
 *
 * Безопасность и целостность v2.3:
 * - Секрет HMAC_SECRET хранится строго в Script Properties (PropertiesService.getScriptProperties()).
 * - Никаких секретов, токенов и тестовых ключей в коде или Git.
 * - Полный канонический JSON (RFC 8785 совместимый): рекурсивная обработка массивов и объектов,
 *   сортировка ключей, детерминированная обработка null, пустых массивов/объектов, NaN/Infinity.
 * - GAS самостоятельно пересчитывает SHA-256 от канонического payload и отвергает запрос
 *   при несовпадении с payloadHash клиента.
 * - Защита от Formula Injection: экранирование символов '=', '+', '-', '@', '\t', '\r' апострофом
 *   при записи строковых полей в Google Sheets. Ограничение длины полей.
 * - Строгая FSM-матрица:
 *   * Автоматический переход из SAVED_TG_FAILED или TG_STATUS_UNKNOWN в COMMITTED ЗАПРЕЩЁН (REPAIR_REQUIRED).
 *   * Повторные confirm_tg идемпотентны (ALREADY_COMMITTED / ALREADY_FAILED) и не инициируют повторные отправки.
 *   * Ручная сверка выполняется через отдельное защищенное действие manual_reconcile_lead или меню.
 * - Детекция и безопасное восстановление при частичной записи в confirm_tg и record_and_claim_lead.
 * - LockService защищает критические секции проверки nonce и записи.
 * - Клиентская проверка статуса: исключительно через POST (Zero-PII, без токена в GET URL).
 */

// Константы структуры листов
const SHEET_LEADS_NAME = "Лиды";
const SHEET_FSM_NAME = "_Тех_FSM";

const LEADS_HEADERS = [
  "Дата",
  "Время (МСК)",
  "ID заявки",
  "Имя клиента",
  "Телефон",
  "Марка холодильника",
  "Неисправность",
  "Округ Москвы / Метро",
  "Срочность выезда",
  "Скидка",
  "Оценка стоимости",
  "Статус заявки",       // Бизнес-поле L (индекс 12)
  "Назначенный мастер",   // Бизнес-поле M (индекс 13)
  "Заметки диспетчера",  // Бизнес-поле N (индекс 14)
  "Доставка TG"          // Технический статус O (индекс 15)
];

const FSM_HEADERS = [
  "lead_id",
  "sheet_row",
  "fsm_state",
  "payload_hash",
  "status_token_hash",
  "created_at",
  "updated_at",
  "tg_status",
  "tg_message_id",
  "notes"
];

// Допустимый дрейф времени для HMAC-запросов (5 минут = 300 000 мс)
const MAX_CLOCK_DRIFT_MS = 300000;
// Время жизни nonce в кэше (10 минут = 600 секунд)
const NONCE_CACHE_TTL_SEC = 600;

// ============================================================================
// ТОЧКИ ВХОДА WEB APP (doPost / doGet)
// ============================================================================

/**
 * Обработка входящих POST-запросов от бэкенда Netlify и клиентского UI
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({
        ok: false,
        error: "BAD_REQUEST",
        status: "REJECTED",
        httpCodeEquivalent: 400,
        message: "Тело запроса отсутствует"
      });
    }

    let body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonResponse({
        ok: false,
        error: "INVALID_JSON",
        status: "REJECTED",
        httpCodeEquivalent: 400,
        message: "Некорректный формат JSON"
      });
    }

    const action = (body.action || "").toString().trim();

    // Маршрутизация действий
    if (action === "record_and_claim_lead") {
      return handleRecordAndClaim(body);
    } else if (action === "confirm_tg") {
      return handleConfirmTg(body);
    } else if (action === "get_lead_status") {
      return handleGetLeadStatus(body);
    } else if (action === "manual_reconcile_lead") {
      return handleManualReconcileLead(body);
    } else {
      return jsonResponse({
        ok: false,
        error: "UNKNOWN_ACTION",
        status: "REJECTED",
        httpCodeEquivalent: 400,
        message: "Неизвестное действие: " + action
      });
    }

  } catch (globalErr) {
    Logger.log("Критическая ошибка doPost: [Исключение перехвачено]");
    return jsonResponse({
      ok: false,
      error: "INTERNAL_SERVER_ERROR",
      status: "REJECTED",
      httpCodeEquivalent: 500,
      message: "Внутренняя ошибка сервера при обработке запроса"
    });
  }
}

/**
 * Обработка GET-запросов (ТОЛЬКО Healthcheck, никаких токенов в URL)
 */
function doGet(e) {
  return jsonResponse({
    ok: true,
    service: "MoskKholod Lead Registry API",
    version: "2.3",
    status: "active",
    note: "Проверка статуса заявки выполняется через POST с передачей токена в теле запроса",
    timestamp: new Date().toISOString()
  });
}

// ============================================================================
// ОБРАБОТЧИКИ ДЕЙСТВИЙ (HANDLERS)
// ============================================================================

/**
 * Действие 1: Регистрация и захват заявки (record_and_claim_lead)
 */
function handleRecordAndClaim(body) {
  // 1. Проверка HMAC-подписи запроса ДО любых изменений
  const authErr = verifyHmacAuth(body);
  if (authErr) {
    return jsonResponse({
      ok: false,
      error: authErr.code,
      status: "REJECTED",
      httpCodeEquivalent: authErr.httpCode,
      message: authErr.message
    });
  }

  // 2. Валидация обязательных полей
  const leadId = (body.leadId || "").toString().trim();
  const payload = body.payload;
  const payloadHash = (body.payloadHash || "").toString().trim();
  const statusTokenHash = (body.statusTokenHash || "").toString().trim();

  if (!leadId || !payload || !payloadHash || !statusTokenHash) {
    return jsonResponse({
      ok: false,
      error: "MISSING_REQUIRED_FIELDS",
      status: "REJECTED",
      httpCodeEquivalent: 400,
      message: "Отсутствуют обязательные поля: leadId, payload, payloadHash или statusTokenHash"
    });
  }

  if (leadId.length < 8 || leadId.length > 64 || !/^[A-Za-z0-9_\-]+$/.test(leadId)) {
    return jsonResponse({
      ok: false,
      error: "INVALID_LEAD_ID_FORMAT",
      status: "REJECTED",
      httpCodeEquivalent: 400,
      message: "Недопустимый формат идентификатора leadId"
    });
  }

  // 3. Самостоятельное вычисление SHA-256 полезной нагрузки на стороне GAS
  const canonicalPayloadString = normalizePayloadToCanonicalString(payload);
  const computedPayloadHash = computeSha256Hex(canonicalPayloadString);

  if (!timingSafeEqual(computedPayloadHash, payloadHash)) {
    return jsonResponse({
      ok: false,
      error: "INVALID_PAYLOAD_HASH",
      status: "REJECTED",
      httpCodeEquivalent: 400,
      message: "Вычисленный SHA-256 полезной нагрузки не совпадает с переданным payloadHash"
    });
  }

  const payloadObj = typeof payload === "string" ? JSON.parse(payload) : payload;
  const rawPhone = (payloadObj.phone || "").toString().trim();
  const E164_REGEX = /^\+[1-9]\d{7,14}$/;

  if (!E164_REGEX.test(rawPhone)) {
    return jsonResponse({
      ok: false,
      error: "INVALID_PHONE_FORMAT",
      status: "REJECTED",
      httpCodeEquivalent: 400,
      message: "Номер телефона должен быть в строгом международном формате E.164 (начиная с +, от 8 до 15 цифр, например: +79991112233)"
    });
  }

  // 4. Захват эксклюзивной блокировки LockService
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(5000);
  if (!hasLock) {
    return jsonResponse({
      ok: false,
      error: "LOCK_TIMEOUT",
      status: "REJECTED",
      httpCodeEquivalent: 503,
      message: "Таблица занята другим процессом. Повторите попытку через несколько секунд."
    });
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 5. Проверка структуры существующей таблицы
    const structCheck = validateTableStructure(ss);
    if (!structCheck.ok) {
      return jsonResponse({
        ok: false,
        error: structCheck.error,
        status: "REJECTED",
        httpCodeEquivalent: 500,
        message: structCheck.message
      });
    }

    const leadsSheet = structCheck.leadsSheet;
    const fsmSheet = structCheck.fsmSheet;

    // 6. Проверка и регистрация nonce ПОД БЛОКИРОВКОЙ
    const nonce = body.auth.nonce;
    const cache = CacheService.getScriptCache();
    const nonceKey = "nonce_" + nonce;
    if (cache.get(nonceKey)) {
      return jsonResponse({
        ok: false,
        error: "REPLAY_DETECTED",
        status: "REJECTED",
        httpCodeEquivalent: 409,
        message: "Запрос с данным nonce уже был обработан"
      });
    }
    cache.put(nonceKey, "1", NONCE_CACHE_TTL_SEC);

    // 7. Проверка существующей записи в ОБОИХ листах
    const existingFsm = findFsmEntry(fsmSheet, leadId);
    const existingLeadsRow = findRowInLeadsByLeadId(leadsSheet, leadId);

    // Сценарий A: Заявка уже зарегистрирована в обоих листах
    if (existingFsm && existingLeadsRow > 0) {
      if (existingFsm.payloadHash === payloadHash) {
        return jsonResponse({
          ok: true,
          leadId: leadId,
          action: "record_and_claim_lead",
          status: "ALREADY_RECORDED",
          fsmState: existingFsm.fsmState,
          sheetRow: existingFsm.sheetRow,
          message: "Заявка уже зарегистрирована в системе с идентичной полезной нагрузкой"
        });
      } else {
        return jsonResponse({
          ok: false,
          error: "PAYLOAD_HASH_MISMATCH",
          leadId: leadId,
          status: "CORRUPTED",
          httpCodeEquivalent: 409,
          message: "Обнаружен конфликт: заявка с данным ID уже существует с другим payloadHash."
        });
      }
    }

    // Сценарий B: Строка есть в «Лиды», но отсутствует в «_Тех_FSM» (частичная запись)
    // Совпадение телефона не является доказательством идентичности payload.
    // Автоматическое создание записи с недоказанным хэшем запрещено.
    if (!existingFsm && existingLeadsRow > 0) {
      Logger.log("Внимание: обнаружена строка в Лиды без FSM-записи для leadId: " + leadId + ". Требуется ручная сверка.");
      leadsSheet.getRange(existingLeadsRow, 15).setValue("⚠️ Требуется сверка");
      return jsonResponse({
        ok: false,
        error: "PARTIAL_WRITE_UNVERIFIED",
        leadId: leadId,
        sheetRow: existingLeadsRow,
        status: "REPAIR_REQUIRED",
        httpCodeEquivalent: 409,
        message: "Строка с данным ID уже присутствует в Лиды, но FSM-запись отсутствует. Исходный payload невозможно достоверно подтвердить. Требуется ручная сверка диспетчера."
      });
    }

    // Сценарий C: Запись есть в FSM, но отсутствует в «Лиды»
    if (existingFsm && existingLeadsRow === -1) {
      return jsonResponse({
        ok: false,
        error: "DATA_INCONSISTENCY_ORPHAN_FSM",
        leadId: leadId,
        status: "REPAIR_REQUIRED",
        httpCodeEquivalent: 500,
        message: "Запись присутствует в _Тех_FSM, но строка в Лиды отсутствует. Требуется ручная сверка."
      });
    }

    // Сценарий D: Чистая новая заявка — экранируем все поля от Formula Injection
    const now = new Date();
    const dateStr = sanitizeSheetCell(payloadObj.date || Utilities.formatDate(now, "Europe/Moscow", "dd.MM.yyyy"));
    const timeStr = sanitizeSheetCell(payloadObj.time || Utilities.formatDate(now, "Europe/Moscow", "HH:mm"));
    const safeLeadId = sanitizeSheetCell(leadId);
    const safeName = sanitizeSheetCell(payloadObj.name || "Не указано", false, 100);
    const safePhone = sanitizeSheetCell(rawPhone, true); // Строгий E.164 телефон
    const safeBrand = sanitizeSheetCell(payloadObj.brand || "Не указана", false, 100);
    const safeBreakdown = sanitizeSheetCell(payloadObj.breakdown || "Диагностика", false, 500);
    const safeLocation = sanitizeSheetCell(
      (payloadObj.location || payloadObj.district || "") + (payloadObj.metro ? " (м. " + payloadObj.metro + ")" : ""),
      false,
      200
    );
    const safeUrgency = sanitizeSheetCell(payloadObj.urgency || "today", false, 50);
    const safeDiscount = sanitizeSheetCell(
      payloadObj.discountValue ?
        (payloadObj.discountType === "FIXED_RUB" ? payloadObj.discountValue + " ₽" : payloadObj.discountValue + "%") :
        (payloadObj.discount || "10%"),
      false,
      50
    );
    const safePrice = sanitizeSheetCell(payloadObj.estimatedPrice || "от 1 350 ₽", false, 50);

    const leadsRowData = [
      dateStr,                                                 // A (1): Дата
      timeStr,                                                 // B (2): Время (МСК)
      safeLeadId,                                              // C (3): ID заявки
      safeName,                                                // D (4): Имя клиента
      safePhone,                                               // E (5): Телефон (текст)
      safeBrand,                                               // F (6): Марка холодильника
      safeBreakdown,                                           // G (7): Неисправность
      safeLocation,                                            // H (8): Округ Москвы / Метро
      safeUrgency,                                             // I (9): Срочность выезда
      safeDiscount,                                            // J (10): Скидка
      safePrice,                                               // K (11): Оценка стоимости
      "🔥 Новый",                                              // L (12): Статус заявки (бизнес-поле)
      "",                                                      // M (13): Назначенный мастер (бизнес-поле)
      "",                                                      // N (14): Заметки диспетчера (бизнес-поле)
      "⏳ Ожидает TG"                                          // O (15): Доставка TG (тех. статус)
    ];

    leadsSheet.appendRow(leadsRowData);
    const targetRow = leadsSheet.getLastRow();
    leadsSheet.getRange(targetRow, 5).setNumberFormat("@");

    const nowIso = now.toISOString();
    const fsmRowData = [
      leadId,          // A: lead_id
      targetRow,       // B: sheet_row
      "CLAIMED",       // C: fsm_state
      payloadHash,     // D: payload_hash
      statusTokenHash, // E: status_token_hash
      nowIso,          // F: created_at
      nowIso,          // G: updated_at
      "PENDING",       // H: tg_status
      "",              // I: tg_message_id
      ""               // J: notes
    ];

    try {
      fsmSheet.appendRow(fsmRowData);
    } catch (fsmErr) {
      Logger.log("Сбой добавления строки в _Тех_FSM");
      leadsSheet.getRange(targetRow, 15).setValue("⚠️ Сбой FSM (сверка)");
      return jsonResponse({
        ok: false,
        error: "PARTIAL_WRITE_DETECTED",
        leadId: leadId,
        sheetRow: targetRow,
        status: "RECORD_FAILED",
        httpCodeEquivalent: 500,
        message: "Строка создана в Лиды, но регистрация FSM не завершена. Требуется сверка."
      });
    }

    return jsonResponse({
      ok: true,
      leadId: leadId,
      action: "record_and_claim_lead",
      status: "RECORDED",
      fsmState: "CLAIMED",
      sheetRow: targetRow
    });

  } finally {
    lock.releaseLock();
  }
}

/**
 * Действие 2: Подтверждение отправки в Telegram (confirm_tg)
 */
function handleConfirmTg(body) {
  // 1. Проверка HMAC-подписи запроса ДО любых изменений
  const authErr = verifyHmacAuth(body);
  if (authErr) {
    return jsonResponse({
      ok: false,
      error: authErr.code,
      status: "REJECTED",
      httpCodeEquivalent: authErr.httpCode,
      message: authErr.message
    });
  }

  const leadId = (body.leadId || "").toString().trim();
  const tgStatus = (body.tgStatus || "").toString().trim(); // "SENT", "FAILED", "SKIPPED", "UNKNOWN"
  const errorMessage = sanitizeSheetCell((body.errorMessage || "").toString().trim(), false, 500);

  // Валидация messageId: Telegram message_id должен быть строго положительным целым числом
  let safeMessageId = "";
  if (body.messageId !== undefined && body.messageId !== null) {
    const rawMsgId = body.messageId.toString().trim();
    if (rawMsgId) {
      if (!/^\d{1,20}$/.test(rawMsgId) || rawMsgId === "0") {
        return jsonResponse({
          ok: false,
          error: "INVALID_MESSAGE_ID",
          status: "REJECTED",
          httpCodeEquivalent: 400,
          message: "messageId должен быть положительным целым числом Telegram (от 1 до 20 цифр)"
        });
      }
      safeMessageId = rawMsgId;
    }
  }

  // При статусе SENT идентификатор сообщения обязателен для технического аудита FSM
  if (tgStatus === "SENT" && !safeMessageId) {
    return jsonResponse({
      ok: false,
      error: "MISSING_MESSAGE_ID",
      status: "REJECTED",
      httpCodeEquivalent: 400,
      message: "При tgStatus === 'SENT' параметр messageId обязателен и должен быть числовым"
    });
  }

  if (!leadId || !tgStatus) {
    return jsonResponse({
      ok: false,
      error: "MISSING_REQUIRED_FIELDS",
      status: "REJECTED",
      httpCodeEquivalent: 400,
      message: "leadId и tgStatus обязательны"
    });
  }

  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(5000);
  if (!hasLock) {
    return jsonResponse({
      ok: false,
      error: "LOCK_TIMEOUT",
      status: "REJECTED",
      httpCodeEquivalent: 503,
      message: "Таблица занята, повторите попытку"
    });
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const structCheck = validateTableStructure(ss);
    if (!structCheck.ok) {
      return jsonResponse({
        ok: false,
        error: structCheck.error,
        status: "REJECTED",
        httpCodeEquivalent: 500,
        message: structCheck.message
      });
    }

    const leadsSheet = structCheck.leadsSheet;
    const fsmSheet = structCheck.fsmSheet;

    const nonce = body.auth.nonce;
    const cache = CacheService.getScriptCache();
    const nonceKey = "nonce_" + nonce;
    if (cache.get(nonceKey)) {
      return jsonResponse({
        ok: false,
        error: "REPLAY_DETECTED",
        status: "REJECTED",
        httpCodeEquivalent: 409,
        message: "Запрос с данным nonce уже был обработан"
      });
    }
    cache.put(nonceKey, "1", NONCE_CACHE_TTL_SEC);

    const fsmEntry = findFsmEntry(fsmSheet, leadId);
    if (!fsmEntry) {
      return jsonResponse({
        ok: false,
        error: "LEAD_NOT_REGISTERED",
        status: "REJECTED",
        httpCodeEquivalent: 404,
        message: "Заявка не зарегистрирована в FSM. Перевод в COMMITTED невозможен."
      });
    }

    const currentState = fsmEntry.fsmState;

    // Идемпотентность для терминального COMMITTED: повторный SENT не шлёт TG повторно
    if (currentState === "COMMITTED") {
      if (tgStatus === "SENT") {
        return jsonResponse({
          ok: true,
          leadId: leadId,
          action: "confirm_tg",
          status: "ALREADY_COMMITTED",
          fsmState: "COMMITTED",
          messageId: fsmEntry.tgMessageId,
          message: "Заявка уже была успешно подтверждена ранее"
        });
      } else {
        return jsonResponse({
          ok: false,
          error: "INVALID_STATE_TRANSITION",
          status: "REJECTED",
          httpCodeEquivalent: 409,
          message: "Заявка уже в терминальном состоянии COMMITTED и не может быть переведена в " + tgStatus
        });
      }
    }

    // Обработка SAVED_TG_FAILED:
    // Автоматический переход в COMMITTED ЗАПРЕЩЕН (требует ручной сверки диспетчера)
    if (currentState === "SAVED_TG_FAILED") {
      if (tgStatus === "FAILED") {
        return jsonResponse({
          ok: true,
          leadId: leadId,
          action: "confirm_tg",
          status: "ALREADY_FAILED",
          fsmState: "SAVED_TG_FAILED",
          message: "Заявка уже зафиксирована в состоянии ошибки доставки TG"
        });
      }
      return jsonResponse({
        ok: false,
        error: "REPAIR_REQUIRED",
        status: "REPAIR_REQUIRED",
        httpCodeEquivalent: 409,
        message: "Заявка находится в SAVED_TG_FAILED. Автоматический переход запрещен. Требуется ручная сверка диспетчера."
      });
    }

    // Обработка TG_STATUS_UNKNOWN:
    // Автоматический переход в COMMITTED или SAVED_TG_FAILED ЗАПРЕЩЕН
    if (currentState === "TG_STATUS_UNKNOWN") {
      return jsonResponse({
        ok: false,
        error: "REPAIR_REQUIRED",
        status: "REPAIR_REQUIRED",
        httpCodeEquivalent: 409,
        message: "Заявка находится в TG_STATUS_UNKNOWN. Автоматический переход запрещен. Требуется ручная сверка диспетчера."
      });
    }

    if (currentState !== "CLAIMED") {
      return jsonResponse({
        ok: false,
        error: "INVALID_STATE_TRANSITION",
        status: "REJECTED",
        httpCodeEquivalent: 409,
        message: "Текущее состояние " + currentState + " не допускает внешнего подтверждения"
      });
    }

    let targetRow = fsmEntry.sheetRow;
    let verifiedLeadId = "";
    if (targetRow >= 2 && targetRow <= leadsSheet.getLastRow()) {
      verifiedLeadId = leadsSheet.getRange(targetRow, 3).getValue().toString().trim();
    }

    if (verifiedLeadId !== leadId) {
      const actualRow = findRowInLeadsByLeadId(leadsSheet, leadId);
      if (actualRow > 0) {
        targetRow = actualRow;
        fsmSheet.getRange(fsmEntry.fsmRowIndex, 2).setValue(actualRow);
      } else {
        return jsonResponse({
          ok: false,
          error: "LEADS_ROW_NOT_FOUND",
          status: "CORRUPTED",
          httpCodeEquivalent: 500,
          message: "Заявка найдена в FSM, но строка в Лиды отсутствует"
        });
      }
    }

    let newColumnOValue = "";
    let newFsmState = "";

    if (tgStatus === "SENT") {
      newColumnOValue = "✅ Доставлено";
      newFsmState = "COMMITTED";
    } else if (tgStatus === "FAILED") {
      newColumnOValue = "❌ Сбой TG";
      newFsmState = "SAVED_TG_FAILED";
    } else if (tgStatus === "SKIPPED") {
      newColumnOValue = "⚠️ Не отправлялось";
      newFsmState = "SAVED_TG_SKIPPED";
    } else if (tgStatus === "UNKNOWN") {
      newColumnOValue = "⏳ TG статус неизвестен";
      newFsmState = "TG_STATUS_UNKNOWN";
    } else {
      return jsonResponse({
        ok: false,
        error: "INVALID_TG_STATUS",
        status: "REJECTED",
        httpCodeEquivalent: 400,
        message: "Недопустимый tgStatus: " + tgStatus
      });
    }

    // Двухэтапная фиксация confirm_tg с защитой от рассинхронизации
    leadsSheet.getRange(targetRow, 15).setValue(newColumnOValue);

    try {
      const nowIso = new Date().toISOString();
      fsmSheet.getRange(fsmEntry.fsmRowIndex, 3).setValue(newFsmState);
      fsmSheet.getRange(fsmEntry.fsmRowIndex, 7).setValue(nowIso);
      fsmSheet.getRange(fsmEntry.fsmRowIndex, 8).setValue(tgStatus);
      if (safeMessageId) {
        fsmSheet.getRange(fsmEntry.fsmRowIndex, 9).setValue(safeMessageId);
      }
      if (errorMessage) {
        fsmSheet.getRange(fsmEntry.fsmRowIndex, 10).setValue(errorMessage);
      }
    } catch (fsmUpdateErr) {
      Logger.log("Сбой обновления _Тех_FSM в confirm_tg");
      leadsSheet.getRange(targetRow, 15).setValue("⚠️ Рассинхронизация TG (FSM)");
      return jsonResponse({
        ok: false,
        error: "PARTIAL_WRITE_CONFIRM_FAILED",
        status: "REPAIR_REQUIRED",
        httpCodeEquivalent: 500,
        message: "Статус в Лиды обновлён, но запись в FSM прервана. Автоматический повтор завершит синхронизацию."
      });
    }

    return jsonResponse({
      ok: true,
      leadId: leadId,
      action: "confirm_tg",
      status: "CONFIRMED",
      fsmState: newFsmState,
      deliveryStatusO: newColumnOValue
    });

  } finally {
    lock.releaseLock();
  }
}

/**
 * Единое защищённое ядро ручной сверки заявки диспетчером с жестким контролем FSM
 */
function executeReconciliation(params) {
  const leadId = (params.leadId || "").toString().trim();
  const resolution = (params.resolution || "").toString().trim(); // "RESOLVE_COMMITTED", "RESOLVE_FAILED"
  const rawReason = (params.reason || "").toString().trim();
  const channel = (params.channel || "UNKNOWN").toString().trim();
  const actorEmail = (params.actorEmail || "").toString().trim();
  const nonce = (params.nonce || "").toString().trim();

  const safeReason = sanitizeSheetCell(rawReason, false, 200);

  if (!leadId || !resolution) {
    return {
      ok: false,
      error: "MISSING_REQUIRED_FIELDS",
      status: "REJECTED",
      httpCode: 400,
      message: "leadId и resolution обязательны"
    };
  }

  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(5000);
  if (!hasLock) {
    return {
      ok: false,
      error: "LOCK_TIMEOUT",
      status: "REJECTED",
      httpCode: 503,
      message: "Таблица занята, повторите попытку"
    };
  }

  try {
    // Атомарная проверка nonce под блокировкой LockService
    if (nonce) {
      const cache = CacheService.getScriptCache();
      const nonceKey = "nonce_" + nonce;
      if (cache.get(nonceKey)) {
        return {
          ok: false,
          error: "REPLAY_DETECTED",
          status: "REJECTED",
          httpCode: 409,
          message: "Запрос с данным nonce уже был обработан"
        };
      }
      cache.put(nonceKey, "1", NONCE_CACHE_TTL_SEC);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const structCheck = validateTableStructure(ss);
    if (!structCheck.ok) {
      return {
        ok: false,
        error: structCheck.error,
        status: "REJECTED",
        httpCode: 500,
        message: structCheck.message
      };
    }

    const leadsSheet = structCheck.leadsSheet;
    const fsmSheet = structCheck.fsmSheet;

    const fsmEntry = findFsmEntry(fsmSheet, leadId);
    if (!fsmEntry) {
      return {
        ok: false,
        error: "LEAD_NOT_REGISTERED",
        status: "REJECTED",
        httpCode: 404,
        message: "Заявка не найдена в FSM"
      };
    }

    const currentState = fsmEntry.fsmState;

    // 1. ПРОВЕРКА ДОПУСТИМЫХ ИСХОДНЫХ СОСТОЯНИЙ FSM (State Matrix Protection)
    if (resolution === "RESOLVE_COMMITTED") {
      if (currentState === "COMMITTED") {
        return {
          ok: false,
          error: "ALREADY_COMMITTED",
          status: "REJECTED",
          httpCode: 409,
          message: "Заявка уже находится в терминальном состоянии COMMITTED. Повторная сверка отклонена."
        };
      }
      const allowedSourceStates = ["TG_STATUS_UNKNOWN", "SAVED_TG_FAILED", "CLAIMED"];
      if (allowedSourceStates.indexOf(currentState) === -1) {
        return {
          ok: false,
          error: "INVALID_STATE_TRANSITION",
          status: "REJECTED",
          httpCode: 409,
          message: "Перевод в COMMITTED недопустим из текущего состояния: " + currentState
        };
      }
    } else if (resolution === "RESOLVE_FAILED") {
      if (currentState === "SAVED_TG_FAILED") {
        return {
          ok: false,
          error: "ALREADY_FAILED",
          status: "REJECTED",
          httpCode: 409,
          message: "Заявка уже находится в состоянии SAVED_TG_FAILED. Повторная сверка отклонена."
        };
      }
      if (currentState === "COMMITTED") {
        return {
          ok: false,
          error: "INVALID_STATE_TRANSITION",
          status: "REJECTED",
          httpCode: 409,
          message: "Нельзя отменить успешно подтверждённую доставку COMMITTED"
        };
      }
      const allowedSourceStates = ["TG_STATUS_UNKNOWN", "CLAIMED"];
      if (allowedSourceStates.indexOf(currentState) === -1) {
        return {
          ok: false,
          error: "INVALID_STATE_TRANSITION",
          status: "REJECTED",
          httpCode: 409,
          message: "Перевод в SAVED_TG_FAILED недопустим из текущего состояния: " + currentState
        };
      }
    } else {
      return {
        ok: false,
        error: "INVALID_RESOLUTION",
        status: "REJECTED",
        httpCode: 400,
        message: "Недопустимый resolution: " + resolution
      };
    }

    let targetRow = fsmEntry.sheetRow;
    let verifiedLeadId = "";
    if (targetRow >= 2 && targetRow <= leadsSheet.getLastRow()) {
      verifiedLeadId = leadsSheet.getRange(targetRow, 3).getValue().toString().trim();
    }
    if (verifiedLeadId !== leadId) {
      const actualRow = findRowInLeadsByLeadId(leadsSheet, leadId);
      if (actualRow > 0) {
        targetRow = actualRow;
        fsmSheet.getRange(fsmEntry.fsmRowIndex, 2).setValue(actualRow);
      } else {
        return {
          ok: false,
          error: "LEADS_ROW_NOT_FOUND",
          status: "CORRUPTED",
          httpCode: 500,
          message: "Заявка найдена в FSM, но строка в Лиды отсутствует"
        };
      }
    }

    let newFsmState = "";
    let newColumnOValue = "";

    if (resolution === "RESOLVE_COMMITTED") {
      newFsmState = "COMMITTED";
      newColumnOValue = "✅ Доставлено (ручн.)";
    } else {
      newFsmState = "SAVED_TG_FAILED";
      newColumnOValue = "❌ Сбой TG (ручн.)";
    }

    // Формирование защищённой записи аудита (Zero-PII-Forgery)
    // Разделяем канал вызова: не принимаем произвольного автора на веру
    let auditNote = "";
    if (channel === "SHEET_UI_MENU") {
      const actorLabel = actorEmail ? actorEmail : "Аккаунт Google Таблиц (email скрыт)";
      auditNote = "Сверка [UI_MENU, " + actorLabel + "]: " + (safeReason || "Без комментария");
    } else {
      auditNote = "Сверка [API_HMAC, доверенный бэкенд]: " + (safeReason || "Без комментария");
    }
    auditNote = sanitizeSheetCell(auditNote, false, 250);

    // Двухэтапная фиксация ручной сверки с защитой от рассинхронизации
    leadsSheet.getRange(targetRow, 15).setValue(newColumnOValue);

    try {
      const nowIso = new Date().toISOString();
      fsmSheet.getRange(fsmEntry.fsmRowIndex, 3).setValue(newFsmState);
      fsmSheet.getRange(fsmEntry.fsmRowIndex, 7).setValue(nowIso);
      fsmSheet.getRange(fsmEntry.fsmRowIndex, 10).setValue(auditNote);
    } catch (fsmErr) {
      Logger.log("Сбой обновления _Тех_FSM при ручной сверке");
      leadsSheet.getRange(targetRow, 15).setValue("⚠️ Рассинхронизация сверки (FSM)");
      return {
        ok: false,
        error: "PARTIAL_WRITE_RECONCILE_FAILED",
        status: "REPAIR_REQUIRED",
        httpCode: 500,
        message: "Статус в Лиды обновлен, но запись в FSM прервана. Повторите сверку для завершения синхронизации."
      };
    }

    return {
      ok: true,
      leadId: leadId,
      action: "manual_reconcile_lead",
      status: "RECONCILED",
      fsmState: newFsmState,
      deliveryStatusO: newColumnOValue,
      channel: channel
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Действие: Ручная сверка заявки через HMAC API (manual_reconcile_lead)
 * HMAC_SECRET удостоверяет доверенный бэкенд, но не удостоверяет личность оператора.
 */
function handleManualReconcileLead(body) {
  const authErr = verifyHmacAuth(body);
  if (authErr) {
    return jsonResponse({
      ok: false,
      error: authErr.code,
      status: "REJECTED",
      httpCodeEquivalent: authErr.httpCode,
      message: authErr.message
    });
  }

  const nonce = (body.auth && body.auth.nonce) ? body.auth.nonce.toString().trim() : "";

  const result = executeReconciliation({
    leadId: body.leadId,
    resolution: body.resolution,
    reason: body.notes || body.reason,
    channel: "API_HMAC",
    actorEmail: "",
    nonce: nonce
  });

  return jsonResponse({
    ok: result.ok,
    error: result.error,
    leadId: result.leadId,
    action: "manual_reconcile_lead",
    status: result.status,
    fsmState: result.fsmState,
    deliveryStatusO: result.deliveryStatusO,
    httpCodeEquivalent: result.httpCode || (result.ok ? 200 : 500),
    message: result.message
  });
}

/**
 * Действие 3: Клиентская проверка статуса через POST (Zero-PII)
 */
function handleGetLeadStatus(body) {
  const leadId = (body.leadId || "").toString().trim();
  const statusToken = (body.statusToken || "").toString().trim();

  if (!leadId || !statusToken) {
    return jsonResponse({
      ok: false,
      error: "MISSING_REQUIRED_PARAMETERS",
      status: "REJECTED",
      httpCodeEquivalent: 400,
      message: "Параметры leadId и statusToken обязательны"
    });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const fsmSheet = ss.getSheetByName(SHEET_FSM_NAME);
  if (!fsmSheet) {
    return jsonResponse({
      ok: false,
      error: "LEAD_NOT_FOUND",
      status: "REJECTED",
      httpCodeEquivalent: 404,
      message: "Заявка не найдена"
    });
  }

  const fsmEntry = findFsmEntry(fsmSheet, leadId);
  if (!fsmEntry) {
    return jsonResponse({
      ok: false,
      error: "LEAD_NOT_FOUND",
      status: "REJECTED",
      httpCodeEquivalent: 404,
      message: "Заявка не найдена"
    });
  }

  const tokenHash = computeSha256Hex(statusToken);

  if (!timingSafeEqual(tokenHash, fsmEntry.statusTokenHash)) {
    return jsonResponse({
      ok: false,
      error: "FORBIDDEN_INVALID_TOKEN",
      status: "REJECTED",
      httpCodeEquivalent: 403,
      message: "Неверный токен доступа к статусу заявки"
    });
  }

  let externalStatus = "UNKNOWN";
  let isTerminal = false;

  switch (fsmEntry.fsmState) {
    case "CLAIMED":
      externalStatus = "PENDING";
      isTerminal = false;
      break;
    case "COMMITTED":
      externalStatus = "DELIVERED";
      isTerminal = true;
      break;
    case "SAVED_TG_FAILED":
    case "SAVED_TG_SKIPPED":
      externalStatus = "NOT_SENT";
      isTerminal = true;
      break;
    case "MANUALLY_DISPATCHED":
    case "MANUALLY_RESOLVED":
      externalStatus = "MANUALLY_HANDED_OFF";
      isTerminal = true;
      break;
    case "CORRUPTED":
      externalStatus = "REPAIR_REQUIRED";
      isTerminal = true;
      break;
    case "TG_STATUS_UNKNOWN":
      externalStatus = "UNKNOWN";
      isTerminal = false;
      break;
    default:
      externalStatus = "UNKNOWN";
      isTerminal = false;
  }

  return jsonResponse({
    ok: true,
    leadId: leadId,
    status: externalStatus,
    isTerminal: isTerminal,
    updatedAt: fsmEntry.updatedAt
  });
}

// ============================================================================
// КРИПТОГРАФИЯ, КАНОНИЧЕСКИЙ JSON И САНИТИЗАЦИЯ
// ============================================================================

/**
 * Защита от Formula Injection и нормализация типов ячеек Google Sheets.
 * Экранирует опасные префиксы '=', '+', '-', '@', '\t', '\r' апострофом.
 */
function sanitizeSheetCell(val, isPhone = false, maxLength = 250) {
  if (val === null || val === undefined) return "";
  let str = val.toString();

  if (isPhone) {
    str = str.trim();
    if (!/^\+[1-9]\d{7,14}$/.test(str)) {
      return "";
    }
    return str;
  }

  // Защита от формульных инъекций (CSV/Sheets Formula Injection)
  // Проверяем опасные префиксы (=, +, -, @, \t, \r) включая скрытые за пробелами
  if (/^[\t\r\n\s]*[=+\-@]/.test(str) || /^[\t\r]/.test(str)) {
    if (str.length > maxLength) {
      str = str.slice(0, maxLength);
    }
    return "'" + str;
  }

  str = str.trim();
  if (str.length > maxLength) {
    str = str.slice(0, maxLength);
  }

  return str;
}

/**
 * Нормализует payload к канонической JSON-строке независимо от способа передачи
 */
function normalizePayloadToCanonicalString(payload) {
  if (!payload) return "";
  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload);
      return buildCanonicalJsonString(parsed);
    } catch (e) {
      return payload.trim();
    }
  }
  return buildCanonicalJsonString(payload);
}

/**
 * Строит каноническую строку для подписи HMAC-SHA256, покрывающую все значащие поля
 */
function buildCanonicalSignString(data) {
  const auth = data.auth || {};
  const envelope = {
    action: (data.action || "").toString().trim(),
    errorMessage: (data.errorMessage || "").toString().trim(),
    leadId: (data.leadId || "").toString().trim(),
    messageId: data.messageId !== undefined && data.messageId !== null ? data.messageId.toString().trim() : "",
    nonce: (auth.nonce || "").toString().trim(),
    notes: (data.notes || "").toString().trim(),
    payload: normalizePayloadToCanonicalString(data.payload),
    payloadHash: (data.payloadHash || "").toString().trim(),
    resolution: (data.resolution || "").toString().trim(),
    statusTokenHash: (data.statusTokenHash || "").toString().trim(),
    tgStatus: (data.tgStatus || "").toString().trim(),
    timestamp: auth.timestamp !== undefined && auth.timestamp !== null ? auth.timestamp.toString().trim() : ""
  };
  return buildCanonicalJsonString(envelope);
}

function verifyHmacAuth(body) {
  const auth = body.auth;
  if (!auth) {
    return { code: "UNAUTHORIZED_NO_AUTH", httpCode: 401, message: "Объект auth отсутствует в теле запроса" };
  }

  const timestamp = Number(auth.timestamp);
  const nonce = (auth.nonce || "").toString().trim();
  const signature = (auth.signature || "").toString().trim().toLowerCase();

  if (!timestamp || !nonce || !signature) {
    return { code: "UNAUTHORIZED_INVALID_AUTH_FORMAT", httpCode: 401, message: "auth должен содержать timestamp, nonce и signature" };
  }

  const now = Date.now();
  if (Math.abs(now - timestamp) > MAX_CLOCK_DRIFT_MS) {
    return { code: "TIMESTAMP_OUT_OF_WINDOW", httpCode: 401, message: "Временная метка запроса отклонена (дрейф более 5 минут)" };
  }

  if (nonce.length < 8 || nonce.length > 64) {
    return { code: "INVALID_NONCE_FORMAT", httpCode: 400, message: "Некорректная длина nonce" };
  }

  const secret = PropertiesService.getScriptProperties().getProperty("HMAC_SECRET");
  if (!secret) {
    return { code: "CONFIGURATION_ERROR", httpCode: 500, message: "HMAC_SECRET не настроен в Script Properties таблицы" };
  }

  const signableString = buildCanonicalSignString(body);
  const hmacBytes = Utilities.computeHmacSha256Signature(signableString, secret, Utilities.Charset.UTF_8);
  const expectedSignature = bytesToHex(hmacBytes);

  if (!timingSafeEqual(expectedSignature, signature)) {
    return { code: "INVALID_SIGNATURE", httpCode: 401, message: "HMAC-подпись запроса не совпадает" };
  }

  return null;
}

/**
 * Каноническая сериализация JSON (RFC 8785 совместимый канонический формат):
 * - рекурсивная обработка массивов и объектов
 * - сохранение массивов именно в виде массивов [a, b, c]
 * - сортировка ключей объектов по кодовым точкам Unicode
 * - числа, строки, булевы значения и null
 * - детерминированная обработка undefined, NaN и Infinity
 */
function buildCanonicalJsonString(val) {
  if (val === null) return "null";
  if (val === undefined) return undefined;

  const t = typeof val;
  if (t === "number") {
    if (!isFinite(val)) return "null"; // NaN, Infinity -> null
    return JSON.stringify(val);
  }
  if (t === "boolean" || t === "string") {
    return JSON.stringify(val);
  }

  if (Array.isArray(val)) {
    const items = val.map(function(item) {
      const res = buildCanonicalJsonString(item);
      return res === undefined ? "null" : res;
    });
    return "[" + items.join(",") + "]";
  }

  if (t === "object") {
    const sortedKeys = Object.keys(val).sort();
    const pairs = [];
    for (let i = 0; i < sortedKeys.length; i++) {
      const k = sortedKeys[i];
      const v = val[k];
      if (v !== undefined && typeof v !== "function" && typeof v !== "symbol") {
        const serialized = buildCanonicalJsonString(v);
        if (serialized !== undefined) {
          pairs.push(JSON.stringify(k) + ":" + serialized);
        }
      }
    }
    return "{" + pairs.join(",") + "}";
  }

  return JSON.stringify(val);
}

function bytesToHex(byteArray) {
  return byteArray.map(function(b) {
    return (b < 0 ? b + 256 : b).toString(16).padStart(2, "0");
  }).join("");
}

function computeSha256Hex(text) {
  const digestBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return bytesToHex(digestBytes);
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ И ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦЫ
// ============================================================================

function validateTableStructure(ss) {
  const leadsSheet = ss.getSheetByName(SHEET_LEADS_NAME);
  if (!leadsSheet) {
    return { ok: false, error: "SHEET_LEADS_MISSING", message: "Лист «Лиды» отсутствует в таблице" };
  }

  const actualLeadsHeaders = leadsSheet.getRange(1, 1, 1, LEADS_HEADERS.length).getValues()[0];
  for (let i = 0; i < LEADS_HEADERS.length; i++) {
    const expected = LEADS_HEADERS[i].trim();
    const actual = (actualLeadsHeaders[i] || "").toString().trim();
    if (actual !== expected) {
      return {
        ok: false,
        error: "LEADS_HEADERS_MISMATCH",
        message: "Несоответствие структуры листа «Лиды» в колонке " + (i + 1) + ": ожидалось «" + expected + "», обнаружено «" + actual + "»"
      };
    }
  }

  let fsmSheet = ss.getSheetByName(SHEET_FSM_NAME);
  if (!fsmSheet) {
    fsmSheet = ss.insertSheet(SHEET_FSM_NAME);
    fsmSheet.getRange(1, 1, 1, FSM_HEADERS.length).setValues([FSM_HEADERS]);
    formatFsmHeader(fsmSheet);
    try {
      fsmSheet.hideSheet();
    } catch (e) {}
  } else {
    const actualFsmHeaders = fsmSheet.getRange(1, 1, 1, FSM_HEADERS.length).getValues()[0];
    for (let j = 0; j < FSM_HEADERS.length; j++) {
      const expFsm = FSM_HEADERS[j].trim();
      const actFsm = (actualFsmHeaders[j] || "").toString().trim();
      if (actFsm !== expFsm) {
        return {
          ok: false,
          error: "FSM_HEADERS_MISMATCH",
          message: "Несоответствие структуры листа «_Тех_FSM» в колонке " + (j + 1) + ": ожидалось «" + expFsm + "», обнаружено «" + actFsm + "»"
        };
      }
    }
  }

  return { ok: true, leadsSheet: leadsSheet, fsmSheet: fsmSheet };
}

function jsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function findFsmEntry(fsmSheet, leadId) {
  const lastRow = fsmSheet.getLastRow();
  if (lastRow < 2) return null;

  const leadIds = fsmSheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < leadIds.length; i++) {
    if (leadIds[i][0].toString().trim() === leadId) {
      const rowIndex = i + 2;
      const rowValues = fsmSheet.getRange(rowIndex, 1, 1, FSM_HEADERS.length).getValues()[0];
      return {
        fsmRowIndex: rowIndex,
        leadId: rowValues[0].toString().trim(),
        sheetRow: Number(rowValues[1]),
        fsmState: rowValues[2].toString().trim(),
        payloadHash: rowValues[3].toString().trim(),
        statusTokenHash: rowValues[4].toString().trim(),
        createdAt: rowValues[5].toString().trim(),
        updatedAt: rowValues[6].toString().trim(),
        tgStatus: rowValues[7].toString().trim(),
        tgMessageId: rowValues[8].toString().trim(),
        notes: rowValues[9].toString().trim()
      };
    }
  }
  return null;
}

function findRowInLeadsByLeadId(leadsSheet, leadId) {
  const lastRow = leadsSheet.getLastRow();
  if (lastRow < 2) return -1;
  const ids = leadsSheet.getRange(2, 3, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0].toString().trim() === leadId) {
      return i + 2;
    }
  }
  return -1;
}

function formatLeadsHeader(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, LEADS_HEADERS.length);
  headerRange.setBackground("#1e293b");
  headerRange.setFontColor("#ffffff");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(11);
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setRowHeight(1, 40);
  sheet.setFrozenRows(1);

  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList([
      "🔥 Новый",
      "⏳ В работе",
      "🚗 Мастер выехал",
      "💵 Оплачено",
      "❌ Отказ / Спам"
    ], true)
    .build();
  sheet.getRange("L2:L1000").setDataValidation(statusRule);

  sheet.setColumnWidth(1, 100);
  sheet.setColumnWidth(2, 95);
  sheet.setColumnWidth(3, 110);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 155);
  sheet.setColumnWidth(6, 140);
  sheet.setColumnWidth(7, 220);
  sheet.setColumnWidth(8, 200);
  sheet.setColumnWidth(9, 140);
  sheet.setColumnWidth(10, 80);
  sheet.setColumnWidth(11, 130);
  sheet.setColumnWidth(12, 140);
  sheet.setColumnWidth(13, 160);
  sheet.setColumnWidth(14, 250);
  sheet.setColumnWidth(15, 140);
}

function formatFsmHeader(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, FSM_HEADERS.length);
  headerRange.setBackground("#334155");
  headerRange.setFontColor("#ffffff");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(10);
  sheet.setRowHeight(1, 30);
  sheet.setFrozenRows(1);
}

// ============================================================================
// ПОЛЬЗОВАТЕЛЬСКОЕ МЕНЮ И УТИЛИТЫ ДИСПЕТЧЕРА
// ============================================================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("❄️ МоскХолод — Диспетчер")
    .addItem("🛠️ Сверить выбранную заявку (ручн.)", "menuReconcileSelectedLead")
    .addSeparator()
    .addItem("🔍 Сверить целостность (диагностика)", "reconcileSheets")
    .addItem("⚙️ Инициализировать структуру таблицы", "setupSheet")
    .addSeparator()
    .addItem("🧪 Запустить смоук-тест HMAC", "testSmokeHmac")
    .addToUi();
}

/**
 * Пользовательское меню: Безопасная ручная сверка выделенной строки
 * Выполняется в контексте пользователя за клавиатурой (Session.getActiveUser())
 */
function menuReconcileSelectedLead() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheet = ss.getActiveSheet();

  if (!activeSheet || activeSheet.getName() !== SHEET_LEADS_NAME) {
    ui.alert("⚠️ Пожалуйста, перейдите на лист «" + SHEET_LEADS_NAME + "» и выберите строку с заявкой.");
    return;
  }

  const activeCell = activeSheet.getActiveCell();
  if (!activeCell) {
    ui.alert("⚠️ Выберите ячейку в строке с заявкой.");
    return;
  }

  const activeRow = activeCell.getRow();
  if (activeRow < 2 || activeRow > activeSheet.getLastRow()) {
    ui.alert("⚠️ Выберите строку с заявкой (начиная со строки 2).");
    return;
  }

  const leadId = activeSheet.getRange(activeRow, 3).getValue().toString().trim();
  if (!leadId) {
    ui.alert("⚠️ В выбранной строке отсутствует ID заявки (колонка C).");
    return;
  }

  const fsmSheet = ss.getSheetByName(SHEET_FSM_NAME);
  if (!fsmSheet) {
    ui.alert("⚠️ Лист «" + SHEET_FSM_NAME + "» не найден. Выполните инициализацию таблицы.");
    return;
  }

  const fsmEntry = findFsmEntry(fsmSheet, leadId);
  if (!fsmEntry) {
    ui.alert("⚠️ Заявка " + leadId + " не найдена в журнале FSM. Сверка невозможна.");
    return;
  }

  const currentState = fsmEntry.fsmState;
  const eligibleStates = ["TG_STATUS_UNKNOWN", "SAVED_TG_FAILED", "CLAIMED"];
  if (eligibleStates.indexOf(currentState) === -1) {
    ui.alert(
      "❌ Ручная сверка отклонена.\n\n" +
      "Текущее состояние FSM: " + currentState + ".\n" +
      "Ручная сверка разрешена только для состояний: " + eligibleStates.join(", ") + "."
    );
    return;
  }

  const confirmRes = ui.alert(
    "Сверка заявки: " + leadId,
    "Текущий статус FSM: " + currentState + "\n\n" +
    "Подтвердить успешную доставку в Telegram диспетчером?",
    ui.ButtonSet.YES_NO
  );

  if (confirmRes !== ui.Button.YES) {
    ui.alert("Сверка отменена пользователем.");
    return;
  }

  const promptRes = ui.prompt(
    "Основание сверки",
    "Укажите причину подтверждения (например: «Проверено в группе Telegram вручную»):",
    ui.ButtonSet.OK_CANCEL
  );

  if (promptRes.getSelectedButton() !== ui.Button.OK) {
    ui.alert("Сверка отменена: не указано основание.");
    return;
  }

  const userReason = promptRes.getResponseText().trim();
  if (!userReason) {
    ui.alert("❌ Ошибка: основание сверки не может быть пустым.");
    return;
  }

  let userEmail = "";
  try {
    userEmail = Session.getActiveUser().getEmail();
  } catch (e) {}

  const result = executeReconciliation({
    leadId: leadId,
    resolution: "RESOLVE_COMMITTED",
    reason: userReason,
    channel: "SHEET_UI_MENU",
    actorEmail: userEmail
  });

  if (result.ok) {
    ui.alert("✅ Заявка " + leadId + " успешно сведена в COMMITTED.");
  } else {
    ui.alert("❌ Ошибка сверки: " + result.message);
  }
}

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let leadsSheet = ss.getSheetByName(SHEET_LEADS_NAME);
  if (!leadsSheet) {
    leadsSheet = ss.insertSheet(SHEET_LEADS_NAME, 0);
    leadsSheet.getRange(1, 1, 1, LEADS_HEADERS.length).setValues([LEADS_HEADERS]);
  }
  formatLeadsHeader(leadsSheet);

  let fsmSheet = ss.getSheetByName(SHEET_FSM_NAME);
  if (!fsmSheet) {
    fsmSheet = ss.insertSheet(SHEET_FSM_NAME);
    fsmSheet.getRange(1, 1, 1, FSM_HEADERS.length).setValues([FSM_HEADERS]);
  }
  formatFsmHeader(fsmSheet);
  try {
    fsmSheet.hideSheet();
  } catch (e) {}

  SpreadsheetApp.getUi().alert("✅ Структура таблицы «МоскХолод» успешно проверена и инициализирована!");
}

function reconcileSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const leadsSheet = ss.getSheetByName(SHEET_LEADS_NAME);
  const fsmSheet = ss.getSheetByName(SHEET_FSM_NAME);

  if (!leadsSheet || !fsmSheet) {
    SpreadsheetApp.getUi().alert("Один из листов отсутствует. Запустите инициализацию.");
    return;
  }

  const leadsLastRow = leadsSheet.getLastRow();
  const fsmLastRow = fsmSheet.getLastRow();

  let unlinkedLeads = 0;

  if (leadsLastRow >= 2) {
    const leadsIds = leadsSheet.getRange(2, 3, leadsLastRow - 1, 1).getValues();
    for (let i = 0; i < leadsIds.length; i++) {
      const rowId = leadsIds[i][0].toString().trim();
      if (rowId && !findFsmEntry(fsmSheet, rowId)) {
        unlinkedLeads++;
        leadsSheet.getRange(i + 2, 15).setValue("⚠️ Нет в FSM");
      }
    }
  }

  SpreadsheetApp.getUi().alert(
    "Сверка завершена.\n" +
    "Заявок в «Лиды»: " + (leadsLastRow > 1 ? leadsLastRow - 1 : 0) + "\n" +
    "Записей в «_Тех_FSM»: " + (fsmLastRow > 1 ? fsmLastRow - 1 : 0) + "\n" +
    "Несогласованных строк: " + unlinkedLeads
  );
}

/**
 * Смоук-тест реальной аутентификации verifyHmacAuth() через Script Properties
 */
function testSmokeHmac() {
  const secret = PropertiesService.getScriptProperties().getProperty("HMAC_SECRET");
  if (!secret) {
    const alertMsg = "Смоук-тест отменён: HMAC_SECRET не настроен в Script Properties таблицы. Задайте секрет в настройках проекта.";
    Logger.log(alertMsg);
    try { SpreadsheetApp.getUi().alert(alertMsg); } catch (e) {}
    return;
  }

  const now = Date.now();
  const testNonce = "smoke-nonce-" + Math.random().toString(36).substring(2, 10);
  const testPayload = {
    action: "smoke_check",
    brand: "test_brand",
    name: "Тестовый Клиент"
  };

  const testReq = {
    action: "record_and_claim_lead",
    leadId: "smoke-lead-" + now,
    payload: testPayload,
    payloadHash: computeSha256Hex(buildCanonicalJsonString(testPayload)),
    statusTokenHash: computeSha256Hex("smoke-token-" + now),
    auth: {
      timestamp: now,
      nonce: testNonce
    }
  };

  const signable = buildCanonicalSignString(testReq);
  const hmacBytes = Utilities.computeHmacSha256Signature(signable, secret, Utilities.Charset.UTF_8);
  testReq.auth.signature = bytesToHex(hmacBytes);

  const authErr = verifyHmacAuth(testReq);
  const pass = (authErr === null);

  const resultMsg = pass
    ? "✅ Смоук-тест успешен: verifyHmacAuth() с реальным HMAC_SECRET подтвердил валидность подписи."
    : "❌ Смоук-тест не пройден: " + (authErr ? authErr.message : "неизвестная ошибка");

  Logger.log(resultMsg);
  try { SpreadsheetApp.getUi().alert(resultMsg); } catch (e) {}
}
