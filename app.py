from flask import Flask, jsonify, request, send_from_directory, session
from datetime import timedelta
import json
import os
from dotenv import load_dotenv

# Загружаем переменные из локального файла .env
load_dotenv()

app = Flask(__name__, static_folder='.')

# Секретный ключ сессий (если его нет в окружении, приложение выдаст ошибку)
app.secret_key = os.environ.get('SECRET_KEY')
if not app.secret_key:
    raise ValueError("Не задан SECRET_KEY в переменных окружения или файле .env!")

app.permanent_session_lifetime = timedelta(hours=1)

# Пароль берется СТРОГО из окружения. Никаких дефолтных "1234" в коде!
PASSWORD = os.environ.get('PASSWORD')
if not PASSWORD:
    raise ValueError("Не задан PASSWORD в переменных окружения или файле .env!")

DB_FILE = 'db.json'

DEFAULT_DB = {
    "Web Design": [
        { "title": "Supido", "code": "Первый блок для теста" },
        { "title": "Основной цвет", "code": "#1b79c5" }
    ]
}

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    if data.get('password') == PASSWORD:
        session.permanent = True
        session['authenticated'] = True
        return jsonify({"status": "ok"})
    return jsonify({"error": "Неверный пароль"}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"status": "ok"})

@app.route('/api/db', methods=['GET'])
def get_db():
    if not session.get('authenticated'):
        return jsonify({"error": "Unauthorized"}), 401
    
    if not os.path.exists(DB_FILE):
        with open(DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(DEFAULT_DB, f, ensure_ascii=False, indent=2)
        return jsonify(DEFAULT_DB)
    
    with open(DB_FILE, 'r', encoding='utf-8') as f:
        return jsonify(json.load(f))

@app.route('/api/db', methods=['POST'])
def save_db():
    if not session.get('authenticated'):
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return jsonify({"status": "success"})

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)