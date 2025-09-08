async function postJSON(url, payload){
  const res = await fetch(url, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  return res.json();
}

function startStream(cam){
  const img = document.getElementById(cam);
  if(!img) return;
  // 캐시 방지용 쿼리 붙여서 실제로 /stream/<cam> 호출
  img.src = `/stream/${cam}?t=${Date.now()}`;
  img.style.display = 'block';
}

function stopStream(cam){
  const img = document.getElementById(cam);
  if(!img) return;
  // src를 비워 연결 종료 → 서버의 제너레이터가 클라이언트 종료를 감지해 스트림 종료됨
  img.src = '';
  img.style.display = 'none';
}

// 토글 핸들러
for (const t of document.querySelectorAll('.toggle')){
  t.addEventListener('change', async (e)=>{
    const cam = e.target.dataset.cam;
    const enabled = e.target.checked;

    if (enabled) startStream(cam);
    else         stopStream(cam);

    try { await postJSON(`/camera/${cam}/toggle`, {enabled}); }
    catch(err){ console.error(err); }
  });
}

// 페이지 로드시 토글 상태대로 스트림 초기 세팅
window.addEventListener('DOMContentLoaded', ()=>{
  for (const t of document.querySelectorAll('.toggle')){
    const cam = t.dataset.cam;
    if (t.checked) startStream(cam);
    else           stopStream(cam);
  }
});

// (선택) 오류시 플레이스홀더 처리
for (const id of ['cam1','cam2','cam3']){
  const img = document.getElementById(id);
  if(!img) continue;
  img.addEventListener('error', ()=>{
    // 스트림이 열리지 않으면 일단 검은 화면 유지 (원하면 여기에 SVG 플레이스홀더 넣기)
    console.warn(id, 'stream failed');
  });
}

// (불필요한 중복 토글 핸들러 제거)

// task 선택
const select = document.getElementById('task');
select.addEventListener('change', ()=> postJSON('/task', {task: select.value}) );

// 버튼
document.getElementById('btn-start').addEventListener('click', ()=> postJSON('/command', {action:'start'}) );
document.getElementById('btn-stop').addEventListener('click', ()=> postJSON('/command', {action:'stop'}) );
document.getElementById('btn-estop').addEventListener('click', ()=> postJSON('/command', {action:'estop'}) );

// 상태 폴링
const procA = document.getElementById('procA');
const procB = document.getElementById('procB');
const sensorA = document.getElementById('sensorA');
const sensorB = document.getElementById('sensorB');
const logEl = document.getElementById('log');

function setLights(container, status){
  for (const el of container.querySelectorAll('.light')) el.classList.remove('active');
  const map = {green:0, orange:1, red:2};
  container.children[map[status] ?? 0].classList.add('active');
}

async function poll(){
  try{
    const data = await (await fetch('/status')).json();
    procA.style.width = (data.process.A.progress || 0) + '%';
    procB.style.width = (data.process.B.progress || 0) + '%';
    setLights(sensorA, data.sensors.A.status);
    setLights(sensorB, data.sensors.B.status);

    logEl.textContent = data.log.join('\n');
    logEl.scrollTop = logEl.scrollHeight;
  }catch(err){ console.error(err); }
  finally{ setTimeout(poll, 1000); }
}
poll();
