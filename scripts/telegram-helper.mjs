#!/usr/bin/env node
/**
 * MoskKholod Telegram Bot Setup & Diagnostic Helper
 * 
 * Capabilities:
 * 1. listen: Auto-discovers Sergey's Telegram Chat ID when he sends any message to the bot.
 * 2. test: Sends a realistic styled test lead notification to verify delivery.
 * 
 * Usage:
 *   node scripts/telegram-helper.mjs listen --token <BOT_TOKEN>
 *   node scripts/telegram-helper.mjs test --token <BOT_TOKEN> --chat-id <CHAT_ID>
 */

const args = process.argv.slice(2);
const command = args[0] || 'help';

function getArgValue(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const token = getArgValue('--token') || process.env.TELEGRAM_BOT_TOKEN;
const chatId = getArgValue('--chat-id') || process.env.TELEGRAM_CHAT_ID;

async function callTelegram(method, body = {}) {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram API [${method}] Error: ${data.description || 'Unknown error'} (Code: ${data.error_code})`);
  }
  return data.result;
}

async function verifyBot() {
  if (!token) {
    console.error('❌ Ошибка: Не указан токен бота. Используйте флаг --token <ВАШ_ТОКЕН> или задайте переменную TELEGRAM_BOT_TOKEN');
    process.exit(1);
  }
  console.log('🔍 Проверяем токен бота...');
  const me = await callTelegram('getMe');
  console.log(`✅ Бот активен: @${me.username} (${me.first_name}, ID: ${me.id})`);
  return me;
}

async function runListen() {
  const bot = await verifyBot();
  console.log('\n============================================================');
  console.log(`📱 АВТООПРЕДЕЛЕНИЕ CHAT_ID ДЛЯ СЕРГЕЯ`);
  console.log('============================================================');
  console.log(`1. Откройте Telegram и найдите бота: https://t.me/${bot.username}`);
  console.log(`2. Нажмите кнопку "Запустить" (/start) или отправьте боту любое слово (например: "Привет")`);
  console.log(`3. Ожидаем входящее сообщение (таймаут 90 секунд)...\n`);

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
        if (update.message && update.message.chat) {
          const chat = update.message.chat;
          const senderName = [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || 'Пользователь';
          
          console.log(`🎉 НАЙДЕН ПОЛЬЗОВАТЕЛЬ!`);
          console.log(`------------------------------------------------------------`);
          console.log(`👤 Имя:     ${senderName} (@${chat.username || 'нет_юзернейма'})`);
          console.log(`🆔 Chat ID: ${chat.id}`);
          console.log(`💬 Текст:   "${update.message.text || '<медиа>'}"`);
          console.log(`------------------------------------------------------------`);

          // Send confirmation back to user
          await callTelegram('sendMessage', {
            chat_id: chat.id,
            text: `✅ <b>Система «МоскХолод» подключена!</b>\n\nЗдравствуйте, ${senderName}! Ваш Telegram успешно привязан. Сюда будут мгновенно поступать все новые заявки на ремонт холодильников с сайта.`,
            parse_mode: 'HTML',
          });

          console.log(`\n✅ В Telegram отправлено подтверждающее сообщение!`);
          console.log(`\n📋 ДАННЫЕ ДЛЯ NETLIFY:`);
          console.log(`TELEGRAM_BOT_TOKEN=${token}`);
          console.log(`TELEGRAM_CHAT_ID=${chat.id}`);
          console.log(`\nКоманда для установки через Netlify CLI:`);
          console.log(`netlify env:set TELEGRAM_BOT_TOKEN "${token}"`);
          console.log(`netlify env:set TELEGRAM_CHAT_ID "${chat.id}"`);
          return;
        }
      }
    } catch (err) {
      console.error(`⚠️ Ошибка опроса: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('\n⏱️ Время ожидания истекло. Пожалуйста, убедитесь, что вы отправили сообщение именно боту @' + bot.username);
}

async function runTest() {
  await verifyBot();
  if (!chatId) {
    console.error('❌ Ошибка: Не указан chat-id. Используйте флаг --chat-id <ID> или запустите режим `listen`');
    process.exit(1);
  }

  console.log(`🚀 Отправляем тестовую заявку в чат: ${chatId}...`);

  const testMessage = `❄️ <b>ТЕСТОВАЯ ЗАЯВКА #REQ-TEST</b>

👤 <b>Клиент:</b> Тестовый Заказчик
📞 <b>Телефон:</b> <code>+7 (999) 000-00-00</code>
📍 <b>Район:</b> Москва, м. Сокол
🧊 <b>Техника:</b> Холодильник Liebherr (Не морозит верхняя камера)
⚡️ <b>Срочность:</b> В течение 1-2 часов
🏷 <b>Скидка:</b> 10%
💰 <b>Оценка:</b> от 1 350 ₽

⏱ <i>Канал Telegram настроен корректно. Заявки готовы к приёму.</i>`;

  const sent = await callTelegram('sendMessage', {
    chat_id: chatId,
    text: testMessage,
    parse_mode: 'HTML',
  });

  console.log(`✅ Тестовая заявка успешно доставлена в Telegram! (Message ID: ${sent.message_id})`);
}

function showHelp() {
  console.log(`
Использование telegram-helper.mjs:

1. Автоматически узнать Chat ID Сергея (он просто пишет боту):
   node scripts/telegram-helper.mjs listen --token <ТОКЕН_БОТА>

2. Проверить доставку тестового лида:
   node scripts/telegram-helper.mjs test --token <ТОКЕН_БОТА> --chat-id <CHAT_ID>
`);
}

switch (command) {
  case 'listen':
    runListen().catch(console.error);
    break;
  case 'test':
    runTest().catch(console.error);
    break;
  default:
    showHelp();
}
