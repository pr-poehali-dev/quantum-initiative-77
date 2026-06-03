import json
import os
import base64
import uuid
import psycopg2
import boto3

def get_conn():
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    return conn

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p93752303_quantum_initiative_7')

HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

def handler(event: dict, context) -> dict:
    """Получение и обновление профиля пользователя (ник, цвет аватара, фото аватара)"""

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': ''}

    method = event.get('httpMethod')
    params = event.get('queryStringParameters') or {}

    conn = get_conn()
    cur = conn.cursor()

    if method == 'GET':
        user_id = params.get('user_id')
        if not user_id:
            return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Нет user_id'})}

        cur.execute(
            f"SELECT id, name, avatar_letter, avatar_color, avatar_url, phone FROM {SCHEMA}.users WHERE id = %s",
            (user_id,)
        )
        row = cur.fetchone()
        if not row:
            return {'statusCode': 404, 'headers': HEADERS, 'body': json.dumps({'error': 'Пользователь не найден'})}

        user = {
            'id': row[0], 'name': row[1], 'avatar_letter': row[2],
            'avatar_color': row[3], 'avatar_url': row[4], 'phone': row[5]
        }
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'user': user})}

    if method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        user_id = body.get('user_id')
        if not user_id:
            return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Нет user_id'})}

        name = body.get('name', '').strip()
        avatar_color = body.get('avatar_color')
        avatar_image_b64 = body.get('avatar_image')

        if not name:
            return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Имя не может быть пустым'})}

        avatar_letter = name[0].upper()
        avatar_url = None

        if avatar_image_b64:
            s3 = boto3.client(
                's3',
                endpoint_url='https://bucket.poehali.dev',
                aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
            )
            image_data = base64.b64decode(avatar_image_b64)
            key = f"avatars/{user_id}_{uuid.uuid4().hex[:8]}.jpg"
            s3.put_object(Bucket='files', Key=key, Body=image_data, ContentType='image/jpeg')
            avatar_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

        if avatar_url:
            cur.execute(
                f"UPDATE {SCHEMA}.users SET name=%s, avatar_letter=%s, avatar_color=%s, avatar_url=%s WHERE id=%s",
                (name, avatar_letter, avatar_color, avatar_url, user_id)
            )
        else:
            cur.execute(
                f"UPDATE {SCHEMA}.users SET name=%s, avatar_letter=%s, avatar_color=%s WHERE id=%s",
                (name, avatar_letter, avatar_color, user_id)
            )

        cur.execute(
            f"SELECT id, name, avatar_letter, avatar_color, avatar_url, phone FROM {SCHEMA}.users WHERE id = %s",
            (user_id,)
        )
        row = cur.fetchone()
        user = {
            'id': row[0], 'name': row[1], 'avatar_letter': row[2],
            'avatar_color': row[3], 'avatar_url': row[4], 'phone': row[5]
        }
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'user': user})}

    return {'statusCode': 405, 'headers': HEADERS, 'body': json.dumps({'error': 'Method not allowed'})}
