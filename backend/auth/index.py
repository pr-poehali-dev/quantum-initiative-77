import json
import os
import random
import psycopg2

def get_conn():
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    return conn

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p93752303_quantum_initiative_7')

def handler(event: dict, context) -> dict:
    """Авторизация по номеру телефона: отправка и верификация OTP-кода"""
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    action = body.get('action')

    conn = get_conn()
    cur = conn.cursor()

    if action == 'send_otp':
        phone = body.get('phone', '').strip()
        if not phone:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Введите номер телефона'})}

        code = str(random.randint(100000, 999999))

        cur.execute(
            f"INSERT INTO {SCHEMA}.otp_codes (phone, code) VALUES (%s, %s)",
            (phone, code)
        )

        # В продакшн здесь нужно отправить SMS, пока возвращаем код в ответе для теста
        print(f"OTP for {phone}: {code}")

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'success': True, 'message': 'Код отправлен', 'dev_code': code})
        }

    if action == 'verify_otp':
        phone = body.get('phone', '').strip()
        code = body.get('code', '').strip()

        cur.execute(
            f"SELECT id FROM {SCHEMA}.otp_codes WHERE phone = %s AND code = %s AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
            (phone, code)
        )
        row = cur.fetchone()

        if not row:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Неверный или истёкший код'})}

        otp_id = row[0]
        cur.execute(f"UPDATE {SCHEMA}.otp_codes SET used = TRUE WHERE id = %s", (otp_id,))

        # Создаём или находим пользователя
        cur.execute(f"SELECT id, name, avatar_letter FROM {SCHEMA}.users WHERE phone = %s", (phone,))
        user_row = cur.fetchone()

        if not user_row:
            avatar = phone[-1] if phone else 'U'
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (phone, name, avatar_letter) VALUES (%s, %s, %s) RETURNING id, name, avatar_letter",
                (phone, f'User{phone[-4:]}', avatar.upper())
            )
            user_row = cur.fetchone()

        user_id, name, avatar_letter = user_row

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'success': True, 'user': {'id': user_id, 'name': name, 'avatar_letter': avatar_letter, 'phone': phone}})
        }

    return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Неизвестное действие'})}
