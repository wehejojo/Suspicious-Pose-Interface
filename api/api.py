import cv2
import openpyxl
import numpy as np
import os, json, time, bcrypt, base64, datetime
from io import BytesIO

from flask import Flask, Response, jsonify, request, send_from_directory, send_file
from flask_socketio import SocketIO, emit, join_room

from detector import detect_action

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

DB_DIR = os.path.join(os.path.dirname(__file__), '..', 'db', 'logs')
CRED_DIR = os.path.join(os.path.dirname(__file__), '..', 'db', 'credentials')
IMG_DIR = os.path.join(os.path.dirname(__file__), '..', 'db', 'imgs')

os.makedirs(DB_DIR, exist_ok=True)
os.makedirs(CRED_DIR, exist_ok=True)
os.makedirs(IMG_DIR, exist_ok=True)

HIGH_CONFIDENCE_THRESHOLD = 0.8

last_saved_time = {}
SNAPSHOT_COOLDOWN = 5

RSTP_ADDRESS = ""

def load_credentials():
    cred_path = os.path.join(CRED_DIR, 'user_details.json')

    if not os.path.exists(cred_path):
        default = [{"password": "password"}]
        with open(cred_path, 'w') as f:
            json.dump(default, f, indent=2)
        return default

    try:
        with open(cred_path, 'r') as f:
            data = json.load(f)
            if isinstance(data, list) and len(data) > 0 and "password" in data[0]:
                return data
    except:
        pass

    default = [{"password": "password"}]
    with open(cred_path, 'w') as f:
        json.dump(default, f, indent=2)
    return default


def save_credentials(data):
    cred_path = os.path.join(CRED_DIR, 'user_details.json')
    with open(cred_path, 'w') as f:
        json.dump(data, f, indent=2)


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


def log_suspicious_pose(pose, conf, snapshot_filename=None):
    suspicious_poses = load_db('suspicious_poses.json', default=[])
    
    new_suspicious_pose_entry = {
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "pose": pose,
        "confidence": int(round(conf)),
        "status": "unreviewed"
    }

    if snapshot_filename:
        new_suspicious_pose_entry["image-path"] = snapshot_filename

    suspicious_poses.append(new_suspicious_pose_entry)
    save_db(os.path.join(DB_DIR, 'suspicious_poses.json'), suspicious_poses)


def generate_frames():
    cap = cv2.VideoCapture(RSTP_ADDRESS)

    if not cap.isOpened():
        print("Error: Cannot open RTSP stream")
        return

    while True:
        success, frame = cap.read()
        if not success:
            continue

        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()

        yield (
            b'--frame\r\n'
            b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n'
        )


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'Alive'}), 200


@app.route("/imgs/<filename>")
def serve_image(filename):
    """Serve images stored in the db/imgs folder."""
    return send_from_directory(IMG_DIR, filename)


