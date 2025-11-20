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
    """
    Load a JSON file from the DB_DIR.

    If the file does not exist, is empty, or contains invalid JSON,
    it creates/resets the file with the default value.

    Args:
        filename (str): Name of the JSON file.
        default (any): Default value to initialize the file with if needed.

    Returns:
        any: The contents of the JSON file.
    """
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
    """
    Save data to a JSON file safely.

    Ensures the directory exists before writing.

    Args:
        filepath (str): Full path to the file.
        data (any): Data to write to the JSON file.
    """
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)


@app.route('/api/health', methods=['GET'])
def health():
    """
    Health check endpoint.

    Returns:
        JSON response indicating the server status.
    """
    return jsonify({'status': 'Alive'}), 200

@app.route('/api/login', methods=['POST'])
def login():
    """
    Authenticate a user with a password.

    Expects JSON payload with a "password" field.

    Returns:
        JSON response indicating success or failure.
    """
    data = request.json
    user_password = data.get('password')
    if bcrypt.checkpw(user_password.encode('utf-8'), hashed_password):
        return jsonify({'success': True, 'redirect-endpoint': '/home'}), 200
    return jsonify({'success': False, 'error': 'Invalid Credentials'}), 401

@app.route('/api/latest', methods=['GET'])
def latest():
    """
    Retrieve the latest suspicious pose entry.

    Returns:
        JSON of the latest entry or a message if none exist.
    """
    suspicious_poses = load_db('suspicious_poses.json', default=[])
    if not suspicious_poses:
        return jsonify({"message": "no suspicious_poses yet"}), 200
    return jsonify(suspicious_poses[-1]), 200

@app.route('/api/suspicious_poses', methods=['GET', 'POST'])
def violate():
    """
    GET: Retrieve all suspicious poses.
    POST: Add a new suspicious pose to the database.

    Expects JSON payload for POST requests.

    Returns:
        JSON response with all entries (GET) or confirmation message (POST).
    """
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
