#!/usr/bin/env node
/**
 * МоскХолод Сервис — Telegram Integration Helper
 * 
 * Назначение:
 * 1. listen-group: Безопасное определение ID группового чата «МоскХолод — заявки»
 * 2. test: Проверка доставки тестовой заявки в указанный чат
 * 
 * Требования безопасности:
 * - Токен никогда не выводится в терминал (ни полностью, ни в маскированном виде как переменная).
 * - Строгая проверка группового чата (chat.type: group/supergroup и chat.id < 0).
 * - Поддержка Privacy Mode бота (команды /id и /id@BotUsername).
 * - Защита от захвата личных сообщений и посторонних групп.
 * - Остановка при HTTP 409 (Webhook) без автоматического удаления.
 */

const args = process.argv.slice(2);
const command = args[0] || 'help';

function getArgValue(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const token = getArgValue('--token') || process.env.TELEGRAM_BOT_TOKEN;
const chatId = getArgValue('--chat-id') || process.env.TELEGRAM_CHAT_ID;
const expectedGroupFilter = getArgValue('--group-title') || 'МоскХолод';

async function callTelegram(method, body = {}) {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (netErr) {
    throw new Error(`Ошибка сети при обращении к Telegram API: ${netErr.message}`);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.ok) {
    const err = new Error(data.description || res.statusText || 'Неизвестная ошибка Telegram API');
    err.status = res.status;
    err.code = data.error_code || res.status;
    throw err;
  }
  return data.result;
}

async function verifyBot() {
  if (!token) {
    console.error('❌ Ошибка: Токен бота не указан.');
    console.error('   Используйте флаг: --token <ТОКЕН>');
    process.exit(1);
  }

  try {
    const me = await callTelegram('getMe');
    console.log('🔍 Проверка бота: успешно');
    console.log(`🤖 Бот: @${me.username} (${me.first_name})`);
    console.log(`🔒 Статус токена: [активен, длина: ${token.length} симв.]`);
    return me;
  } catch (err) {
    if (err.code === 401 || err.status === 401) {
      console.error('❌ Ошибка авторизации бота (HTTP 401 Unauthorized):');
      console.error('   Указанный токен недействителен. Проверьте правильность токена от @BotFather.');
      process.exit(1);
    }
    console.error(`❌ Ошибка проверки бота: ${err.message}`);
    process.exit(1);
  }
}

async function runListenGroup() {
  const bot = await verifyBot();
  const botUsername = (bot.username || '').toLowerCase();

  console.log('\n============================================================');
  console.log('👥 РЕЖИМ ПОДКЛЮЧЕНИЯ ГРУППОВОГО ЧАТА «МОСКХОЛОД»');
  console.log('============================================================');
  console.log(`1. Убедитесь, что бот @${bot.username} добавлен в группу «МоскХолод — заявки».`);
  console.log(`2. Откройте группу и отправьте команду: /id или /id@${bot.username}`);
  console.log(`3. Фильтр целевой группы: название должно содержать "${expectedGroupFilter}"`);
  console.log('4. Ожидаем команду из группы (таймаут 90 секунд)...\n');

  const startTime = Date.now();
  let lastUpdateId = 0;

  while (Date.now() - startTime < 90000) {
    try {
      const updates = await callTelegram('getUpdates', {
        offset: lastUpdateId + 1,
        timeout: 5,
        allowed_updates: ['message'],
      });

      for (const update of updates) {
        lastUpdateId = update.update_id;

        if (!update.message || !update.message.chat) {
          continue;
        }

        const chat = update.message.chat;
        const chatType = chat.type || 'unknown';
        const rawText = (update.message.text || '').trim();

        // 1. Фильтрация личных сообщений (не принимаем)
        if (chatType === 'private' || chat.id >= 0) {
          const sender = chat.username ? `@${chat.username}` : (chat.first_name || 'пользователь');
          console.log(`ℹ️ [Пропущено] Личное сообщение от ${sender}. Ожидаем команду /id именно в групповом чате.`);
          continue;
        }

        // 2. Проверка, что это именно групповой чат
        const isGroupChat = (chatType === 'group' || chatType === 'supergroup') && chat.id < 0;
        if (!isGroupChat) {
          console.log(`ℹ️ [Пропущено] Чат типа "${chatType}". Ожидаем групповой чат.`);
          continue;
        }

        // 3. Фильтрация посторонних групп (проверка по названию)
        const groupTitle = chat.title || '';
        if (!groupTitle.toLowerCase().includes(expectedGroupFilter.toLowerCase())) {
          console.log(`⚠️ [Пропущено] Сообщение из посторонней группы "${groupTitle}" (ID: ${chat.id}). Название не содержит "${expectedGroupFilter}".`);
          continue;
        }

        // 4. Проверка команды /id с учётом суффикса @BotUsername (поддержка Privacy Mode)
        const commandLower = rawText.toLowerCase();
        const isTargetCommand = commandLower === '/id' || commandLower === `/id@${botUsername}`;

        if (!isTargetCommand) {
          console.log(`ℹ️ [Пропущено] В группе "${groupTitle}" получено: "${rawText}". Отправьте именно команду /id`);
          continue;
        }

        // 5. Успешный захват целевой группы
        console.log('🎉 ЦЕЛЕВАЯ ГРУППА УСПЕШНО ОПРЕДЕЛЕНА!');
        console.log('------------------------------------------------------------');
        console.log(`📌 Название группы: "${groupTitle}"`);
        console.log(`🏷  Тип чата:        ${chatType} (проверено)`);
        console.log(`🆔 Chat ID группы:  ${chat.id}`);
        console.log('------------------------------------------------------------');

        // Отправка подтверждающего сообщения в группу
        try {
          await callTelegram('sendMessage', {
            chat_id: chat.id,
            text: `✅ <b>Группа «${groupTitle}» успешно подключена!</b>\n\nБот @${bot.username} зафиксировал ID группы: <code>${chat.id}</code>\nСюда будут поступать новые заявки на ремонт холодильников с сайта.`,
            parse_mode: 'HTML',
          });
          console.log('✅ В группу отправлено подтверждающее сервисное сообщение.');
        } catch (sendErr) {
          console.warn(`⚠️ Не удалось отправить подтверждение в группу: ${sendErr.message}`);
        }

        console.log('\n📋 СЛЕДУЮЩИЙ ШАГ:');
        console.log(`Для боевого сервера используйте Chat ID: ${chat.id}`);
        console.log('(Значение токена используйте сохранённое у вас, оно не отображается в логах)');
        return;
      }
    } catch (err) {
      // 5. Обработка конфликтов Webhook (HTTP 409)
      if (err.code === 409 || err.status === 409) {
        console.error('\n❌ ОШИБКА: ОБНАРУЖЕН КОНФЛИКТ WEBHOOK (HTTP 409 Conflict)');
        console.error('------------------------------------------------------------');
        console.error('На данном боте включён активный Webhook, поэтому метод getUpdates');
        console.error('заблокирован сервером Telegram.');
        console.error('\nИнструкция для решения:');
        console.error('Если этот бот ранее привязывался к другому сервису, необходимо');
        console.error('сбросить старый вебхук. Автоматический сброс отключён по правилам безопасности.');
        console.error('Скрипт остановлен.');
        process.exit(1);
      }

      console.error(`⚠️ Ошибка опроса: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('\n⏱️ Время ожидания (90 сек) истекло.');
  console.log(`Убедитесь, что бот @${bot.username} добавлен в группу и вы отправили /id`);
}

async function runTest() {
  await verifyBot();
  if (!chatId) {
    console.error('❌ Ошибка: Не указан chat-id.');
    console.error('   Используйте: --chat-id <ID_ГРУППЫ>');
    process.exit(1);
  }

  const numericId = Number(chatId);
  if (isNaN(numericId) || numericId >= 0) {
    console.warn(`⚠️ Предупреждение: Chat ID (${chatId}) не является отрицательным числом.`);
    console.warn('   Для групп Telegram ID обычно начинается с минуса (например, -100xxxxxxxxxx).');
  }

  console.log('🚀 Отправляем тестовую заявку...');

  const testMessage = `❄️ <b>ТЕСТОВОЕ УВЕДОМЛЕНИЕ | МОСКХОЛОД СЕРВИС</b>

👤 <b>Клиент:</b> Тестовая Проверка
📞 <b>Телефон:</b> <code>+7 (999) 000-00-00</code>
📍 <b>Район:</b> Москва, м. Сокол
🧊 <b>Техника:</b> Холодильник Bosch (Не морозит)
⚡️ <b>Срочность:</b> В течение 1-2 часов
🏷 <b>Скидка:</b> 10%
💰 <b>Оценка:</b> от 1 350 ₽

⏱ <i>Канал Telegram-группы настроен корректно.</i>`;

  const sent = await callTelegram('sendMessage', {
    chat_id: chatId,
    text: testMessage,
    parse_mode: 'HTML',
  });

  console.log(`✅ Тестовое сообщение успешно доставлено в чат! (Message ID: ${sent.message_id})`);
}

function showHelp() {
  console.log(`
Использование telegram-helper.mjs:

1. Определение ID группы (отправьте /id в группе):
   node scripts/telegram-helper.mjs listen-group --token <ТОКЕН_БОТА>

2. Тестовое сообщение в группу:
   node scripts/telegram-helper.mjs test --token <ТОКЕН_БОТА> --chat-id <ID_ГРУППЫ>
`);
}

switch (command) {
  case 'listen-group':
  case 'listen':
    runListenGroup().catch(console.error);
    break;
  case 'test':
    runTest().catch(console.error);
    break;
  default:
    showHelp();
}

