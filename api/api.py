import bcrypt
import json
import os
from flask import Flask, jsonify, request

app = Flask(__name__)

password = 'john-erick'
hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

DB_DIR = os.path.join(os.path.dirname(__file__), '..', 'db', 'logs')
IMG_DIR = os.path.join(os.path.dirname(__file__), '..', 'db', 'imgs')

os.makedirs(DB_DIR, exist_ok=True)
os.makedirs(IMG_DIR, exist_ok=True)



def load_db(filename, default=None):
    if default is None:
        default = []

    filepath = os.path.join(DB_DIR, filename)
    os.makedirs(DB_DIR, exist_ok=True)

    if not os.path.exists(filepath):
        save_db(filepath, default)
        return default

    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
            if not isinstance(data, list):
                raise ValueError("Invalid DB format, resetting to default")
            return data
    except (json.JSONDecodeError, ValueError):
        save_db(filepath, default)
        return default

def save_db(filepath, data):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)



@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'Alive'}), 200

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user_password = data.get('password')
    if bcrypt.checkpw(user_password.encode('utf-8'), hashed_password):
        return jsonify({'success': True, 'redirect-endpoint': '/home'}), 200
    return jsonify({'success': False, 'error': 'Invalid Credentials'}), 401

@app.route('/api/latest', methods=['GET'])
def latest():
    suspicious_poses = load_db('suspicious_poses.json', default=[])
    if not suspicious_poses:
        return jsonify({"message": "no suspicious_poses yet"}), 200
    return jsonify(suspicious_poses[-1]), 200

@app.route('/api/suspicious_poses', methods=['GET', 'POST'])
def violate():
    filepath = os.path.join(DB_DIR, 'suspicious_poses.json')

    if request.method == 'GET':
        db = load_db('suspicious_poses.json', default=[])
        return jsonify(db), 200

    if request.method == 'POST':
        new_suspect = request.get_json()
        db = load_db('suspicious_poses.json', default=[])
        db.append(new_suspect)
        save_db(filepath, db)
        return jsonify({"message": "added"}), 201
