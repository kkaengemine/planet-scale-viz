import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  SCALE_FACTOR, BODY_VISUAL_SCALE, MOON_VISUAL_SCALE, SPACECRAFT_VISUAL_SCALE,
  EARTH_RADIUS, MOON_RADIUS, MARS_RADIUS, EARTH_ORBIT_RADIUS, MARS_ORBIT_RADIUS,
  MOON_ORBIT_RADIUS
} from './constants.js';

function toScenePos(physPos) {
  return new THREE.Vector3(
    physPos.x / SCALE_FACTOR,
    physPos.z / SCALE_FACTOR, // map physics z to scene y (up)
    -physPos.y / SCALE_FACTOR // map physics y to scene -z
  );
}

export class SolarSystemScene {
  constructor(container) {
    this.container = container;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020010);

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
    this.camera.position.set(0, 180, 180);
    this.camera.lookAt(0, 0, 0);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 2000;

    // Lights
    this._createLights();

    // Stars
    this._createStarfield();

    // Create celestial bodies
    this._createSun();
    this._createEarth();
    this._createMoon();
    this._createMars();
    this._createOrbits();

    // Spacecraft (created on launch)
    this.spacecraftMesh = null;
    this.trajectoryLine = null;
    this.trajectoryPoints = [];

    // Dynamic visual scale multipliers (1.0 = default)
    this.visualScales = { earth: 1, mars: 1, spacecraft: 1 };
    this._baseEarthRadius = EARTH_RADIUS * BODY_VISUAL_SCALE / SCALE_FACTOR;
    this._baseMarsRadius = MARS_RADIUS * BODY_VISUAL_SCALE / SCALE_FACTOR;
    this._baseSpacecraftScale = SPACECRAFT_VISUAL_SCALE * EARTH_RADIUS / SCALE_FACTOR;

