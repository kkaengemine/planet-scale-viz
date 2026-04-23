import {
  DEFAULT_LAUNCH_SPEED, DEFAULT_LAUNCH_ANGLE,
  MIN_LAUNCH_SPEED, MAX_LAUNCH_SPEED,
  MIN_LAUNCH_ANGLE, MAX_LAUNCH_ANGLE,
  SECONDS_PER_DAY, MAX_SIM_TIME
} from './constants.js';

export class UI {
  constructor(onLaunch, onReset, onSpeedChange, onTimeSlider, onPauseToggle, onCameraMode, onVisualScale) {
    this.onLaunch = onLaunch;
    this.onReset = onReset;
    this.onSpeedChange = onSpeedChange;
    this.onTimeSlider = onTimeSlider;
    this.onPauseToggle = onPauseToggle;
    this.onCameraMode = onCameraMode;
    this.onVisualScale = onVisualScale;

    this.launchAngle = DEFAULT_LAUNCH_ANGLE;
    this.launchSpeed = DEFAULT_LAUNCH_SPEED;
    this.isPaused = false;
    this.isLaunched = false;

    this._createStyles();
    this._createUI();
  }

  _createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { overflow: hidden; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #e0e8ff; }
      #app { width: 100vw; height: 100vh; }

      .panel {
        position: absolute;
        background: rgba(8, 12, 30, 0.88);
        border: 1px solid rgba(80, 120, 255, 0.25);
        border-radius: 12px;
        backdrop-filter: blur(12px);
        padding: 16px;
        pointer-events: auto;
      }

      .panel-title {
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: #7aa4ff;
        margin-bottom: 12px;
      }

      /* Launch Controls */
      #launch-panel {
        top: 20px;
        left: 20px;
        width: 300px;
      }

      .control-group {
        margin-bottom: 14px;
      }

