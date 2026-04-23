import { Simulation } from './physics.js';
import { SolarSystemScene } from './scene.js';
import { UI } from './ui.js';
import { SECONDS_PER_DAY, MAX_SIM_TIME, PHYSICS_DT } from './constants.js';

class App {
  constructor() {
    this.sim = new Simulation();
    this.scene = new SolarSystemScene(document.getElementById('app'));

    this.simSpeed = 10; // x10 speed multiplier
    this.isPaused = false;
    this.isTimeSliding = false;
    this.precomputed = false;

    this.ui = new UI(
      (angle, speed) => this.launch(angle, speed),
      () => this.reset(),
      (speed) => { this.simSpeed = speed; },
      (t) => this.seekTime(t),
      (paused) => { this.isPaused = paused; },
      (mode) => this.setCameraMode(mode),
      (name, val) => this.scene.setVisualScale(name, val)
    );

    // Initial scene state
    this._updateSceneFromSim();

    // Start render loop
    this.lastTime = performance.now();
    this._animate();
  }

  launch(angleDeg, speed) {
    this.sim.launch(angleDeg, speed);
    this.scene.createSpacecraft();
    this.precomputed = false;

    // Pre-compute the full trajectory in the background
    // We'll use a copy of the simulation for precompute
    this._precomputeAsync();
  }

  _precomputeAsync() {
    // Create a copy of current sim state to precompute
    const precomputeSim = new Simulation();
    precomputeSim.reset();

    // Copy current time and positions
    precomputeSim.time = this.sim.time;
    precomputeSim.earth.pos = this.sim.earth.pos.clone();
    precomputeSim.earth.vel = this.sim.earth.vel.clone();
    precomputeSim.moon.pos = this.sim.moon.pos.clone();
    precomputeSim.moon.vel = this.sim.moon.vel.clone();
    precomputeSim.mars.pos = this.sim.mars.pos.clone();
    precomputeSim.mars.vel = this.sim.mars.vel.clone();
    precomputeSim.sun.pos = this.sim.sun.pos.clone();
    precomputeSim.sun.vel = this.sim.sun.vel.clone();

    if (this.sim.spacecraft) {
      precomputeSim.spacecraft = {
        name: 'Spacecraft',
        mass: this.sim.spacecraft.mass,
        pos: this.sim.spacecraft.pos.clone(),
        vel: this.sim.spacecraft.vel.clone()
      };
    }
    precomputeSim.launched = true;
    precomputeSim.trajectoryPoints = [...this.sim.trajectoryPoints.map(p => p.clone())];
    precomputeSim._buildBodiesArray();
    precomputeSim.snapshots = [];
    precomputeSim._saveSnapshot();

    // Run precompute in chunks to avoid blocking
    const chunkSize = 2000;
    const doChunk = () => {
      for (let i = 0; i < chunkSize && !precomputeSim.finished; i++) {
        precomputeSim.step(PHYSICS_DT * 10);
      }

      if (!precomputeSim.finished) {
        requestAnimationFrame(doChunk);
      } else {
        // Store precomputed data back
        this.sim.snapshots = precomputeSim.snapshots;
        this.sim.trajectoryPoints = precomputeSim.trajectoryPoints;
        this.sim.result = precomputeSim.result;
        this.precomputed = true;
      }
    };
    requestAnimationFrame(doChunk);
  }

  reset() {
    this.sim.reset();
    this.precomputed = false;
    this.isPaused = false;
    this.isTimeSliding = false;

    // Remove spacecraft from scene
    if (this.scene.spacecraftMesh) {
      this.scene.scene.remove(this.scene.spacecraftMesh);
      this.scene.spacecraftMesh = null;
    }
    if (this.scene.trajectoryLine) {
      this.scene.scene.remove(this.scene.trajectoryLine);
      this.scene.trajectoryLine = null;
    }

    this._updateSceneFromSim();
    this.scene.focusOnOverview();
  }

  seekTime(t) {
    if (!this.sim.launched || this.sim.snapshots.length === 0) return;

    this.isTimeSliding = true;
    const maxTime = this.sim.snapshots[this.sim.snapshots.length - 1].time;
    const targetTime = t * maxTime;
    const state = this.sim.getStateAtTime(targetTime);

    if (state) {
      this.scene.update(state);
      this.scene.updateTrajectory(this.sim.trajectoryPoints, state.trajectoryLength);

      // Update info
      const earthDist = state.spacecraft ?
        Math.sqrt((state.spacecraft.pos.x - state.earth.pos.x) ** 2 + (state.spacecraft.pos.y - state.earth.pos.y) ** 2) : 0;
      const marsDist = state.spacecraft ?
        Math.sqrt((state.spacecraft.pos.x - state.mars.pos.x) ** 2 + (state.spacecraft.pos.y - state.mars.pos.y) ** 2) : 0;
      const speed = state.spacecraft ?
        Math.sqrt(state.spacecraft.vel.x ** 2 + state.spacecraft.vel.y ** 2) : 0;

      this.ui.updateInfo({
        time: state.time,
        earthDist,
        marsDist,
        speed,
        launched: true,
        finished: false,
        result: null
      });
    }

    // Release time sliding after a brief delay
    clearTimeout(this._timeSlideTimeout);
    this._timeSlideTimeout = setTimeout(() => {
      this.isTimeSliding = false;
    }, 200);
  }

  setCameraMode(mode) {
    if (mode === 'overview') {
      this.scene.focusOnOverview();
    } else if (mode === 'earth') {
      this.scene.focusOnEarth();
    } else if (mode === 'follow' && this.scene.spacecraftMesh) {
      const pos = this.scene.spacecraftMesh.position;
      this.scene.controls.target.copy(pos);
      this.scene.camera.position.set(pos.x + 10, pos.y + 10, pos.z + 10);
    }
  }

  _updateSceneFromSim() {
    this.scene.update({
      earth: { pos: this.sim.earth.pos, vel: this.sim.earth.vel },
      moon: { pos: this.sim.moon.pos, vel: this.sim.moon.vel },
      mars: { pos: this.sim.mars.pos, vel: this.sim.mars.vel },
      spacecraft: this.sim.spacecraft ? {
        pos: this.sim.spacecraft.pos,
        vel: this.sim.spacecraft.vel
      } : null
    });
  }

  _animate() {
    requestAnimationFrame(() => this._animate());

    const now = performance.now();
    const realDt = Math.min((now - this.lastTime) / 1000, 0.1); // cap at 100ms
    this.lastTime = now;

    if (!this.isPaused && !this.isTimeSliding && this.sim.launched && !this.sim.finished) {
      // Advance simulation
      const simDt = realDt * this.simSpeed * SECONDS_PER_DAY;
      this.sim.step(simDt);

      // Update scene
      this._updateSceneFromSim();

      // Update trajectory
      this.scene.updateTrajectory(this.sim.trajectoryPoints);

      // Update UI info
      this.ui.updateInfo(this.sim.getInfo());

      // Check finish
      if (this.sim.finished && this.sim.result) {
        this.ui.showResult(this.sim.result);
        this.ui.updateInfo(this.sim.getInfo());
      }
    } else if (!this.sim.launched) {
      // Animate planets slowly even before launch
      this.sim.step(realDt * SECONDS_PER_DAY * 0.5);
      this._updateSceneFromSim();
    }

    this.scene.render();
  }
}

// Start
new App();
