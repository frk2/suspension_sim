import * as THREE from 'three';
import {
  axlePosition,
  lowerMountPosition,
  shockLength,
  shockCompression,
  motionRatio,
  springForce,
  wheelRate,
  computeSag,
  fullyExtendedAngle,
} from './physics.js';

const WHEEL_RADIUS = 250; // mm

export function createVisualization(container) {
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x1a1a2e);
  container.appendChild(renderer.domElement);

  // Orthographic camera — sized to fit ~800mm wide
  const aspect = width / height;
  const viewHeight = 900;
  const viewWidth = viewHeight * aspect;
  const camera = new THREE.OrthographicCamera(
    -viewWidth * 0.3, viewWidth * 0.7,
    viewHeight * 0.6, -viewHeight * 0.4,
    -1, 1
  );

  const scene = new THREE.Scene();

  // --- Scene objects ---

  // Swingarm pivot marker
  const pivotGeo = new THREE.CircleGeometry(8, 32);
  const pivotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pivotMesh = new THREE.Mesh(pivotGeo, pivotMat);
  scene.add(pivotMesh);

  // Upper shock mount marker
  const upperMountGeo = new THREE.CircleGeometry(6, 32);
  const upperMountMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const upperMountMesh = new THREE.Mesh(upperMountGeo, upperMountMat);
  scene.add(upperMountMesh);

  // Frame hint: line from pivot to upper mount
  const frameMat = new THREE.LineBasicMaterial({ color: 0x888888, linewidth: 2 });
  const frameGeo = new THREE.BufferGeometry();
  frameGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
  const frameLine = new THREE.Line(frameGeo, frameMat);
  scene.add(frameLine);

  // Swingarm: thick line from pivot to axle
  const swingarmMat = new THREE.LineBasicMaterial({ color: 0x4682b4, linewidth: 2 });
  const swingarmGeo = new THREE.BufferGeometry();
  swingarmGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
  const swingarmLine = new THREE.Line(swingarmGeo, swingarmMat);
  scene.add(swingarmLine);

  // Lower shock mount marker
  const lowerMountGeo = new THREE.CircleGeometry(6, 32);
  const lowerMountMat = new THREE.MeshBasicMaterial({ color: 0xffa500 });
  const lowerMountMesh = new THREE.Mesh(lowerMountGeo, lowerMountMat);
  scene.add(lowerMountMesh);

  // Shock absorber line
  const shockMat = new THREE.LineBasicMaterial({ color: 0xe05030, linewidth: 2 });
  const shockGeo = new THREE.BufferGeometry();
  shockGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(30 * 3), 3));
  const shockLine = new THREE.Line(shockGeo, shockMat);
  scene.add(shockLine);

  // Axle marker
  const axleGeo = new THREE.CircleGeometry(6, 32);
  const axleMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const axleMesh = new THREE.Mesh(axleGeo, axleMat);
  scene.add(axleMesh);

  // Wheel circle (wireframe)
  const wheelGeo = new THREE.CircleGeometry(WHEEL_RADIUS, 48);
  const wheelMat = new THREE.MeshBasicMaterial({
    color: 0x444444,
    wireframe: true,
    transparent: true,
    opacity: 0.4,
  });
  const wheelMesh = new THREE.Mesh(wheelGeo, wheelMat);
  scene.add(wheelMesh);

  // Ground reference line
  const groundMat = new THREE.LineDashedMaterial({
    color: 0x22aa44,
    dashSize: 20,
    gapSize: 10,
    transparent: true,
    opacity: 0.4,
  });
  const groundGeo = new THREE.BufferGeometry();
  groundGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    -300, 0, 0, 800, 0, 0,
  ], 3));
  const groundLine = new THREE.Line(groundGeo, groundMat);
  groundLine.computeLineDistances();
  scene.add(groundLine);

  // --- Update function ---
  function update(theta, params, mode) {
    const axle = axlePosition(theta, params.swingarmLength);
    const lower = lowerMountPosition(theta, params.lowerMountDist);
    const upper = { x: params.upperMountX, y: params.upperMountY };

    // Upper mount
    upperMountMesh.position.set(upper.x, upper.y, 0);

    // Frame line: pivot → upper mount
    const framePositions = frameLine.geometry.attributes.position.array;
    framePositions[0] = 0; framePositions[1] = 0; framePositions[2] = 0;
    framePositions[3] = upper.x; framePositions[4] = upper.y; framePositions[5] = 0;
    frameLine.geometry.attributes.position.needsUpdate = true;

    // Swingarm: pivot → axle
    const saPositions = swingarmLine.geometry.attributes.position.array;
    saPositions[0] = 0; saPositions[1] = 0; saPositions[2] = 0;
    saPositions[3] = axle.x; saPositions[4] = axle.y; saPositions[5] = 0;
    swingarmLine.geometry.attributes.position.needsUpdate = true;

    // Lower mount
    lowerMountMesh.position.set(lower.x, lower.y, 0);

    // Shock: draw as zigzag spring between upper and lower mount
    const shockPoints = buildSpringPoints(upper, lower, 8, 12);
    const posArray = shockLine.geometry.attributes.position.array;
    for (let i = 0; i < shockPoints.length && i < 30; i++) {
      posArray[i * 3] = shockPoints[i].x;
      posArray[i * 3 + 1] = shockPoints[i].y;
      posArray[i * 3 + 2] = 0;
    }
    shockLine.geometry.setDrawRange(0, shockPoints.length);
    shockLine.geometry.attributes.position.needsUpdate = true;

    // Axle
    axleMesh.position.set(axle.x, axle.y, 0);

    // Wheel
    wheelMesh.position.set(axle.x, axle.y, 0);

    // Ground line at the bottom of the wheel when fully extended
    const extAngle = fullyExtendedAngle(params);
    const extAxle = axlePosition(extAngle, params.swingarmLength);
    const groundY = extAxle.y - WHEEL_RADIUS;
    const gndPos = groundLine.geometry.attributes.position.array;
    gndPos[1] = groundY; gndPos[4] = groundY;
    groundLine.geometry.attributes.position.needsUpdate = true;

    // HUD
    const mr = motionRatio(theta, params);
    const sf = springForce(theta, params);
    const wr = wheelRate(theta, params);
    const comp = shockCompression(theta, params);
    const sag = computeSag(params);

    document.getElementById('hud-mr').textContent = mr.toFixed(3);
    document.getElementById('hud-force').textContent = sf.toFixed(1) + ' lbs';
    document.getElementById('hud-wheelrate').textContent = wr.toFixed(1) + ' lbs/in';
    document.getElementById('hud-sag').textContent = sag.sagMM.toFixed(1) + ' mm';
    document.getElementById('hud-comp').textContent = comp.toFixed(1) + ' mm';

    const modeEl = document.getElementById('hud-mode');
    modeEl.textContent = mode === 'force' ? 'Force' : 'Free';
    modeEl.className = mode === 'force' ? 'value mode-force' : 'value mode-free';
  }

  // Handle resize
  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    const asp = w / h;
    const vh = 900;
    const vw = vh * asp;
    camera.left = -vw * 0.3;
    camera.right = vw * 0.7;
    camera.top = vh * 0.6;
    camera.bottom = -vh * 0.4;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  return { renderer, scene, camera, update, canvas: renderer.domElement };
}

/**
 * Build zigzag spring points between two endpoints.
 */
function buildSpringPoints(from, to, coils, amplitude) {
  const points = [];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  // Unit vectors along and perpendicular to shock axis
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;

  const totalSegments = coils * 2 + 2;
  // Straight end caps
  const capFraction = 0.1;

  points.push({ x: from.x, y: from.y });
  points.push({
    x: from.x + ux * len * capFraction,
    y: from.y + uy * len * capFraction,
  });

  for (let i = 0; i < coils * 2; i++) {
    const t = capFraction + (1 - 2 * capFraction) * ((i + 1) / (coils * 2 + 1));
    const side = i % 2 === 0 ? 1 : -1;
    points.push({
      x: from.x + ux * len * t + px * amplitude * side,
      y: from.y + uy * len * t + py * amplitude * side,
    });
  }

  points.push({
    x: from.x + ux * len * (1 - capFraction),
    y: from.y + uy * len * (1 - capFraction),
  });
  points.push({ x: to.x, y: to.y });

  return points;
}