      .control-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        color: #8899bb;
        margin-bottom: 6px;
      }

      .control-value {
        color: #44ddff;
        font-weight: 600;
        font-size: 14px;
        font-family: 'JetBrains Mono', 'Courier New', monospace;
      }

      input[type="range"] {
        -webkit-appearance: none;
        width: 100%;
        height: 6px;
        background: rgba(60, 80, 140, 0.4);
        border-radius: 3px;
        outline: none;
        cursor: pointer;
      }

      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        background: radial-gradient(circle, #44ddff, #2266cc);
        border-radius: 50%;
        border: 2px solid #66eeff;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(68, 221, 255, 0.4);
      }

      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
        letter-spacing: 0.5px;
      }

      .btn-launch {
        width: 100%;
        background: linear-gradient(135deg, #0055ff, #0088ff);
        color: white;
        font-size: 16px;
        padding: 12px;
        text-transform: uppercase;
        letter-spacing: 2px;
      }
      .btn-launch:hover { background: linear-gradient(135deg, #0066ff, #00aaff); box-shadow: 0 0 20px rgba(0, 100, 255, 0.4); }
      .btn-launch:active { transform: scale(0.97); }
      .btn-launch:disabled { opacity: 0.4; cursor: not-allowed; }

      .btn-reset {
        width: 100%;
        background: rgba(255, 60, 60, 0.15);
        color: #ff6666;
        border: 1px solid rgba(255, 60, 60, 0.3);
        margin-top: 8px;
      }
      .btn-reset:hover { background: rgba(255, 60, 60, 0.25); }

      /* Info Panel */
      #info-panel {
        top: 20px;
        right: 20px;
        width: 280px;
      }

      .info-row {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        border-bottom: 1px solid rgba(60, 80, 140, 0.2);
        font-size: 13px;
      }

      .info-label { color: #8899bb; }
      .info-value { color: #44ddff; font-family: 'JetBrains Mono', 'Courier New', monospace; font-weight: 600; }

      /* Result Banner */
      #result-banner {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 30px 50px;
        border-radius: 16px;
        text-align: center;
        display: none;
        z-index: 100;
        backdrop-filter: blur(16px);
        animation: fadeIn 0.5s ease;
      }

      @keyframes fadeIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); } }

      .result-success {
        background: rgba(0, 180, 80, 0.2);
        border: 2px solid rgba(0, 255, 120, 0.5);
      }
      .result-fail {
        background: rgba(180, 40, 0, 0.2);
        border: 2px solid rgba(255, 80, 40, 0.5);
      }

      .result-title { font-size: 28px; font-weight: 800; margin-bottom: 12px; }
      .result-detail { font-size: 14px; color: #aabbcc; line-height: 1.8; }
      .result-detail span { color: #44ddff; font-weight: 600; }

      /* Time Controls */
      #time-panel {
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: min(700px, calc(100vw - 40px));
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .time-controls-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .time-display {
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 14px;
        color: #44ddff;
        min-width: 110px;
        text-align: center;
      }

      #time-slider {
        flex: 1;
      }

      .speed-buttons {
        display: flex;
        gap: 4px;
      }

      .btn-speed {
        padding: 6px 10px;
        font-size: 11px;
        background: rgba(40, 60, 120, 0.4);
        color: #8899bb;
        border: 1px solid rgba(60, 80, 140, 0.3);
        border-radius: 6px;
      }
      .btn-speed:hover { background: rgba(60, 80, 160, 0.5); color: #aabbdd; }
      .btn-speed.active { background: rgba(0, 100, 255, 0.3); color: #44ddff; border-color: rgba(0, 100, 255, 0.5); }

      .btn-pause {
        padding: 6px 14px;
        font-size: 13px;
        background: rgba(40, 60, 120, 0.4);
        color: #aabbdd;
        border: 1px solid rgba(60, 80, 140, 0.3);
        border-radius: 6px;
        min-width: 38px;
      }
      .btn-pause:hover { background: rgba(60, 80, 160, 0.5); }

      /* Camera buttons */
      #camera-panel {
        bottom: 90px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 6px;
        padding: 8px 12px;
      }

      .btn-cam {
        padding: 6px 14px;
        font-size: 12px;
        background: rgba(40, 60, 120, 0.4);
        color: #8899bb;
        border: 1px solid rgba(60, 80, 140, 0.3);
        border-radius: 6px;
      }
      .btn-cam:hover { background: rgba(60, 80, 160, 0.5); color: #aabbdd; }

      /* Visual Scale Panel */
      #scale-panel {
        top: 260px;
        right: 20px;
        width: 280px;
      }

      .scale-toggle {
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
      }

      .scale-toggle-arrow {
        font-size: 10px;
        color: #667799;
        transition: transform 0.2s;
      }

      .scale-toggle-arrow.open {
        transform: rotate(90deg);
      }

      .scale-body {
        overflow: hidden;
        max-height: 0;
        transition: max-height 0.3s ease;
      }

      .scale-body.open {
        max-height: 300px;
      }

      .scale-body .control-group:first-child {
        margin-top: 12px;
      }

      /* Angle visual */
      .angle-visual {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 6px;
      }

      .angle-dial {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: 2px solid rgba(60, 80, 140, 0.5);
        position: relative;
        flex-shrink: 0;
      }

      .angle-arrow {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 24px;
        height: 2px;
        background: #44ddff;
        transform-origin: 0% 50%;
        box-shadow: 0 0 6px rgba(68, 221, 255, 0.5);
      }

      .angle-center {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 6px;
        height: 6px;
        background: #44ddff;
        border-radius: 50%;
      }

      /* Title */
      #title-overlay {
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
        pointer-events: none;
      }

      #title-overlay h1 {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 4px;
        background: linear-gradient(135deg, #44ddff, #aa88ff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      #title-overlay p {
        font-size: 11px;
        color: #667799;
        letter-spacing: 2px;
        margin-top: 4px;
      }
    `;
    document.head.appendChild(style);
  }

  _createUI() {
    const app = document.getElementById('app');

    // Title
    app.insertAdjacentHTML('beforeend', `
      <div id="title-overlay">
        <h1>SWINGBYME</h1>
        <p>ORBITAL MECHANICS SIMULATOR</p>
      </div>
    `);

    // Launch panel
    app.insertAdjacentHTML('beforeend', `
      <div id="launch-panel" class="panel">
        <div class="panel-title">Launch Controls</div>

        <div class="control-group">
          <div class="control-label">
            <span>Launch Angle (prograde)</span>
            <span class="control-value" id="angle-value">${this.launchAngle}°</span>
          </div>
          <div class="angle-visual">
            <div class="angle-dial">
              <div class="angle-center"></div>
              <div class="angle-arrow" id="angle-arrow"></div>
            </div>
            <input type="range" id="angle-slider" min="${MIN_LAUNCH_ANGLE}" max="${MAX_LAUNCH_ANGLE}" value="${this.launchAngle}" step="1" />
          </div>
        </div>

        <div class="control-group">
          <div class="control-label">
            <span>Launch Speed</span>
            <span class="control-value" id="speed-value">${(this.launchSpeed / 1000).toFixed(1)} km/s</span>
          </div>
          <input type="range" id="speed-slider" min="${MIN_LAUNCH_SPEED}" max="${MAX_LAUNCH_SPEED}" value="${this.launchSpeed}" step="100" />
        </div>

        <button class="btn btn-launch" id="btn-launch">Launch!</button>
        <button class="btn btn-reset" id="btn-reset">Reset</button>
      </div>
    `);

    // Info panel
    app.insertAdjacentHTML('beforeend', `
      <div id="info-panel" class="panel">
        <div class="panel-title">Mission Telemetry</div>
        <div class="info-row"><span class="info-label">Elapsed</span><span class="info-value" id="info-time">0d 0h</span></div>
        <div class="info-row"><span class="info-label">Speed</span><span class="info-value" id="info-speed">0 km/s</span></div>
        <div class="info-row"><span class="info-label">Earth Dist</span><span class="info-value" id="info-earth-dist">0 km</span></div>
        <div class="info-row"><span class="info-label">Mars Dist</span><span class="info-value" id="info-mars-dist">0 km</span></div>
        <div class="info-row"><span class="info-label">Status</span><span class="info-value" id="info-status">Ready</span></div>
      </div>
    `);

    // Visual scale panel
    app.insertAdjacentHTML('beforeend', `
      <div id="scale-panel" class="panel">
        <div class="scale-toggle" id="scale-toggle">
          <div class="panel-title" style="margin-bottom:0">Visual Scale</div>
          <span class="scale-toggle-arrow" id="scale-arrow">&#9654;</span>
        </div>
        <div class="scale-body" id="scale-body">
          <div class="control-group">
            <div class="control-label">
              <span>Earth</span>
              <span class="control-value" id="scale-earth-value">x1.0</span>
            </div>
            <input type="range" id="scale-earth" min="0.1" max="5" value="1" step="0.1" />
          </div>
          <div class="control-group">
            <div class="control-label">
              <span>Mars</span>
              <span class="control-value" id="scale-mars-value">x1.0</span>
            </div>
            <input type="range" id="scale-mars" min="0.1" max="5" value="1" step="0.1" />
          </div>
          <div class="control-group">
            <div class="control-label">
              <span>Spacecraft</span>
              <span class="control-value" id="scale-spacecraft-value">x1.0</span>
            </div>
            <input type="range" id="scale-spacecraft" min="0.1" max="10" value="1" step="0.1" />
          </div>
        </div>
      </div>
    `);

    // Result banner
    app.insertAdjacentHTML('beforeend', `
      <div id="result-banner">
        <div class="result-title" id="result-title"></div>
        <div class="result-detail" id="result-detail"></div>
      </div>
    `);

    // Camera controls
    app.insertAdjacentHTML('beforeend', `
      <div id="camera-panel" class="panel">
        <button class="btn btn-cam" data-cam="overview">Overview</button>
        <button class="btn btn-cam" data-cam="earth">Earth</button>
        <button class="btn btn-cam" data-cam="follow">Follow</button>
      </div>
    `);

    // Time controls
    app.insertAdjacentHTML('beforeend', `
      <div id="time-panel" class="panel">
        <div class="time-controls-row">
          <button class="btn btn-pause" id="btn-pause">| |</button>
          <span class="time-display" id="time-display">Day 0</span>
          <input type="range" id="time-slider" min="0" max="1000" value="0" step="1" />
          <div class="speed-buttons">
            <button class="btn btn-speed" data-speed="1">x1</button>
            <button class="btn btn-speed active" data-speed="10">x10</button>
            <button class="btn btn-speed" data-speed="100">x100</button>
            <button class="btn btn-speed" data-speed="1000">x1000</button>
          </div>
        </div>
      </div>
    `);

    this._bindEvents();
    this._updateAngleDial();
  }

  _bindEvents() {
    // Angle slider
    const angleSlider = document.getElementById('angle-slider');
    angleSlider.addEventListener('input', (e) => {
      this.launchAngle = Number(e.target.value);
      document.getElementById('angle-value').textContent = `${this.launchAngle}°`;
      this._updateAngleDial();
    });

    // Speed slider
    const speedSlider = document.getElementById('speed-slider');
    speedSlider.addEventListener('input', (e) => {
      this.launchSpeed = Number(e.target.value);
      document.getElementById('speed-value').textContent = `${(this.launchSpeed / 1000).toFixed(1)} km/s`;
    });

    // Launch
    document.getElementById('btn-launch').addEventListener('click', () => {
      if (!this.isLaunched) {
        this.isLaunched = true;
        document.getElementById('btn-launch').disabled = true;
        document.getElementById('angle-slider').disabled = true;
        document.getElementById('speed-slider').disabled = true;
        this.onLaunch(this.launchAngle, this.launchSpeed);
      }
    });

    // Reset
    document.getElementById('btn-reset').addEventListener('click', () => {
      this.isLaunched = false;
      this.isPaused = false;
      document.getElementById('btn-launch').disabled = false;
      document.getElementById('angle-slider').disabled = false;
      document.getElementById('speed-slider').disabled = false;
      document.getElementById('result-banner').style.display = 'none';
      document.getElementById('btn-pause').textContent = '| |';
      document.getElementById('time-slider').value = 0;
      this.onReset();
    });

    // Pause
    document.getElementById('btn-pause').addEventListener('click', () => {
      this.isPaused = !this.isPaused;
      document.getElementById('btn-pause').textContent = this.isPaused ? '>' : '| |';
      this.onPauseToggle(this.isPaused);
    });

    // Speed buttons
    document.querySelectorAll('.btn-speed').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-speed').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.onSpeedChange(Number(e.target.dataset.speed));
      });
    });

    // Time slider
    const timeSlider = document.getElementById('time-slider');
    timeSlider.addEventListener('input', (e) => {
      const val = Number(e.target.value) / 1000; // 0-1
      this.onTimeSlider(val);
    });

    // Camera buttons
    document.querySelectorAll('.btn-cam').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.onCameraMode(e.target.dataset.cam);
      });
    });

    // Scale panel toggle
    document.getElementById('scale-toggle').addEventListener('click', () => {
      document.getElementById('scale-body').classList.toggle('open');
      document.getElementById('scale-arrow').classList.toggle('open');
    });

    // Scale sliders
    ['earth', 'mars', 'spacecraft'].forEach(name => {
      document.getElementById(`scale-${name}`).addEventListener('input', (e) => {
        const val = Number(e.target.value);
        document.getElementById(`scale-${name}-value`).textContent = `x${val.toFixed(1)}`;
        this.onVisualScale(name, val);
      });
    });
  }

  _updateAngleDial() {
    const arrow = document.getElementById('angle-arrow');
    if (arrow) {
      arrow.style.transform = `rotate(${-this.launchAngle}deg)`;
    }
  }

  updateInfo(info) {
    if (!info) return;

    const days = Math.floor(info.time / SECONDS_PER_DAY);
    const hours = Math.floor((info.time % SECONDS_PER_DAY) / 3600);
    document.getElementById('info-time').textContent = `${days}d ${hours}h`;
    document.getElementById('info-speed').textContent = `${(info.speed / 1000).toFixed(2)} km/s`;
    document.getElementById('info-earth-dist').textContent = formatDistance(info.earthDist);
    document.getElementById('info-mars-dist').textContent = formatDistance(info.marsDist);

    // Status
    const statusEl = document.getElementById('info-status');
    if (!info.launched) {
      statusEl.textContent = 'Ready';
      statusEl.style.color = '#8899bb';
    } else if (info.finished && info.result?.success) {
      statusEl.textContent = 'Mars Reached!';
      statusEl.style.color = '#44ff88';
    } else if (info.finished) {
      statusEl.textContent = 'Mission Failed';
      statusEl.style.color = '#ff4444';
    } else {
      statusEl.textContent = 'In Transit';
      statusEl.style.color = '#44ddff';
    }

    // Time slider
    if (info.launched) {
      const progress = Math.min(1, info.time / MAX_SIM_TIME);
      document.getElementById('time-slider').value = Math.round(progress * 1000);
      document.getElementById('time-display').textContent = `Day ${days}`;
    }
  }

  showResult(result) {
    const banner = document.getElementById('result-banner');
    const title = document.getElementById('result-title');
    const detail = document.getElementById('result-detail');

    banner.className = result.success ? 'result-success' : 'result-fail';

    if (result.success) {
      const days = Math.floor(result.time / SECONDS_PER_DAY);
      title.textContent = 'MISSION SUCCESS!';
      title.style.color = '#44ff88';
      detail.innerHTML = `
        Mars approach achieved!<br>
        Closest distance: <span>${formatDistance(result.distance)}</span><br>
        Travel time: <span>${days} days</span><br>
        Arrival speed: <span>${(result.speed / 1000).toFixed(2)} km/s</span>
      `;
    } else {
      title.textContent = 'MISSION FAILED';
      title.style.color = '#ff4444';
      const days = Math.floor(result.time / SECONDS_PER_DAY);
      detail.innerHTML = `
        Could not reach Mars within ${days} days.<br>
        Final Mars distance: <span>${formatDistance(result.distance)}</span><br>
        Try adjusting your launch angle and speed!
      `;
    }

    banner.style.display = 'block';
  }
}

function formatDistance(meters) {
  if (meters > 1e9) return `${(meters / 1e9).toFixed(2)} M km`;
  if (meters > 1e6) return `${(meters / 1e6).toFixed(1)} k km`;
  return `${(meters / 1000).toFixed(0)} km`;
}
