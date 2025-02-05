from flask import Flask, request, jsonify, render_template
import requests
import re
import jwt
import sqlite3
import json
import os
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

# 데이터베이스 경로 설정
DB_PATH = '/data/requests.db'

def init_db():
    if not os.path.exists('/data'):
        os.makedirs('/data')
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS saved_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            method TEXT NOT NULL,
            url TEXT NOT NULL,
            headers TEXT,
            body TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/parse-curl', methods=['POST'])
def parse_curl():
    curl_command = request.json.get('curl')
    
    # URL 추출
    url_match = re.search(r'curl\s+["\']([^"\']+)["\']', curl_command)
    url = url_match.group(1) if url_match else ''
    
    # 메서드 추출
    method_match = re.search(r'-X\s+(["\']?)(\w+)\1', curl_command)
    method = method_match.group(2) if method_match else 'GET'
    
    # 헤더 추출
    headers = {}
    header_matches = re.finditer(r'-H\s+["\']([^:]+):\s*([^"\']+)["\']', curl_command)
    for match in header_matches:
        headers[match.group(1)] = match.group(2)
    
    # 요청 본문 추출
    body_match = re.search(r'-d\s+["\'](.+?)["\']', curl_command)
    body = body_match.group(1) if body_match else ''
    
    return jsonify({
        'url': url,
        'method': method,
        'headers': headers,
        'body': body
    })

@app.route('/send-request', methods=['POST'])
def send_request():
    data = request.json
    try:
        response = requests.request(
            method=data['method'],
            url=data['url'],
            headers=data['headers'],
            data=data['body'] if data['method'] != 'GET' else None,
            timeout=30
        )
        
        return jsonify({
            'status': response.status_code,
            'headers': dict(response.headers),
            'body': response.text
        })
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/jwt/encode', methods=['POST'])
def jwt_encode():
    try:
        data = request.json
        payload = json.loads(data['payload'])
        secret = data['secret']
        algorithm = data.get('algorithm', 'HS256')
        
        token = jwt.encode(payload, secret, algorithm=algorithm)
        return jsonify({'token': token})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/jwt/decode', methods=['POST'])
def jwt_decode():
    try:
        data = request.json
        token = data['token']
        secret = data.get('secret')  # 시크릿 키는 선택적
        
        # 먼저 페이로드만 디코딩 (서명 검증 없이)
        parts = token.split('.')
        if len(parts) != 3:
            raise ValueError("Invalid JWT format")
            
        import base64
        import json
        
        # padding 추가
        padding = len(parts[1]) % 4
        if padding:
            parts[1] += '=' * (4 - padding)
            
        payload = json.loads(base64.b64decode(parts[1]))
        
        # 시크릿 키가 제공된 경우 서명 검증
        verified = False
        if secret:
            try:
                jwt.decode(token, secret, algorithms=["HS256", "HS384", "HS512"])
                verified = True
            except:
                verified = False
        
        return jsonify({
            'payload': payload,
            'verified': verified
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/requests', methods=['POST'])
def save_request():
    try:
        data = request.json
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('''
            INSERT INTO saved_requests (name, method, url, headers, body)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            data['name'],
            data['method'],
            data['url'],
            json.dumps(data['headers']),
            data['body']
        ))
        conn.commit()
        request_id = c.lastrowid
        conn.close()
        return jsonify({'id': request_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/requests', methods=['GET'])
def get_requests():
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('SELECT id, name, method, url, created_at FROM saved_requests ORDER BY created_at DESC')
        requests = [{'id': r[0], 'name': r[1], 'method': r[2], 'url': r[3], 'created_at': r[4]} 
                   for r in c.fetchall()]
        conn.close()
        return jsonify(requests)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/requests/<int:request_id>', methods=['GET'])
def get_request(request_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('SELECT * FROM saved_requests WHERE id = ?', (request_id,))
        r = c.fetchone()
        if r:
            request_data = {
                'id': r[0],
                'name': r[1],
                'method': r[2],
                'url': r[3],
                'headers': json.loads(r[4]) if r[4] else {},
                'body': r[5],
                'created_at': r[6]
            }
            conn.close()
            return jsonify(request_data)
        conn.close()
        return jsonify({'error': 'Request not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/requests/<int:request_id>', methods=['DELETE'])
def delete_request(request_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('DELETE FROM saved_requests WHERE id = ?', (request_id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Request deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/requests/<int:request_id>', methods=['PUT'])
def update_request(request_id):
    try:
        data = request.json
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('''
            UPDATE saved_requests 
            SET name = ?, method = ?, url = ?, headers = ?, body = ?
            WHERE id = ?
        ''', (
            data['name'],
            data['method'],
            data['url'],
            json.dumps(data['headers']),
            data['body'],
            request_id
        ))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Request updated successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=8282, debug=True) 