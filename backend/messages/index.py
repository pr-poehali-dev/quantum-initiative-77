import json
import os
import psycopg2

def get_conn():
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    return conn

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p93752303_quantum_initiative_7')

def handler(event: dict, context) -> dict:
    """Получение и отправка сообщений в канале"""
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    method = event.get('httpMethod')
    conn = get_conn()
    cur = conn.cursor()

    if method == 'GET':
        channel = (event.get('queryStringParameters') or {}).get('channel', 'general')
        cur.execute(
            f"""SELECT m.id, m.text, m.created_at, u.name, u.avatar_letter
                FROM {SCHEMA}.messages m
                JOIN {SCHEMA}.users u ON m.user_id = u.id
                WHERE m.channel = %s
                ORDER BY m.created_at ASC
                LIMIT 100""",
            (channel,)
        )
        rows = cur.fetchall()
        messages = [
            {
                'id': r[0],
                'text': r[1],
                'created_at': r[2].isoformat(),
                'user_name': r[3],
                'avatar_letter': r[4]
            }
            for r in rows
        ]
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'messages': messages})}

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        user_id = body.get('user_id')
        text = body.get('text', '').strip()
        channel = body.get('channel', 'general')

        if not user_id or not text:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Нет текста или пользователя'})}

        cur.execute(
            f"INSERT INTO {SCHEMA}.messages (user_id, channel, text) VALUES (%s, %s, %s) RETURNING id, created_at",
            (user_id, channel, text)
        )
        row = cur.fetchone()

        cur.execute(f"SELECT name, avatar_letter FROM {SCHEMA}.users WHERE id = %s", (user_id,))
        user = cur.fetchone()

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'message': {
                    'id': row[0],
                    'text': text,
                    'created_at': row[1].isoformat(),
                    'user_name': user[0],
                    'avatar_letter': user[1]
                }
            })
        }

    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}
