# Strawberry Pi Web App

딸기 수확 로봇을 위한 실시간 모니터링 및 제어 웹 애플리케이션

## Features

- 3개 카메라 실시간 MJPEG 스트리밍
- 카메라 ON/OFF 토글 제어
- Process A/B 상태 LED 인디케이터
- Sensor A/B 상태 LED 모니터링 (Green/Orange/Red)
- Task 선택 (harvest/leaf remove)
- Start/Stop/Emergency Stop 버튼
- 실시간 로그 출력

## Tech Stack

- **Backend**: Flask (Python)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Video Streaming**: MJPEG over HTTP
- **Computer Vision**: OpenCV

## Installation

```bash
# Clone repository
git clone https://github.com/ddal-mspark/strawberry-pi-web-app.git
cd strawberry-pi-web-app

# Install dependencies
pip install -r requirements.txt
```

## Usage

```bash
# Run Flask server
python app.py
```

Server runs on `http://localhost:5000`

## Project Structure

```
strawberry_robot_web_app/
├── app.py                 # Flask backend
├── templates/
│   └── index.html         # Main UI
├── static/
│   ├── css/
│   │   └── style.css      # Styles
│   └── js/
│       └── main.js        # Frontend logic
├── data/                  # Video files
└── requirements.txt       # Python dependencies
```

## API Endpoints

- `GET /` - Main page
- `GET /stream/<cam>` - MJPEG stream for camera
- `POST /camera/<cam>/toggle` - Toggle camera on/off
- `POST /task` - Set task (harvest/leaf_remove)
- `POST /command` - Send command (start/stop/estop)
- `GET /status` - Get system status

## License

Copyright (c) 2025 Daedong AI-Lab
