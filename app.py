from __future__ import annotations
import os, time, cv2
from flask import Flask, render_template, request, jsonify, Response
import time

app = Flask(__name__)

STATE = {
    "running": False,  # ← 시스템 실행 여부
    "cameras": {
        "cam1": {"name": "Arm-L", "enabled": False},
        "cam2": {"name": "Center", "enabled": False},
        "cam3": {"name": "Arm-R", "enabled": False},
    },
    "process": {
        "A": {"name": "Process A", "progress": 0},
        "B": {"name": "Process B", "progress": 0},
    },
    "sensors": {
        "A": {"name": "Sensor A", "level": 0.0, "status": "green"},
        "B": {"name": "Sensor B", "level": 0.0, "status": "orange"},
    },
    "current_task": "harvest",
    "log": [],
}

def log(msg: str) -> None:
    ts = time.strftime("%H:%M:%S")
    entry = f"[{ts}] {msg}"
    STATE["log"].append(entry)
    STATE["log"] = STATE["log"][-200:]
    print(entry)


@app.route("/")
def index():
    return render_template("index.html")


@app.post("/camera/<cam_id>/toggle")
def camera_toggle(cam_id: str):
    enabled = request.json.get("enabled")
    cam = STATE["cameras"].get(cam_id)
    if cam is None:
        return jsonify({"ok": False}), 404
    cam["enabled"] = bool(enabled)
    log(f"Camera {cam_id} -> {'ON' if cam['enabled'] else 'OFF'}")
    return jsonify({"ok": True, "enabled": cam["enabled"]})


@app.post("/task")
def set_task():
    task = request.json.get("task", "harvest")
    STATE["current_task"] = task
    log(f"Task selected: {task}")
    return jsonify({"ok": True})


@app.post("/command")
def command():
    action = request.json.get("action")
    if action == "start":
        STATE["running"] = True
        log("시작 (Start)")
    elif action == "stop":
        STATE["running"] = False
        # 토글 상태들도 끄고 싶다면 주석 해제
        for k in STATE["cameras"]:
            STATE["cameras"][k]["enabled"] = False
        log("정지 (Stop)")

    elif action == "estop":
        STATE["running"] = False           # ← 비상 정지 상태
        for k in STATE["cameras"]:
            STATE["cameras"][k]["enabled"] = False
        log("비상 정지 (EMERGENCY STOP)")

    else:
        return jsonify({"ok": False}), 400
    return jsonify({"ok": True})


@app.get("/status")
def status():
    for proc in STATE["process"].values():
        proc["progress"] = (proc["progress"] + 3) % 100
    for sen in STATE["sensors"].values():
        sen["level"] = (sen.get("level", 0) + 0.07) % 1.0
        sen["status"] = (
            "green" if sen["level"] < 0.6 else ("orange" if sen["level"] < 0.85 else "red")
        )
    return jsonify({
        "running": STATE["running"],       # ← 실행여부 반환
        "cameras": STATE["cameras"],
        "process": STATE["process"],
        "sensors": STATE["sensors"],
        "task": STATE["current_task"],
        "log": STATE["log"],
    })


# ------------------ MJPEG generator ------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
def gen_frames(video_rel_path):
    path = os.path.join(BASE_DIR, video_rel_path)  # 절대경로화
    cap = cv2.VideoCapture(path, cv2.CAP_FFMPEG)
    if not cap.isOpened():
        print(f"[STREAM] Cannot open video: {path}")
        return

    # FPS에 맞춰 살짝 쉬어주기 (너무 빠르게 돌지 않도록)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    delay = 1.0 / float(fps)

    while True:
        ok, frame = cap.read()
        if not ok:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  # loop
            continue
        ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        if not ok:
            continue
        yield (b"--frame\r\n"
               b"Content-Type: image/jpeg\r\n\r\n" + buf.tobytes() + b"\r\n")
        time.sleep(delay)



@app.route("/stream/<cam_id>")
def stream(cam_id):
    video_map = {
        "cam1": "/home/ailab-mspark/Documents/strawberry_robot_web_app/data/video1.mp4",
        "cam2": "/home/ailab-mspark/Documents/strawberry_robot_web_app/data/video2.mp4",
        "cam3": "/home/ailab-mspark/Documents/strawberry_robot_web_app/data/video3.mp4",
    }
    path = video_map.get(cam_id)
    if not path:
        return "Invalid camera id", 404
    return Response(gen_frames(path),
                    mimetype="multipart/x-mixed-replace; boundary=frame")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
