import { DEFAULTS } from './constants.js';
import { fullyExtendedAngle, computeSag } from './physics.js';
import { createVisualization } from './visualization.js';
import { createControls } from './controls.js';

// Application state
const state = {
  params: { ...DEFAULTS },
  angle: 0,       // current swingarm angle (radians)
  targetAngle: 0, // target for force mode animation
  mode: 'free',   // 'free' | 'force'
};

const container = document.getElementById('canvas-container');
const vis = createVisualization(container);

// Initialize angle at fully extended position
state.angle = fullyExtendedAngle(state.params);
state.targetAngle = state.angle;

function onParamsChange() {
  if (state.mode === 'force') {
    const sag = computeSag(state.params);
    state.targetAngle = sag.angle;
  }
}

const gui = createControls(state, onParamsChange, vis.canvas, vis.camera);

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // In force mode, smoothly animate toward equilibrium
  if (state.mode === 'force') {
    const diff = state.targetAngle - state.angle;
    if (Math.abs(diff) > 0.0001) {
      state.angle += diff * 0.08;
    } else {
      state.angle = state.targetAngle;
    }
  }

  vis.update(state.angle, state.params, state.mode);
  vis.renderer.render(vis.scene, vis.camera);
}

animate();