    // Handle resize
    window.addEventListener('resize', () => this._onResize());
  }

  _createLights() {
    // Sun light (point light at origin)
    const sunLight = new THREE.PointLight(0xffffff, 2, 0, 0.5);
    sunLight.position.set(0, 0, 0);
    this.scene.add(sunLight);

    // Ambient for visibility
    const ambient = new THREE.AmbientLight(0x333344, 0.8);
    this.scene.add(ambient);
  }

  _createStarfield() {
    const starsGeo = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    for (let i = 0; i < 6000; i++) {
      const r = 1500 + Math.random() * 2000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      const brightness = 0.5 + Math.random() * 0.5;
      colors.push(brightness, brightness, brightness * (0.8 + Math.random() * 0.2));
    }
    starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    starsGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const starsMat = new THREE.PointsMaterial({ size: 1.2, vertexColors: true, sizeAttenuation: false });
    this.scene.add(new THREE.Points(starsGeo, starsMat));
  }

  _createSun() {
    const sunRadius = 4;
    const geo = new THREE.SphereGeometry(sunRadius, 32, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
    this.sunMesh = new THREE.Mesh(geo, mat);

    // Sun glow
    const glowGeo = new THREE.SphereGeometry(sunRadius * 1.6, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffaa22,
      transparent: true,
      opacity: 0.15,
    });
    this.sunMesh.add(new THREE.Mesh(glowGeo, glowMat));
    this.scene.add(this.sunMesh);
  }

  _createEarth() {
    const r = EARTH_RADIUS * BODY_VISUAL_SCALE / SCALE_FACTOR;
    const geo = new THREE.SphereGeometry(r, 32, 32);
    const mat = new THREE.MeshPhongMaterial({
      color: 0x2266cc,
      emissive: 0x112244,
      emissiveIntensity: 0.3,
      shininess: 25,
    });
    this.earthMesh = new THREE.Mesh(geo, mat);

    // Add atmosphere glow
    const atmoGeo = new THREE.SphereGeometry(r * 1.15, 32, 32);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.12,
    });
    this.earthMesh.add(new THREE.Mesh(atmoGeo, atmoMat));
    this.scene.add(this.earthMesh);

    // Earth label
    this.earthLabel = this._createLabel('Earth', 0x4499ff);
    this.scene.add(this.earthLabel);
  }

  _createMoon() {
    const r = MOON_RADIUS * MOON_VISUAL_SCALE / SCALE_FACTOR;
    const geo = new THREE.SphereGeometry(r, 16, 16);
    const mat = new THREE.MeshPhongMaterial({
      color: 0xaaaaaa,
      emissive: 0x333333,
      emissiveIntensity: 0.2,
      shininess: 5,
    });
    this.moonMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.moonMesh);
  }

  _createMars() {
    const r = MARS_RADIUS * BODY_VISUAL_SCALE / SCALE_FACTOR;
    const geo = new THREE.SphereGeometry(r, 32, 32);
    const mat = new THREE.MeshPhongMaterial({
      color: 0xcc4422,
      emissive: 0x441111,
      emissiveIntensity: 0.3,
      shininess: 10,
    });
    this.marsMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.marsMesh);

    // Mars label
    this.marsLabel = this._createLabel('Mars', 0xff6644);
    this.scene.add(this.marsLabel);
  }

  _createLabel(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 36px Arial';
    ctx.fillStyle = '#' + new THREE.Color(color).getHexString();
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 42);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(12, 3, 1);
    return sprite;
  }

  _createOrbits() {
    // Earth orbit
    const earthOrbitR = EARTH_ORBIT_RADIUS / SCALE_FACTOR;
    this._drawOrbitRing(earthOrbitR, 0x1a3366, 0.3);

    // Mars orbit
    const marsOrbitR = MARS_ORBIT_RADIUS / SCALE_FACTOR;
    this._drawOrbitRing(marsOrbitR, 0x662211, 0.3);
  }

  _drawOrbitRing(radius, color, opacity) {
    const segments = 256;
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        radius * Math.cos(theta),
        0,
        radius * Math.sin(theta)
      ));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    this.scene.add(new THREE.Line(geo, mat));
  }

  createSpacecraft() {
    if (this.spacecraftMesh) {
      this.scene.remove(this.spacecraftMesh);
    }
    // Simple spacecraft shape - cone + body
    const group = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.5, 2, 8);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0xcccccc, emissive: 0x444444 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    const noseGeo = new THREE.ConeGeometry(0.3, 0.8, 8);
    const noseMat = new THREE.MeshPhongMaterial({ color: 0xff4444, emissive: 0x441111 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.y = 1.4;
    group.add(nose);

    // Engine glow
    const engineGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const engineMat = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.6 });
    this.engineGlow = new THREE.Mesh(engineGeo, engineMat);
    this.engineGlow.position.y = -1.2;
    group.add(this.engineGlow);

    const scaleVal = this._baseSpacecraftScale * this.visualScales.spacecraft;
    group.scale.setScalar(scaleVal);

    this.spacecraftMesh = group;
    this.scene.add(this.spacecraftMesh);
  }

  updateTrajectory(trajectoryPoints, limit) {
    // Remove old line
    if (this.trajectoryLine) {
      this.scene.remove(this.trajectoryLine);
      this.trajectoryLine.geometry.dispose();
    }

    const count = limit !== undefined ? Math.min(limit, trajectoryPoints.length) : trajectoryPoints.length;
    if (count < 2) return;

    // Downsample for performance
    const maxPoints = 5000;
    const step = Math.max(1, Math.floor(count / maxPoints));
    const points = [];
    for (let i = 0; i < count; i += step) {
      points.push(toScenePos(trajectoryPoints[i]));
    }
    // Always include the last point
    if (points.length > 0) {
      points.push(toScenePos(trajectoryPoints[count - 1]));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);

    // Color gradient: cyan -> yellow -> red
    const colors = [];
    for (let i = 0; i < points.length; i++) {
      const t = i / (points.length - 1);
      if (t < 0.5) {
        const lt = t * 2;
        colors.push(0 + lt, 1, 1 - lt);
      } else {
        const lt = (t - 0.5) * 2;
        colors.push(1, 1 - lt, 0);
      }
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8 });
    this.trajectoryLine = new THREE.Line(geo, mat);
    this.scene.add(this.trajectoryLine);
  }

  update(state) {
    if (!state) return;

    // Update Earth position
    const earthPos = toScenePos(state.earth.pos);
    this.earthMesh.position.copy(earthPos);
    this.earthLabel.position.copy(earthPos).add(new THREE.Vector3(0, 5, 0));

    // Update Moon
    const moonPos = toScenePos(state.moon.pos);
    this.moonMesh.position.copy(moonPos);

    // Update Mars
    const marsPos = toScenePos(state.mars.pos);
    this.marsMesh.position.copy(marsPos);
    this.marsLabel.position.copy(marsPos).add(new THREE.Vector3(0, 5, 0));

    // Update spacecraft
    if (state.spacecraft && this.spacecraftMesh) {
      const scPos = toScenePos(state.spacecraft.pos);
      this.spacecraftMesh.position.copy(scPos);
      this.spacecraftMesh.visible = true;

      // Orient spacecraft along velocity
      if (state.spacecraft.vel) {
        const velDir = toScenePos({ x: state.spacecraft.vel.x, y: state.spacecraft.vel.y, z: state.spacecraft.vel.z || 0 });
        if (velDir.length() > 0) {
          const lookTarget = scPos.clone().add(velDir.normalize());
          this.spacecraftMesh.lookAt(lookTarget);
          this.spacecraftMesh.rotateX(Math.PI / 2);
        }
      }
    }
  }

  render() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setVisualScale(name, multiplier) {
    this.visualScales[name] = multiplier;
    if (name === 'earth') {
      const s = this._baseEarthRadius * multiplier;
      this.earthMesh.scale.setScalar(multiplier);
    } else if (name === 'mars') {
      this.marsMesh.scale.setScalar(multiplier);
    } else if (name === 'spacecraft' && this.spacecraftMesh) {
      const s = this._baseSpacecraftScale * multiplier;
      this.spacecraftMesh.scale.setScalar(s);
    }
  }

  focusOnEarth() {
    const pos = this.earthMesh.position.clone();
    this.controls.target.copy(pos);
    this.camera.position.set(pos.x + 20, pos.y + 20, pos.z + 20);
  }

  focusOnOverview() {
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(0, 180, 180);
  }
}
