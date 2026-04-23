import {
  G, SUN_MASS, EARTH_MASS, MOON_MASS, MARS_MASS,
  EARTH_ORBIT_RADIUS, EARTH_ORBITAL_SPEED,
  MOON_ORBIT_RADIUS, MOON_ORBITAL_SPEED,
  MARS_ORBIT_RADIUS, MARS_ORBITAL_SPEED,
  SPACECRAFT_MASS, PHYSICS_DT, MAX_SIM_TIME,
  MARS_SUCCESS_DISTANCE, MARS_RADIUS
} from './constants.js';

// Vector3 helper (simple, no dependency)
class Vec3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x; this.y = y; this.z = z;
  }
  add(v) { return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z); }
  sub(v) { return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z); }
  scale(s) { return new Vec3(this.x * s, this.y * s, this.z * s); }
  length() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
  clone() { return new Vec3(this.x, this.y, this.z); }
}

// Body state
function createBody(name, mass, pos, vel) {
  return { name, mass, pos: pos.clone(), vel: vel.clone() };
}

// Compute gravitational acceleration on body i from all other bodies
function computeAcceleration(bodies, i) {
  let ax = 0, ay = 0, az = 0;
  const bi = bodies[i];
  for (let j = 0; j < bodies.length; j++) {
    if (i === j) continue;
    const bj = bodies[j];
    const dx = bj.pos.x - bi.pos.x;
    const dy = bj.pos.y - bi.pos.y;
    const dz = bj.pos.z - bi.pos.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const dist = Math.sqrt(distSq);
    // Softening to prevent singularity at very close distances
    const softDist = Math.max(dist, 1e6);
    const force = G * bj.mass / (softDist * softDist * softDist);
    ax += force * dx;
    ay += force * dy;
    az += force * dz;
  }
  return new Vec3(ax, ay, az);
}

// Velocity Verlet integration step
function stepVerlet(bodies, dt) {
  const n = bodies.length;
  // Compute accelerations at current positions
  const accOld = [];
  for (let i = 0; i < n; i++) {
    accOld.push(computeAcceleration(bodies, i));
  }

  // Update positions
  for (let i = 0; i < n; i++) {
    const b = bodies[i];
    b.pos.x += b.vel.x * dt + 0.5 * accOld[i].x * dt * dt;
    b.pos.y += b.vel.y * dt + 0.5 * accOld[i].y * dt * dt;
    b.pos.z += b.vel.z * dt + 0.5 * accOld[i].z * dt * dt;
  }

  // Compute new accelerations
  const accNew = [];
  for (let i = 0; i < n; i++) {
    accNew.push(computeAcceleration(bodies, i));
  }

  // Update velocities
  for (let i = 0; i < n; i++) {
    const b = bodies[i];
    b.vel.x += 0.5 * (accOld[i].x + accNew[i].x) * dt;
    b.vel.y += 0.5 * (accOld[i].y + accNew[i].y) * dt;
    b.vel.z += 0.5 * (accOld[i].z + accNew[i].z) * dt;
  }
}

export class Simulation {
  constructor() {
    this.reset();
  }

  reset() {
    this.time = 0;
    this.launched = false;
    this.finished = false;
    this.result = null;
    this.trajectoryPoints = [];
    this.snapshots = []; // Store periodic snapshots for time slider

    // Initialize celestial bodies in the ecliptic plane (z=0)
    // Sun at origin
    this.sun = createBody('Sun', SUN_MASS, new Vec3(0, 0, 0), new Vec3(0, 0, 0));

    // Earth starts on positive x-axis
    this.earth = createBody('Earth', EARTH_MASS,
      new Vec3(EARTH_ORBIT_RADIUS, 0, 0),
      new Vec3(0, EARTH_ORBITAL_SPEED, 0) // tangential velocity
    );

    // Moon relative to Earth
    this.moon = createBody('Moon', MOON_MASS,
      new Vec3(EARTH_ORBIT_RADIUS + MOON_ORBIT_RADIUS, 0, 0),
      new Vec3(0, EARTH_ORBITAL_SPEED + MOON_ORBITAL_SPEED, 0)
    );

    // Mars starts at an angle (ahead in orbit) - ~44 degrees for Hohmann-like window
    const marsAngle = 0.77; // radians (~44 degrees)
    this.mars = createBody('Mars', MARS_MASS,
      new Vec3(MARS_ORBIT_RADIUS * Math.cos(marsAngle), MARS_ORBIT_RADIUS * Math.sin(marsAngle), 0),
      new Vec3(-MARS_ORBITAL_SPEED * Math.sin(marsAngle), MARS_ORBITAL_SPEED * Math.cos(marsAngle), 0)
    );

    // Spacecraft (not launched yet)
    this.spacecraft = null;

    this._buildBodiesArray();
    this._saveSnapshot();
  }

  _buildBodiesArray() {
    this.bodies = [this.sun, this.earth, this.moon, this.mars];
    if (this.spacecraft) {
      this.bodies.push(this.spacecraft);
    }
  }

