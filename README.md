# Motorcycle Rear Suspension Simulator

Interactive webapp that simulates a single-pivot monoshock linkless motorcycle rear suspension. Built with Three.js.

**Live demo: https://suspension-sim.onrender.com**

![Default view](tests/screenshots/default-load.png)

## Features

- **Free mode** — drag the wheel to explore the full range of motion and see how forces, motion ratio, and wheel rate change in real time
- **Force mode** — let physics find the equilibrium position based on spring rate, preload, and rider load
- **Adjustable parameters** — swingarm length, shock mount locations, spring rate, stroke, preload, and load via a GUI panel
- **Real-time outputs** — instantaneous motion ratio, spring force, wheel rate, sag, and shock compression

## How It Works

The simulation models a rigid swingarm rotating about a fixed pivot, connected to the frame by a coilover shock absorber. The physics engine computes:

- **Motion ratio** (wheel travel / shock travel) — varies through the stroke, lowest when the shock is perpendicular to the swingarm
- **Spring force** — Hooke's law applied to shock compression plus preload
- **Wheel rate** — spring rate / MR², the effective rate felt at the axle
- **Sag** — found by stepping through swingarm angles and comparing spring torque vs load torque about the pivot until equilibrium

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Testing

```bash
# Physics unit tests (vitest)
npm test

# UI screenshot tests (playwright)
npm run test:ui
```

## Tech Stack

- [Three.js](https://threejs.org/) — 3D visualization
- [lil-gui](https://lil-gui.georgealways.com/) — parameter controls
- [Vite](https://vitejs.dev/) — dev server and build
- [Vitest](https://vitest.dev/) — unit tests
- [Playwright](https://playwright.dev/) — screenshot tests
