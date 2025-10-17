async function postJSON(url, payload){
  const res = await fetch(url, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  return res.json();
}
const CAMS = ['cam1','cam2','cam3'];
function startStream(cam){
  const img = document.getElementById(cam);
  if(!img) return;
  img.src = `/stream/${cam}?t=${Date.now()}`;   // 실제 호출
  img.style.display = 'block';
}

function stopStream(cam){
  const img = document.getElementById(cam);
  if(!img) return;
  // src를 비워 연결 종료 → 서버의 제너레이터가 클라이언트 종료를 감지해 스트림 종료됨
  img.src = '';
  img.style.display = 'none';
}

async function setToggle(cam, checked, notify=true){
  const input = document.querySelector(`.toggle[data-cam="${cam}"]`);
  if (!input) return;
  input.checked = !!checked;
  if (checked) startStream(cam); else stopStream(cam);
  if (notify) { await postJSON(`/camera/${cam}/toggle`, {enabled: !!checked}); }
}

async function setAllToggles(checked, notify=true){
  for (const cam of CAMS){
    await setToggle(cam, checked, notify);
  }
}

function setTogglesDisabled(disabled){
  for (const cam of CAMS){
    const input = document.querySelector(`.toggle[data-cam="${cam}"]`);
    if (input) input.disabled = !!disabled;
  }
}

// 토글 개별 제어(실행 중일 때만 허용)
for (const t of document.querySelectorAll('.toggle')){
  t.addEventListener('change', async (e)=>{
    const cam = e.target.dataset.cam;
    const enabled = e.target.checked;
    // 실행상태가 아니면 되돌림
    if (window.__RUNNING__ !== true){
      e.preventDefault();
      await setToggle(cam, false, false);
      return;
    }
    await setToggle(cam, enabled, true);
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

// Start / Stop / E-Stop 버튼 동작 재정의
document.getElementById('btn-start').addEventListener('click', async ()=>{
  const r = await postJSON('/command', {action:'start'});
  window.__RUNNING__ = true;
  setTogglesDisabled(false);
  await setAllToggles(true, true);   // 모두 ON + 서버에 반영
});

document.getElementById('btn-stop').addEventListener('click', async ()=>{
  const r = await postJSON('/command', {action:'stop'});
  window.__RUNNING__ = false;
  await setAllToggles(false, true);  // 모두 OFF
  setTogglesDisabled(true);
});

document.getElementById('btn-estop').addEventListener('click', async ()=>{
  const r = await postJSON('/command', {action:'estop'});
  window.__RUNNING__ = false;
  await setAllToggles(false, true);  // 모두 OFF
  setTogglesDisabled(true);
});

// 초기 로드: 상태에 따라 토글 구성
window.addEventListener('DOMContentLoaded', async ()=>{
  try{
    const s = await (await fetch('/status')).json();
    window.__RUNNING__ = !!s.running;
    if (window.__RUNNING__){
      setTogglesDisabled(false);
      // 요구사항: Start 상태면 모두 ON (서버값과 무관하게 일괄 ON)
      await setAllToggles(true, true);
    }else{
      await setAllToggles(false, false); // OFF로 보이게만, 서버에는 아직 반영되어 있음
      setTogglesDisabled(true);
    }
  }catch(e){ console.error(e); }
});

// 상태 폴링
const procA = document.getElementById('procA');
const procB = document.getElementById('procB');
const sensorA = document.getElementById('sensorA');
const sensorB = document.getElementById('sensorB');
const logEl = document.getElementById('log');

function setLights(container, status){
  for (const el of container.querySelectorAll('.light')) el.classList.remove('active');
  const map = {green:0, orange:1, red:2};
  (container.children[map[status] ?? 0] || container.children[0]).classList.add('active');
}
async function poll(){
  try{
    const data = await (await fetch('/status')).json();
    setLights(procA, data.process.A.status);
    setLights(procB, data.process.B.status);
    setLights(sensorA, data.sensors.A.status);
    setLights(sensorB, data.sensors.B.status);
    logEl.textContent = data.log.join('\n'); logEl.scrollTop = logEl.scrollHeight;
  }catch(err){ console.error('status error', err); }
  finally{ setTimeout(poll, 1000); }
}
poll();
