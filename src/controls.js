import GUI from 'lil-gui';
import {
  fullyExtendedAngle,
  fullyCompressedAngle,
  computeSag,
  axlePosition,
} from './physics.js';
import { DEFAULTS } from './constants.js';

export function createControls(state, onParamsChange, canvas, camera) {
  // --- lil-gui panel ---
  const gui = new GUI({ title: 'Suspension Parameters' });

  const geoFolder = gui.addFolder('Geometry');
  geoFolder.add(state.params, 'swingarmLength', 400, 700, 1).name('Swingarm Length (mm)').onChange(onParamsChange);
  geoFolder.add(state.params, 'lowerMountDist', 100, 400, 1).name('Lower Mount Dist (mm)').onChange(onParamsChange);
  geoFolder.add(state.params, 'upperMountX', 50, 300, 1).name('Upper Mount X (mm)').onChange(onParamsChange);
  geoFolder.add(state.params, 'upperMountY', 100, 400, 1).name('Upper Mount Y (mm)').onChange(onParamsChange);

  const shockFolder = gui.addFolder('Shock');
  shockFolder.add(state.params, 'shockFreeLength', 200, 400, 1).name('Shock Length (mm)').onChange(onParamsChange);
  shockFolder.add(state.params, 'shockStroke', 20, 100, 1).name('Shock Stroke (mm)').onChange(onParamsChange);
  shockFolder.add(state.params, 'springRate', 200, 1500, 10).name('Spring Rate (lbs/in)').onChange(onParamsChange);
  shockFolder.add(state.params, 'preload', 0, 30, 0.5).name('Preload (mm)').onChange(onParamsChange);

  const loadFolder = gui.addFolder('Loading');
  loadFolder.add(state.params, 'load', 50, 500, 5).name('Rear Load (lbs)').onChange(onParamsChange);

  const modeObj = { mode: 'Free Mode' };
  gui.add(modeObj, 'mode', ['Free Mode', 'Force Mode']).name('Mode').onChange((val) => {
    state.mode = val === 'Force Mode' ? 'force' : 'free';
    if (state.mode === 'force') {
      const sag = computeSag(state.params);
      state.targetAngle = sag.angle;
    }
    onParamsChange();
  });

  // --- Drag interaction ---
  let isDragging = false;

  function screenToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
    return {
      x: (ndcX * (camera.right - camera.left)) / 2 + (camera.right + camera.left) / 2,
      y: (ndcY * (camera.top - camera.bottom)) / 2 + (camera.top + camera.bottom) / 2,
    };
  }

  function onPointerDown(e) {
    if (state.mode === 'force') return;
    const world = screenToWorld(e.clientX, e.clientY);
    const axle = axlePosition(state.angle, state.params.swingarmLength);
    const dx = world.x - axle.x;
    const dy = world.y - axle.y;
    if (Math.sqrt(dx * dx + dy * dy) < 60) {
      isDragging = true;
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
    }
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const world = screenToWorld(e.clientX, e.clientY);
    // Compute angle from pivot to cursor
    let newAngle = Math.atan2(world.y, world.x);

    // Clamp to valid range
    const extAngle = fullyExtendedAngle(state.params);
    const compAngle = fullyCompressedAngle(state.params);
    const minAngle = Math.min(extAngle, compAngle);
    const maxAngle = Math.max(extAngle, compAngle);
    newAngle = Math.max(minAngle, Math.min(maxAngle, newAngle));

    state.angle = newAngle;
    onParamsChange();
    e.preventDefault();
  }

  function onPointerUp() {
    isDragging = false;
    canvas.style.cursor = 'default';
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerUp);

  return gui;
}
