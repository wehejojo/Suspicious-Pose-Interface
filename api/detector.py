import numpy as np

# ---------------------------
# Last positions (global)
# ---------------------------
_last_left_wrist = None
_last_right_wrist = None
_last_left_ankle = None
_last_right_ankle = None

# ---------------------------
# Utility functions
# ---------------------------
def vector_angle(a, b, c):
    ba = a - b
    bc = c - b
    denom = (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    cosv = np.clip(np.dot(ba, bc) / denom, -1.0, 1.0)
    return float(np.degrees(np.arccos(cosv)))

def compute_speed(prev, curr, delta_time=1.0):
    if prev is None:
        return 0.0
    return float(np.linalg.norm(curr - prev) / delta_time)

def midpoint(a, b):
    return (a + b) / 2.0

# ---------------------------
# Lying detection
# ---------------------------
def torso_horizontal(kp):
    shoulder_mid = midpoint(kp[5], kp[6])
    hip_mid = midpoint(kp[11], kp[12])
    v = hip_mid - shoulder_mid
    dx, dy = v[0], v[1]
    angle = abs(np.degrees(np.arctan2(dy, dx)))
    return angle

def vertical_height_range(kp):
    ys = np.array([pt[1] for pt in kp])
    return float(ys.max() - ys.min())

# ---------------------------
# Punch detection
# ---------------------------
def detect_punch_conf(kp, last_positions, delta_time=1.0):
    Ls, Rs = kp[5], kp[6]
    Le, Re = kp[7], kp[8]
    Lw, Rw = kp[9], kp[10]

    left_elbow_angle = vector_angle(Ls, Le, Lw)
    right_elbow_angle = vector_angle(Rs, Re, Rw)

    left_speed = compute_speed(last_positions.get("lw"), Lw, delta_time)
    right_speed = compute_speed(last_positions.get("rw"), Rw, delta_time)

    right_forward = Rw[0] - Rs[0]
    left_forward = Ls[0] - Lw[0]

    height_thresh = 60.0
    right_height_ok = abs(Rw[1] - Rs[1]) < height_thresh
    left_height_ok = abs(Lw[1] - Ls[1]) < height_thresh

    def score(angle, forward, speed, height_ok):
        s_angle = np.clip((angle - 140.0) / 40.0, 0.0, 1.0)
        s_forward = np.clip((forward - 10.0) / 60.0, 0.0, 1.0)
        s_speed = np.clip(speed / 30.0, 0.0, 1.0)
        s_height = 0.5 if height_ok else 0.0
        return np.clip((s_angle + s_forward + s_speed + s_height) / 4.0, 0.0, 1.0)

    left_conf = score(left_elbow_angle, left_forward, left_speed, left_height_ok)
    right_conf = score(right_elbow_angle, right_forward, right_speed, right_height_ok)

    return left_conf, right_conf

# ---------------------------
# Kick detection
# ---------------------------
def detect_kick_conf(kp, last_positions, delta_time=1.0):
    Lh, Rh = kp[11], kp[12]
    Lk, Rk = kp[13], kp[14]
    La, Ra = kp[15], kp[16]

    left_knee_angle = vector_angle(Lh, Lk, La)
    right_knee_angle = vector_angle(Rh, Rk, Ra)

    left_speed = compute_speed(last_positions.get("la"), La, delta_time)
    right_speed = compute_speed(last_positions.get("ra"), Ra, delta_time)

    lift_thresh = 20.0
    left_lift = (La[1] < Lk[1] - lift_thresh)
    right_lift = (Ra[1] < Rk[1] - lift_thresh)

    left_dx = La[0] - Lh[0]
    right_dx = Ra[0] - Rh[0]

    front_thresh = 50.0
    side_thresh = 60.0

    def leg_type_and_forward_score(dx, is_left):
        if not is_left:
            if dx > front_thresh:
                return "front", (dx - front_thresh)/100.0
            if dx < -front_thresh:
                return "back", (-dx - front_thresh)/100.0
            if abs(dx) > side_thresh:
                return "side", (abs(dx)-side_thresh)/100.0
            return "none", 0.0
        else:
            if dx < -front_thresh:
                return "front", (-dx - front_thresh)/100.0
            if dx > front_thresh:
                return "back", (dx - front_thresh)/100.0
            if abs(dx) > side_thresh:
                return "side", (abs(dx)-side_thresh)/100.0
            return "none", 0.0

    left_type, left_forward_score = leg_type_and_forward_score(left_dx, True)
    right_type, right_forward_score = leg_type_and_forward_score(right_dx, False)

    def kick_score(knee_angle, forward_score, speed, lifted):
        s_angle = np.clip((knee_angle - 140.0)/40.0, 0.0, 1.0)
        s_forward = np.clip(forward_score, 0.0, 1.0)
        s_speed = np.clip(speed/40.0, 0.0, 1.0)
        s_lift = 0.5 if lifted else 0.0
        return np.clip((s_angle + s_forward + s_speed + s_lift)/4.0, 0.0, 1.0)

    left_conf = kick_score(left_knee_angle, left_forward_score, left_speed, left_lift)
    right_conf = kick_score(right_knee_angle, right_forward_score, right_speed, right_lift)

    return left_conf, right_conf, left_type, right_type

# ---------------------------
# Firearm pose detection
# ---------------------------
def detect_firearm_pose_conf(kp, last_positions=None, delta_time=1.0):
    Ls, Rs = kp[5], kp[6]
    Le, Re = kp[7], kp[8]
    Lw, Rw = kp[9], kp[10]

    left_elbow_angle = vector_angle(Ls, Le, Lw)
    right_elbow_angle = vector_angle(Rs, Re, Rw)

    # Wrists roughly horizontal with shoulders
    height_thresh = 40.0
    left_height_ok = abs(Lw[1] - Ls[1]) < height_thresh
    right_height_ok = abs(Rw[1] - Rs[1]) < height_thresh

    # Wrists forward (X-axis)
    left_forward_ok = (Ls[0] - Lw[0]) > 20.0
    right_forward_ok = (Rw[0] - Rs[0]) > 20.0

    # **New: wrist speed**
    left_speed = compute_speed(last_positions.get("lw") if last_positions else None, Lw, delta_time)
    right_speed = compute_speed(last_positions.get("rw") if last_positions else None, Rw, delta_time)
    left_speed_ok = left_speed < 5.0  # slow movement
    right_speed_ok = right_speed < 5.0

    # **New: arm symmetry**
    arm_symmetry = abs((Lw[0]-Ls[0]) - (Rw[0]-Rs[0])) < 20.0

    def arm_score(angle, height_ok, forward_ok, speed_ok):
        s_angle = np.clip((angle - 150.0)/30.0, 0.0, 1.0)
        s_height = 0.5 if height_ok else 0.0
        s_forward = 0.5 if forward_ok else 0.0
        s_speed = 0.5 if speed_ok else 0.0
        return np.clip((s_angle + s_height + s_forward + s_speed)/4.0, 0.0, 1.0)

    left_conf = arm_score(left_elbow_angle, left_height_ok, left_forward_ok, left_speed_ok)
    right_conf = arm_score(right_elbow_angle, right_height_ok, right_forward_ok, right_speed_ok)

    firearm_conf = (left_conf + right_conf)/2.0
    # Penalize if arms not symmetric
    if not arm_symmetry:
        firearm_conf *= 0.7

    return firearm_conf


# ---------------------------
# Unified action detector
# ---------------------------
def detect_action(keypoints, delta_time=1.0):
    global _last_left_wrist, _last_right_wrist, _last_left_ankle, _last_right_ankle

    kp = np.array(keypoints)
    last_wrists = {"lw": _last_left_wrist, "rw": _last_right_wrist}
    last_ankles = {"la": _last_left_ankle, "ra": _last_right_ankle}

    # -------------------------
    # Punch / Kick Detection
    # -------------------------
    left_punch_conf, right_punch_conf = detect_punch_conf(kp, last_wrists, delta_time)
    left_kick_conf, right_kick_conf, left_kick_type, right_kick_type = detect_kick_conf(kp, last_ankles, delta_time)

    # -------------------------
    # Lying Detection
    # -------------------------
    torso_ang = torso_horizontal(kp)
    y_span = vertical_height_range(kp)
    torso_angle_threshold = 30.0
    y_span_threshold = 120.0
    lying_conf = 0.0
    if (torso_ang < torso_angle_threshold) and (y_span < y_span_threshold):
        s_angle = np.clip((torso_angle_threshold - torso_ang)/torso_angle_threshold, 0.0, 1.0)
        s_height = np.clip((y_span_threshold - y_span)/y_span_threshold, 0.0, 1.0)
        lying_conf = np.clip((s_angle + s_height)/2.0, 0.0, 1.0)

    # -------------------------
    # Improved Firearm Detection
    # -------------------------
    Ls, Rs = kp[5], kp[6]
    Le, Re = kp[7], kp[8]
    Lw, Rw = kp[9], kp[10]

    left_elbow_angle = vector_angle(Ls, Le, Lw)
    right_elbow_angle = vector_angle(Rs, Re, Rw)

    # Wrist horizontal alignment
    height_thresh = 40.0
    left_height_ok = abs(Lw[1] - Ls[1]) < height_thresh
    right_height_ok = abs(Rw[1] - Rs[1]) < height_thresh

    # Forward extension
    left_forward_ok = (Ls[0] - Lw[0]) > 20.0
    right_forward_ok = (Rw[0] - Rs[0]) > 20.0

    # Wrist speed (slow is better)
    left_speed = compute_speed(last_wrists.get("lw"), Lw, delta_time)
    right_speed = compute_speed(last_wrists.get("rw"), Rw, delta_time)
    left_speed_ok = left_speed < 5.0
    right_speed_ok = right_speed < 5.0

    # Arm symmetry
    arm_symmetry = abs((Lw[0]-Ls[0]) - (Rw[0]-Rs[0])) < 25.0

    def arm_score(angle, height_ok, forward_ok, speed_ok):
        s_angle = np.clip((angle - 150.0)/30.0, 0.0, 1.0)
        s_height = 0.5 if height_ok else 0.0
        s_forward = 0.5 if forward_ok else 0.0
        s_speed = 0.5 if speed_ok else 0.0
        return np.clip((s_angle + s_height + s_forward + s_speed)/4.0, 0.0, 1.0)

    left_conf = arm_score(left_elbow_angle, left_height_ok, left_forward_ok, left_speed_ok)
    right_conf = arm_score(right_elbow_angle, right_height_ok, right_forward_ok, right_speed_ok)

    firearm_conf = (left_conf + right_conf)/2.0
    if not arm_symmetry:
        firearm_conf *= 0.7  # penalize asymmetry

    # -------------------------
    # Update last positions
    # -------------------------
    _last_left_wrist = kp[9].copy()
    _last_right_wrist = kp[10].copy()
    _last_left_ankle = kp[15].copy()
    _last_right_ankle = kp[16].copy()

    # -------------------------
    # Thresholds & candidate selection
    # -------------------------
    threshold_punch = 0.55
    threshold_kick = 0.5
    threshold_lying = 0.45
    threshold_firearm = 0.6

    candidates = []
    if left_punch_conf > threshold_punch:
        candidates.append(("left_punch", left_punch_conf))
    if right_punch_conf > threshold_punch:
        candidates.append(("right_punch", right_punch_conf))
    if left_kick_conf > threshold_kick:
        candidates.append(("left_kick", left_kick_conf))
    if right_kick_conf > threshold_kick:
        candidates.append(("right_kick", right_kick_conf))
    if lying_conf > threshold_lying:
        candidates.append(("lying", lying_conf))
    if firearm_conf > threshold_firearm:
        candidates.append(("firearm", firearm_conf))

    label = "neutral" if not candidates else max(candidates, key=lambda x: x[1])[0]

    confidences = {
        "left_punch": float(np.clip(left_punch_conf, 0.0, 1.0)),
        "right_punch": float(np.clip(right_punch_conf, 0.0, 1.0)),
        "left_kick": float(np.clip(left_kick_conf, 0.0, 1.0)),
        "right_kick": float(np.clip(right_kick_conf, 0.0, 1.0)),
        "lying": float(np.clip(lying_conf, 0.0, 1.0)),
        "firearm": float(np.clip(firearm_conf, 0.0, 1.0))
    }

    extra = {
        "left_kick_type": left_kick_type,
        "right_kick_type": right_kick_type,
        "torso_angle_deg": float(torso_ang),
        "vertical_span_px": float(y_span),
        "left_wrist_speed": float(left_speed),
        "right_wrist_speed": float(right_speed),
        "arm_symmetry": arm_symmetry
    }

    return {"label": label, "confidences": confidences, "extra": extra}

