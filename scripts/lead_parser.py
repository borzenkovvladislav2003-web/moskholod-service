#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Парсер и мониторинг чатов ЖК Москвы для получения горячих лидов по ремонту холодильников без рекламы.
Проект: Оффер 1 (Сергей)
"""

import re
import sys
import time
import json
import random
import urllib.request
import urllib.parse
from datetime import datetime

# Ключевые слова-триггеры (поиск проблемы)
POSITIVE_KEYWORDS = [
    r'холодильник',
    r'холодильниц',
    r'не морозит',
    r'не холодит',
    r'потек',
    r'потекла вода',
    r'намерзает лед',
    r'шумит компрессор',
    r'заправить фреон',
    r'утечка фреона',
    r'мастер по холодильник',
    r'посоветуйте мастера',
    r'починить холодильник',
    r'сломался холодильник',
    r'гудит холодильник',
]

# Минус-слова (отсекаем продажи б/у, спам, аренду)
NEGATIVE_KEYWORDS = [
    r'продам',
    r'куплю',
    r'отдам даром',
    r'б/у',
    r'бу ',
    r'аренда',
    r'сдам квартиру',
    r'сниму квартиру',
    r'магнит на холодильник',
]

MOSCOW_CHATS = [
    {"name": "ЖК Сердце Столицы (СЗАО)", "link": "https://t.me/serdtse_stolitsy_chat", "district": "СЗАО (Шелепиха)"},
    {"name": "ЖК Зиларт (ЮАО)", "link": "https://t.me/zilart_live", "district": "ЮАО (Автозаводская)"},
    {"name": "ЖК Символ (ЮВАО)", "link": "https://t.me/simvol_residents", "district": "ЮВАО (Лефортово)"},
    {"name": "ЖК Савеловский Сити (СВАО)", "link": "https://t.me/savelovsky_chat", "district": "СВАО (Дмитровская)"},
    {"name": "ЖК Небо / Раменки (ЗАО)", "link": "https://t.me/nebo_ramenki", "district": "ЗАО (Раменки)"},
    {"name": "Чат Сокол и Аэропорт (САО)", "link": "https://t.me/sokol_aeroport", "district": "САО (Сокол)"},
]

DEMO_MESSAGES = [
    {
        "author": "Мария В.",
        "username": "@maria_msk_21",
        "text": "Соседи, добрый день! Подскажите толкового мастера, у нас потек холодильник Bosch, снизу вода собирается под ящиками. Срочно нужно!",
        "chat_idx": 0
    },
    {
        "author": "Артём",
        "username": "@artem_invest",
        "text": "Кто знает проверенного мастера по холодильникам? Морозилка перестала морозить, компрессор щелкает и отключается. Территориально 2 корпус.",
        "chat_idx": 1
    },
    {
        "author": "Екатерина",
        "username": "@katya_lefortovo",
        "text": "Здравствуйте! Посоветуйте ремонт бытовой техники, холодильник Атлант сильно гудит и намерзает огромная шуба на задней стенке.",
        "chat_idx": 2
    },
    {
        "author": "Денис С.",
        "username": "@denis_savel",
        "text": "У кого есть контакты нормального мастера по холодильникам в нашем доме? Перестал холодить, продукты портятся.",
        "chat_idx": 3
    }
]

def is_lead_message(text: str) -> bool:
    """Проверяет текст на наличие проблемы с холодильником и отсутствие минус-слов"""
    text_lower = text.lower()
    
    # 1. Проверяем минус-слова
    for neg in NEGATIVE_KEYWORDS:
        if re.search(neg, text_lower):
            return False
            
    # 2. Проверяем плюс-слова
    for pos in POSITIVE_KEYWORDS:
        if re.search(pos, text_lower):
            return True
            
    return False

def send_telegram_alert(bot_token: str, chat_id: str, alert_data: dict) -> bool:
    """Отправляет карточку найденного лида в Telegram-группу диспетчеров"""
    if not bot_token or not chat_id:
        print("[!] Токен или Chat ID Telegram не указаны. Печатаем карточку в консоль:")
        print(json.dumps(alert_data, ensure_ascii=False, indent=2))
        return True

    text = (
        f"🎯 <b>НАЙДЕН ГОРЯЧИЙ ЗАПРОС В ЧАТЕ ЖК!</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"📍 <b>Локация:</b> {alert_data['chat_name']} ({alert_data['district']})\n"
        f"👤 <b>Житель:</b> {alert_data['author']} ({alert_data['username']})\n"
        f"💬 <b>Запрос:</b> <i>«{alert_data['text']}»</i>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"⏱ <b>Время обнаружения:</b> {datetime.now().strftime('%H:%M:%S')}\n"
        f"⚡ <b>Что делать:</b> напишите жителю в ЛС с предложением выезда дежурного мастера!"
    )

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "reply_markup": {
            "inline_keyboard": [
                [
                    {
                        "text": f"📩 Написать в Telegram ({alert_data['username']})",
                        "url": f"https://t.me/{alert_data['username'].lstrip('@')}"
                    }
                ]
            ]
        }
    }

    try:
        req = urllib.request.Request(
            url, 
            data=json.dumps(payload).encode('utf-8'), 
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            res = json.loads(resp.read().decode('utf-8'))
            return res.get('ok', False)
    except Exception as e:
        print(f"[-] Ошибка отправки в Telegram: {e}")
        return False

def run_simulation(bot_token: str = None, chat_id: str = None):
    """Демо-режим: показывает Сергею, как в реальном времени отлавливаются клиенты"""
    print("=" * 65)
    print("  МОНИТОРИНГ ЧАТОВ ЖК И ДОМОВ МОСКВЫ ЗАПУЩЕН")
    print(f"  Активных чатов на отслеживании: {len(MOSCOW_CHATS)}")
    print("  Целевая услуга: Ремонт холодильников на дому")
    print("=" * 65)
    
    for i, demo in enumerate(DEMO_MESSAGES, start=1):
        chat = MOSCOW_CHATS[demo['chat_idx']]
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Сканирование чата: {chat['name']}...")
        time.sleep(1.5)
        
        if is_lead_message(demo['text']):
            print(f"  🔥 ОБНАРУЖЕН ЦЕЛЕВОЙ ЗАПРОС!")
            print(f"  Житель: {demo['author']} ({demo['username']})")
            print(f"  Текст: {demo['text']}")
            
            lead_payload = {
                "chat_name": chat['name'],
                "district": chat['district'],
                "author": demo['author'],
                "username": demo['username'],
                "text": demo['text']
            }
            
            if bot_token and chat_id:
                sent = send_telegram_alert(bot_token, chat_id, lead_payload)
                if sent:
                    print(f"  ✅ Карточка успешно отправлена в Telegram-чат Сергея!")
            else:
                print(f"  ℹ️ (Для отправки прямо в Telegram передайте bot_token и chat_id)")
        
        if i < len(DEMO_MESSAGES):
            print("  Ожидание новых сообщений...")
            time.sleep(2)

    print("\n" + "=" * 65)
    print("  СИМУЛЯЦИЯ ЗАВЕРШЕНА. НАЙДЕНО ЛИДОВ: 4 ИЗ 4")
    print("=" * 65)

if __name__ == '__main__':
    token = sys.argv[1] if len(sys.argv) > 1 else None
    chat = sys.argv[2] if len(sys.argv) > 2 else None
    run_simulation(token, chat)