  launch(angleDeg, speed) {
    if (this.launched) return;

    // Angle is measured from Earth's current velocity direction (prograde)
    // Convert to absolute angle
    const earthVelAngle = Math.atan2(this.earth.vel.y, this.earth.vel.x);
    const launchAngleRad = (angleDeg * Math.PI / 180) + earthVelAngle;

    // Spacecraft starts at Earth's surface (direction of launch)
    const earthR = 6.371e6;
    const startX = this.earth.pos.x + earthR * Math.cos(launchAngleRad) * 10;
    const startY = this.earth.pos.y + earthR * Math.sin(launchAngleRad) * 10;

    // Velocity = Earth's velocity + launch velocity
    const vx = this.earth.vel.x + speed * Math.cos(launchAngleRad);
    const vy = this.earth.vel.y + speed * Math.sin(launchAngleRad);

    this.spacecraft = createBody('Spacecraft', SPACECRAFT_MASS,
      new Vec3(startX, startY, 0),
      new Vec3(vx, vy, 0)
    );

    this.launched = true;
    this.finished = false;
    this.result = null;
    this.trajectoryPoints = [this.spacecraft.pos.clone()];
    this.snapshots = [];
    this._buildBodiesArray();
    this._saveSnapshot();
  }

  // Advance simulation by realDt seconds
  step(realDt) {
    if (!this.launched || this.finished) return;

    // Sub-step with fixed physics dt
    let remaining = realDt;
    while (remaining > 0) {
      const dt = Math.min(remaining, PHYSICS_DT);
      stepVerlet(this.bodies, dt);
      remaining -= dt;
      this.time += dt;

      // Record trajectory
      if (this.spacecraft) {
        this.trajectoryPoints.push(this.spacecraft.pos.clone());
      }

      // Check Mars proximity
      if (this.spacecraft) {
        const dist = this.spacecraft.pos.sub(this.mars.pos).length();
        if (dist < MARS_SUCCESS_DISTANCE) {
          this.finished = true;
          this.result = {
            success: true,
            time: this.time,
            distance: dist,
            speed: this.spacecraft.vel.length()
          };
          break;
        }
      }

      // Check if exceeded max simulation time
      if (this.time >= MAX_SIM_TIME) {
        this.finished = true;
        const dist = this.spacecraft ? this.spacecraft.pos.sub(this.mars.pos).length() : Infinity;
        this.result = {
          success: false,
          time: this.time,
          distance: dist,
          speed: this.spacecraft ? this.spacecraft.vel.length() : 0
        };
        break;
      }
    }

    // Save snapshot periodically (every ~1 day of sim time)
    if (this.snapshots.length === 0 || this.time - this.snapshots[this.snapshots.length - 1].time > 86400) {
      this._saveSnapshot();
    }
  }

  // Pre-compute the entire trajectory
  precompute() {
    if (!this.launched) return;
    this.snapshots = [];
    this._saveSnapshot();

    while (!this.finished) {
      this.step(PHYSICS_DT * 10); // 10-minute steps for precompute
    }
    this._saveSnapshot(); // Final snapshot
  }

  _saveSnapshot() {
    this.snapshots.push({
      time: this.time,
      earth: { pos: this.earth.pos.clone(), vel: this.earth.vel.clone() },
      moon: { pos: this.moon.pos.clone(), vel: this.moon.vel.clone() },
      mars: { pos: this.mars.pos.clone(), vel: this.mars.vel.clone() },
      spacecraft: this.spacecraft ? { pos: this.spacecraft.pos.clone(), vel: this.spacecraft.vel.clone() } : null,
      trajectoryLength: this.trajectoryPoints.length
    });
  }

  // Get interpolated state at a specific time (for time slider)
  getStateAtTime(targetTime) {
    if (this.snapshots.length === 0) return null;

    // Find bracketing snapshots
    let lo = 0, hi = this.snapshots.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (this.snapshots[mid].time <= targetTime) lo = mid;
      else hi = mid;
    }

    const s0 = this.snapshots[lo];
    const s1 = this.snapshots[hi];

    if (s0.time === s1.time) return s0;

    const t = Math.max(0, Math.min(1, (targetTime - s0.time) / (s1.time - s0.time)));

    function lerpVec(a, b, t) {
      return new Vec3(
        a.x + (b.x - a.x) * t,
        a.y + (b.y - a.y) * t,
        a.z + (b.z - a.z) * t
      );
    }

    return {
      time: s0.time + (s1.time - s0.time) * t,
      earth: { pos: lerpVec(s0.earth.pos, s1.earth.pos, t), vel: lerpVec(s0.earth.vel, s1.earth.vel, t) },
      moon: { pos: lerpVec(s0.moon.pos, s1.moon.pos, t), vel: lerpVec(s0.moon.vel, s1.moon.vel, t) },
      mars: { pos: lerpVec(s0.mars.pos, s1.mars.pos, t), vel: lerpVec(s0.mars.vel, s1.mars.vel, t) },
      spacecraft: s0.spacecraft && s1.spacecraft ? {
        pos: lerpVec(s0.spacecraft.pos, s1.spacecraft.pos, t),
        vel: lerpVec(s0.spacecraft.vel, s1.spacecraft.vel, t)
      } : s0.spacecraft,
      trajectoryLength: Math.round(s0.trajectoryLength + (s1.trajectoryLength - s0.trajectoryLength) * t)
    };
  }

  getInfo() {
    const earthDist = this.spacecraft ? this.spacecraft.pos.sub(this.earth.pos).length() : 0;
    const marsDist = this.spacecraft ? this.spacecraft.pos.sub(this.mars.pos).length() : 0;
    const speed = this.spacecraft ? this.spacecraft.vel.length() : 0;
    return {
      time: this.time,
      earthDist,
      marsDist,
      speed,
      launched: this.launched,
      finished: this.finished,
      result: this.result
    };
  }
}