@app.route("/api/ipcam_stream")
def ipcam_stream():
    cap = cv2.VideoCapture("rtsp://YOUR_CAMERA_URL")

    def gen():
        while True:
            ret, frame = cap.read()
            if not ret:
                continue
            _, jpeg = cv2.imencode(".jpg", frame)
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" +
                   jpeg.tobytes() +
                   b"\r\n")

    return Response(gen(), mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or "password" not in data:
        return jsonify({'success': False, 'error': 'Missing password'}), 400

    input_pw = data["password"]
    creds = load_credentials()
    hashed_password = creds[0]["password"].strip().encode('utf-8')

    if bcrypt.checkpw(input_pw.encode('utf-8'), hashed_password):
        return jsonify({'success': True, 'redirect-endpoint': '/home'}), 200

    return jsonify({'success': False, 'error': 'Invalid Credentials'}), 401


@app.route('/api/change-password', methods=['POST'])
def change_password():
    creds = load_credentials()
    data = request.get_json()

    old_pw = data.get("currentPassword")
    new_pw = data.get("newPassword")

    if not old_pw or not new_pw:
        return jsonify({"error": "Missing fields"}), 400

    hashed_password = creds[0]["password"].encode('utf-8')

    if not bcrypt.checkpw(old_pw.encode('utf-8'), hashed_password):
        return jsonify({"error": "Incorrect old password"}), 403
    
    if bcrypt.checkpw(new_pw.encode('utf-8'), hashed_password):
        return jsonify({"error": "Cannot reuse old password"}), 400

    hashed_new = bcrypt.hashpw(new_pw.encode('utf-8'), bcrypt.gensalt())
    creds[0]["password"] = hashed_new.decode('utf-8')
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


@app.route('/api/suspicious_poses', methods=['GET', 'POST', 'DELETE'])
def suspicious_poses_handler():
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

    if request.method == 'DELETE':
        save_db(filepath, [])
        return jsonify({"success": True, "message": "All logs deleted"}), 200


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


@app.route("/api/export", methods=['GET'])
def export_data():
    db = load_db('suspicious_poses.json')

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Suspicious Poses"

    headers = ["ID", "Timestamp", "Pose", "Confidence", "Status"]
    ws.append(headers)

    for col in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col)
        cell.font = openpyxl.styles.Font(bold=True)
        cell.alignment = openpyxl.styles.Alignment(horizontal="center")

    for idx, log in enumerate(db):
        ws.append([
            idx,
            log.get('timestamp', 'N/A'),
            log.get('pose', 'N/A'),
            log.get('confidence', 'N/A'),
            log.get('status', 'N/A'),
        ])

    for column_cells in ws.columns:
        length = max(len(str(cell.value)) if cell.value is not None else 0 for cell in column_cells)
        ws.column_dimensions[column_cells[0].column_letter].width = length + 2

    output = BytesIO()
    wb.save(output)
    output.seek(0)

    return send_file(
        output,
        as_attachment=True,
        download_name="suspicious_poses.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )



@socketio.on("join")
def handle_join(room_name):
    join_room(room_name)


@socketio.on("keypoints")
def handle_keypoints(data):
    try:
        kp = np.array(data["keypoints"], dtype=float)
        if kp.shape != (17, 2):
            emit("pose", {"error": "expected 17 keypoints of shape (17,2)"})
            return
    except Exception as e:
        emit("pose", {"error": "invalid keypoints", "detail": str(e)})
        return

    result = detect_action(kp)
    emit("pose", result)


@socketio.on("high_confidence_pose")
def handle_high_conf_pose(data):
    pose = data.get("pose", "unknown")
    confidence = data.get("confidence", 0)
    snapshot_b64 = data.get("snapshot")

    now = time.time()
    last_time = last_saved_time.get(pose, 0)

    if now - last_time < SNAPSHOT_COOLDOWN:
        emit("pose", {"status": "cooldown", "pose": pose})
        return

    last_saved_time[pose] = now

    filename = None
    image_path = None

    if snapshot_b64:
        try:
            if "," in snapshot_b64:
                _, snapshot_b64 = snapshot_b64.split(",", 1)
            img_data = base64.b64decode(snapshot_b64)
            filename = f"{pose}_{int(confidence*100)}_{int(time.time())}.png"
            filepath = os.path.join(IMG_DIR, filename)
            with open(filepath, "wb") as f:
                f.write(img_data)

            image_path = os.path.join("db", "imgs", filename)
        except Exception as e:
            emit("pose", {"error": f"Failed to save snapshot: {e}"})
            return

    log_suspicious_pose(pose, confidence * 100, snapshot_filename=filename)

    emit("pose", {"status": "saved", "pose": pose, "confidence": int(confidence*100)})

    emit("alert", {
        "pose": pose,
        "confidence": confidence,
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "image-path": filename
    }, broadcast=True)



if __name__ == "__main__":
    creds = load_credentials()

    if not creds[0]["password"].startswith("$2b$"):
        hashed_password = bcrypt.hashpw(creds[0]["password"].encode("utf-8"), bcrypt.gensalt())
        creds[0]["password"] = hashed_password.decode("utf-8")
        save_credentials(creds)

    print("Running WebSocket Pose server on ws://localhost:5000 (threading mode)")
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
