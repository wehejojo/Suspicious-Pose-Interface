import bcrypt
import json
import os
from flask import Flask, jsonify, request
import joblib
import numpy as np

app = Flask(__name__)

DB_DIR = os.path.join(os.path.dirname(__file__), '..', 'db', 'logs')
CRED_DIR = os.path.join(os.path.dirname(__file__), '..', 'db', 'credentials')
IMG_DIR = os.path.join(os.path.dirname(__file__), '..', 'db', 'imgs')

os.makedirs(DB_DIR, exist_ok=True)
os.makedirs(CRED_DIR, exist_ok=True)
os.makedirs(IMG_DIR, exist_ok=True)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "pose_classifier_rf.joblib")

try:
    model = joblib.load(MODEL_PATH)
    print("✔ Loaded RandomForest model")
except Exception as e:
    print("❌ Failed to load model:", e)
    model = None



# ---------------------------------------------------------------------
#   FIXED: Proper credential loader (does NOT use logs DB folder)
# ---------------------------------------------------------------------
def load_credentials():
    cred_path = os.path.join(CRED_DIR, 'user_details.json')

    # If file missing → create default
    if not os.path.exists(cred_path):
        default = [{"password": "password"}]  # default password if empty
        with open(cred_path, 'w') as f:
            json.dump(default, f, indent=2)
        return default

    # Attempt to read
    try:
        with open(cred_path, 'r') as f:
            data = json.load(f)
            if isinstance(data, list) and len(data) > 0 and "password" in data[0]:
                return data
    except:
        pass

    # If invalid → reset to default
    default = [{"password": "password"}]
    with open(cred_path, 'w') as f:
        json.dump(default, f, indent=2)
    return default



def save_credentials(data):
    cred_path = os.path.join(CRED_DIR, 'user_details.json')
    with open(cred_path, 'w') as f:
        json.dump(data, f, indent=2)



# ---------------------------------------------------------------------
#   LOAD_DB for logs remains unchanged
# ---------------------------------------------------------------------
def load_db(filename, default=None):
    if default is None:
        default = []

    filepath = os.path.join(DB_DIR, filename)

    if not os.path.exists(filepath):
        save_db(filepath, default)
        return default

    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
            if not isinstance(data, list):
                raise ValueError("Invalid DB format, resetting")
            return data
    except:
        save_db(filepath, default)
        return default


def save_db(filepath, data):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)



# ---------------------------------------------------------------------
#   ROUTES
# ---------------------------------------------------------------------
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'Alive'}), 200



@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    input_pw = data.get('password')

    if bcrypt.checkpw(input_pw.encode('utf-8'), hashed_password):
        return jsonify({'success': True, 'redirect-endpoint': '/home'}), 200

    return jsonify({'success': False, 'error': 'Invalid Credentials'}), 401



@app.route('/api/change_password', methods=['POST'])
def change_password():
    creds = load_credentials()
    data = request.get_json()

    old_pw = data.get("old_password")
    new_pw = data.get("new_password")

    if not old_pw or not new_pw:
        return jsonify({"error": "Missing fields"}), 400

    if not bcrypt.checkpw(old_pw.encode('utf-8'), hashed_password):
        return jsonify({"error": "Incorrect old password"}), 403

    # Save new password (stored unhashed)
    creds[0]["password"] = new_pw
    save_credentials(creds)

    return jsonify({"success": True}), 200



@app.route('/api/latest', methods=['GET'])
def latest():
    suspicious_poses = load_db('suspicious_poses.json', default=[])

    if not suspicious_poses:
        return jsonify({"message": "no suspicious_poses yet"}), 200

    last_event = suspicious_poses[-1]

    filtered_event = {
        "timestamp": last_event.get("timestamp", ""),
        "pose": last_event.get("pose", ""),
        "confidence": last_event.get("confidence", ""),
        "status": last_event.get("status", "")
    }

    return jsonify(filtered_event), 200



@app.route('/api/suspicious_poses', methods=['GET', 'POST'])
def violate():
    filepath = os.path.join(DB_DIR, 'suspicious_poses.json')

    if request.method == 'GET':
        db = load_db('suspicious_poses.json', default=[])
        for idx, event in enumerate(db):
            event['id'] = idx
        return jsonify(db), 200

    if request.method == 'POST':
        new_suspect = request.get_json()
        required_keys = ['timestamp', 'pose', 'confidence', 'status']

        if not all(key in new_suspect for key in required_keys):
            return jsonify({"error": "Missing required keys"}), 400

        new_suspect['status'] = new_suspect['status'].lower()
        db = load_db('suspicious_poses.json', default=[])
        db.append(new_suspect)
        save_db(filepath, db)
        return jsonify(new_suspect), 201



@app.route('/api/suspicious_poses/<int:event_idx>', methods=['PATCH', 'DELETE'])
def update_event(event_idx):
    db = load_db('suspicious_poses.json', default=[])

    if event_idx < 0 or event_idx >= len(db):
        return jsonify({"error": "Event not found"}), 404

    if request.method == 'PATCH':
        data = request.get_json()

        if "status" in data:
            db[event_idx]["status"] = data["status"].lower()
            save_db(os.path.join(DB_DIR, 'suspicious_poses.json'), db)
            return jsonify(db[event_idx]), 200

    elif request.method == 'DELETE':
        deleted = db.pop(event_idx)
        save_db(os.path.join(DB_DIR, 'suspicious_poses.json'), db)
        return jsonify(deleted), 200

    return jsonify({"error": "No valid fields to update"}), 400



@app.route('/api/model-info', methods=['GET'])
def model_info():
    if model is None:
        return jsonify({"error": "Model not loaded"}), 500
    return jsonify({"expected_features": model.n_features_in_}), 200



@app.route('/api/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({"error": "Model not loaded"}), 500

    try:
        data = request.get_json()
        features = np.array(data.get("features", []), dtype=float)

        expected_len = model.n_features_in_

        if features.size < expected_len:
            features = np.pad(features, (0, expected_len - features.size), 'constant')
        elif features.size > expected_len:
            features = features[:expected_len]

        features = features.reshape(1, -1)

        pred = model.predict(features)[0]

        try:
            prob = model.predict_proba(features)[0].tolist()
        except:
            prob = None

        return jsonify({
            "prediction": str(pred),
            "probabilities": prob
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500



# ---------------------------------------------------------------------
#   APPLICATION STARTUP
# ---------------------------------------------------------------------
if __name__ == "__main__":
    creds = load_credentials()
    password = creds[0]["password"]

    # Hash password for runtime comparisons
    print(password)
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    app.run(debug=True)
