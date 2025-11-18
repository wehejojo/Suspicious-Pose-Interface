import datetime, json, os
from flask import Flask, jsonify, request

app = Flask(__name__)

DB_DIR = os.path.join(os.path.dirname(__file__), '..', 'db')

def load_db(filename, default=None):
    os.makedirs(DB_DIR, exist_ok=True)
    filepath = os.path.join(DB_DIR, filename)

    if not os.path.exists(filepath):
        if default is None:
            default = []
        save_db(filename, default)
        return default

    with open(filepath, 'r') as f:
        return json.load(f)

def save_db(filename, data):
    os.makedirs(DB_DIR, exist_ok=True)
    filepath = os.path.join(DB_DIR, filename)

    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'Alive'
    }), 200

@app.route('/api/latest', methods=['GET'])
def latest():
    violations = load_db('violations.json', default=[])

    if not violations:
        return jsonify({"message": "no violations yet"}), 200

    return jsonify(violations[-1]), 200

@app.route('/api/violations', methods=['GET', 'POST'])
def violate():
    if request.method == 'GET':
        db = load_db('violations.json', default=[])
        return jsonify(db), 200

    if request.method == 'POST':
        new_violation = request.get_json()

        db = load_db('violations.json', default=[])
        db.append(new_violation)

        save_db('violations.json', db)

        return jsonify({"message": "added"}), 201
