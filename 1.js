// === FLIGHT HUD SCRIPT ACTUALIZADO === //
// Versión mejorada visual con proporciones y blur en extremos como el HUD de Iron Man

const TILT_THRESHOLD = 0;
const EXTREME_TILT_THRESHOLD = 20;
const MOVEMENT_SPEED = 1;
const VERTICAL_SPEED = 0.05;
const NEUTRAL_ANGLE = 0;

AFRAME.registerComponent('flight-button', {
  init: function() {
    this.el.addEventListener('click', () => {
      const rig = document.querySelector('#rig');
      const flightControls = rig.components['flight-controls'];
      flightControls.toggleFlightMode();
      this.el.setAttribute('material', {
        color: flightControls.flightMode ? '#00ffff' : '#ff4400'
      });
    });
  }
});

AFRAME.registerComponent('flight-controls', {
  init: function() {
    this.flightMode = false;
    this.currentVelocity = new THREE.Vector3();
    this.animationFrame = 0;

    this.hud = document.createElement('div');
    this.hud.id = 'flight-hud';
    document.body.appendChild(this.hud);

    const style = document.createElement('style');
    style.textContent = `
      #flight-hud {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
        font-family: monospace;
        color: #00ffff;
        text-shadow: 0 0 5px #00ffff;
        overflow: hidden;
      }
      .brujula-fija {
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        height: 40px;
        width: 75%;
        border-top: 1px solid #00ffff33;
        backdrop-filter: blur(4px);
      }
      .brujula-fija::before,
      .brujula-fija::after {
        content: '';
        position: absolute;
        top: 0;
        width: 10%;
        height: 100%;
        background: linear-gradient(to right, rgba(0,255,255,0.2), transparent);
        z-index: 2;
      }
      .brujula-fija::after {
        right: 0;
        left: auto;
        background: linear-gradient(to left, rgba(0,255,255,0.2), transparent);
      }
      .brujula-tick {
        position: absolute;
        top: 0;
        width: 1px;
        height: 12px;
        background: #00ffffaa;
      }
      .brujula-label {
        position: absolute;
        top: 12px;
        transform: translateX(-50%);
        font-size: 12px;
        color: #00ffffcc;
      }
      .horizonte {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 25%;
        height: 2px;
        background: #00ffff;
        transform: translateX(-50%);
      }
      .horizonte::before,
      .horizonte::after {
        content: '';
        position: absolute;
        width: 20%;
        height: 100%;
        background: linear-gradient(to right, transparent, rgba(0,255,255,0.4));
        top: 0;
      }
      .horizonte::after {
        right: 0;
        left: auto;
        background: linear-gradient(to left, transparent, rgba(0,255,255,0.4));
      }
      .altitud-escala {
        position: absolute;
        top: 12.5%;
        left: 30px;
        height: 75%;
        width: 40px;
      }
      .altitud-marca {
        position: absolute;
        left: 0;
        width: 20px;
        height: 1px;
        background: #00ffff88;
      }
      .altitud-texto {
        position: absolute;
        left: 25px;
        transform: translateY(-50%);
        font-size: 11px;
        color: #00ffffcc;
      }
      .velocidad-info {
        position: absolute;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 14px;
        background: rgba(0,0,0,0.2);
        padding: 5px 10px;
        border-radius: 10px;
      }
    `;
    document.head.appendChild(style);
  },

  updateHUD: function() {
    if (!this.flightMode) {
      this.hud.style.display = 'none';
      return;
    }
    this.hud.style.display = 'block';
    const camera = this.el.querySelector('[camera]');
    const pitchDegrees = THREE.MathUtils.radToDeg(camera.object3D.rotation.x);
    const adjustedPitch = pitchDegrees - NEUTRAL_ANGLE;
    const heading = Math.round((camera.object3D.rotation.y * -1) * 180 / Math.PI) % 360;
    const headingDisplay = heading < 0 ? heading + 360 : heading;
    const speedKmh = Math.round(Math.abs(this.currentVelocity.z) * 100);
    const mach = (speedKmh / 1235).toFixed(2);

    // Brújula fija con ticks y valores
    let compassTicks = '';
    const centerX = window.innerWidth * 0.5;
    const width = window.innerWidth * 0.75;
    const startX = centerX - width / 2;
    for (let i = -90; i <= 90; i += 3) {
      const x = ((i + 90) / 180) * width;
      const deg = (headingDisplay + i + 360) % 360;
      compassTicks += `<div class="brujula-tick" style="left:${x}px;"></div>`;
      if (i % 15 === 0) {
        compassTicks += `<div class="brujula-label" style="left:${x}px;">${deg}°</div>`;
      }
    }

    // Altitud vertical con marcas
    let altTicks = '';
    for (let y = 0; y <= 100; y += 10) {
      const top = y + '%';
      const alt = Math.round(this.el.object3D.position.y + (50 - y));
      altTicks += `<div class="altitud-marca" style="top:${top};"></div>`;
      altTicks += `<div class="altitud-texto" style="top:${top};">${alt}</div>`;
    }

    this.hud.innerHTML = `
      <div class="brujula-fija">${compassTicks}</div>
      <div class="horizonte"></div>
      <div class="altitud-escala">${altTicks}</div>
      <div class="velocidad-info">MACH ${mach} | ${speedKmh} km/h | PITCH ${Math.round(adjustedPitch)}°</div>
    `;
  },

  toggleFlightMode: function() {
    this.flightMode = !this.flightMode;
    this.currentVelocity.set(0, 0, 0);
    this.updateHUD();
  },

  tick: function() {
    if (!this.flightMode) return;
    const camera = this.el.querySelector('[camera]');
    const rotation = camera.object3D.rotation.clone();
    const pitchDegrees = THREE.MathUtils.radToDeg(rotation.x);
    const adjustedPitch = pitchDegrees - NEUTRAL_ANGLE;
    this.currentVelocity.set(0, 0, 0);
    if (Math.abs(adjustedPitch) < EXTREME_TILT_THRESHOLD) {
      if (adjustedPitch < -TILT_THRESHOLD) {
        const normalizedPitch = Math.abs(adjustedPitch) / EXTREME_TILT_THRESHOLD;
        this.currentVelocity.z = -MOVEMENT_SPEED * normalizedPitch;
      } else if (adjustedPitch > TILT_THRESHOLD) {
        const normalizedPitch = Math.abs(adjustedPitch) / EXTREME_TILT_THRESHOLD;
        this.currentVelocity.z = MOVEMENT_SPEED * normalizedPitch;
      }
    }
    if (adjustedPitch <= -EXTREME_TILT_THRESHOLD) {
      this.currentVelocity.y = -VERTICAL_SPEED;
    } else if (adjustedPitch >= EXTREME_TILT_THRESHOLD) {
      this.currentVelocity.y = VERTICAL_SPEED;
    }
    const cameraDirection = new THREE.Vector3();
    camera.object3D.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();
    const movement = new THREE.Vector3();
    movement.z = this.currentVelocity.z;
    movement.y = this.currentVelocity.y;
    if (movement.z !== 0) {
      this.el.object3D.position.add(cameraDirection.multiplyScalar(movement.z));
    }
    this.el.object3D.position.y += movement.y;
    this.updateHUD();
  }
});
