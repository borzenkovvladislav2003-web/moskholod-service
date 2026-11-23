/**
 * Google Apps Script: Лид-Реестр Сергея (Ремонт холодильников в Москве)
 * 
 * ИНСТРУКЦИЯ ПО НАСТРОЙКЕ ЗА 2 МИНУТЫ:
 * 1. Создайте новую Google Таблицу (назовите её, например: "EvaLex / МосХолод — Заявки").
 * 2. В меню выберите: Расширения (Extensions) -> Apps Script.
 * 3. Удалите стандартный код и вставьте этот файл целиком.
 * 4. Запустите один раз функцию `setupSheet` (нажмите Выполнить / Run) — таблица сама красиво оформится!
 * 5. Нажмите: Развернуть (Deploy) -> Новое развертывание (New deployment).
 * 6. Выберите тип: "Веб-приложение" (Web app).
 * 7. В поле "У кого есть доступ" (Who has access) выберите: "Все" (Anyone).
 * 8. Нажмите "Развернуть" и скопируйте полученную ссылку веб-приложения (URL).
 */

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Лиды");
  if (!sheet) {
    sheet = ss.insertSheet("Лиды", 0);
  }

  // Заголовки таблицы
  const headers = [
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
    "Статус",
    "Назначенный мастер",
    "Заметки диспетчера"
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Стилизация шапки
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#1e293b"); // Slate 800
  headerRange.setFontColor("#ffffff");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(11);
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setRowHeight(1, 40);

  // Закрепить первую строку
  sheet.setFrozenRows(1);

  // Ширина колонок
  sheet.setColumnWidth(1, 100); // Дата
  sheet.setColumnWidth(2, 95);  // Время
  sheet.setColumnWidth(3, 110); // ID
  sheet.setColumnWidth(4, 150); // Имя
  sheet.setColumnWidth(5, 155); // Телефон
  sheet.setColumnWidth(6, 140); // Марка
  sheet.setColumnWidth(7, 220); // Неисправность
  sheet.setColumnWidth(8, 200); // Округ / Метро
  sheet.setColumnWidth(9, 160); // Срочность
  sheet.setColumnWidth(10, 80); // Скидка
  sheet.setColumnWidth(11, 130); // Стоимость
  sheet.setColumnWidth(12, 140); // Статус
  sheet.setColumnWidth(13, 160); // Мастер
  sheet.setColumnWidth(14, 250); // Заметки

  // Валидация выпадающего списка для колонки "Статус" (Колонка L / 12)
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

  // Форматирование телефонов
  sheet.getRange("E2:E1000").setNumberFormat("@");

  Logger.log("Таблица успешно настроена и отформатирована!");
}

function doPost(e) {
  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000); // Защита от конкурентной записи

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Лиды");
    if (!sheet) {
      setupSheet();
      sheet = ss.getSheetByName("Лиды");
    }

    const payload = JSON.parse(e.postData.contents);

    const now = new Date();
    const dateStr = payload.date || Utilities.formatDate(now, "Europe/Moscow", "dd.MM.yyyy");
    const timeStr = payload.time || Utilities.formatDate(now, "Europe/Moscow", "HH:mm");

    const row = [
      dateStr,
      timeStr,
      payload.id || "REQ-AUTO",
      payload.name || "Аноним",
      payload.phone || "",
      payload.brand || "Не указана",
      payload.breakdown || "Диагностика",
      (payload.district || "") + (payload.metro ? " (" + payload.metro + ")" : ""),
      payload.urgency || "Срочно",
      payload.discount || "15%",
      payload.estimatedPrice || "от 1 350 ₽",
      "🔥 Новый",
      "", // Мастер
      ""  // Заметки
    ];

    sheet.appendRow(row);

    // Подсветка новой строки
    const lastRow = sheet.getLastRow();
    const rowRange = sheet.getRange(lastRow, 1, 1, row.length);
    rowRange.setVerticalAlignment("middle");
    sheet.setRowHeight(lastRow, 32);

    lock.releaseLock();

    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      row: lastRow,
      id: payload.id 
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    service: "MosKholod Lead Collector",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
