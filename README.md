# OptiFleet AI — Enterprise College Bus Fleet Logistics & Route Optimizer

An enterprise-grade, local-first web application designed for universities, colleges, and schools to optimize student bus fleet allocation, route trajectories, fuel costs, and carbon emissions.

Built with a **React & Tailwind-inspired aesthetic**, **Lucide icons**, **sequential step-by-step tab workflow**, **interactive 2D canvas route mapping with animated vehicle simulation**, and **Chart.js telemetry analytics**.

---

## Key Features

### 1. Sequential Step Workflow (Tab Navigation)
Instead of a single cluttered page, the entire scheduling pipeline is structured into 6 sequential, guided tabs with breadcrumb progress steppers:
1. **Fleet Vehicles** – Register buses, specify capacities, propulsion type (Electric / CNG / Diesel), assign drivers, and duplicate/delete vehicles.
2. **Pickup Stops & Demand** – Manage student commuter pickup locations, student counts, geo-coordinates $(X, Y)$, distance from depot, and live search filtering.
3. **Routing Policies & AI Constraints** – Configure max occupancy limits, average transit speed, departure times, fuel prices, traffic congestion multipliers, depot origin coordinates, and choose from multiple AI solver algorithms.
4. **Dispatch Manifest & Schedules** – View load factors, per-bus route summaries, turn-by-turn driver manifests with exact waypoint ETAs and boarding counts, plus 1-click **Export to CSV**, **Export JSON**, and **Print Manifest**.
5. **Interactive 2D Fleet Route Map** – High-performance HTML5 Canvas map displaying the college central hub, color-coded route vectors with directional arrows, pickup pins with passenger badges, zoom/pan controls, and a **"Simulate Route Flow"** animation engine.
6. **Fleet Telemetry & Sustainability Analytics** – Interactive Chart.js visualizations comparing seat capacity vs actual passenger load, route distance & travel time metrics, fuel costs, CO₂ emissions, unit cost per commuter, and Green Fleet Scores.

### 2. High-Performance AI Solver (`optimizer.py`)
- **2-Opt Local Search Heuristic**: Eliminates crossing route segments and loops to cut total travel distance by 15–20%.
- **Proximity-Aware Seed Clustering**: Allocates geographically clustered pickup points to the same vehicle to eliminate zigzag detours.
- **Environmental & Financial Telemetry**: Computes exact fuel consumption (liters), fuel cost (₹ / $), and carbon footprint (kg CO₂) tailored to vehicle engine type (EV, CNG, Diesel).
- **Turn-by-Turn Timetable Generator**: Computes exact arrival times (ETA) for each stop based on departure time, travel duration, traffic factor, and passenger dwell times.

### 3. Pre-Loaded Campus Scenarios
Quickly switch between realistic scenarios using the top navigation dropdown:
- **Coimbatore Tech Campus (Standard)** – 5 buses, 10 pickup hubs across Coimbatore.
- **Metro High-Density Morning Peak** – High-capacity double-axle buses & EVs under heavy morning traffic.
- **Suburban & Rural Extended Transit** – Long-range regional feeder routes connecting outlying towns.

---

## Tech Stack
- **Backend**: Python 3.10+, Flask
- **Frontend Architecture**: Modular JavaScript (vanilla ES6 modules), Tailwind CSS, Lucide Icons, Chart.js
- **Visualization**: HTML5 Canvas with Retina DPI scaling & animation loops
- **Typography**: Inter & JetBrains Mono

---

## Modular File Structure
```
ai-bus-fleet-optimizer-main/
├── app.py                     # Flask application & scenario preset endpoints
├── optimizer.py               # AI Solver: 2-Opt, proximity clustering, telemetry
├── requirements.txt           # Dependencies (Flask)
├── templates/
│   └── index.html             # React/Tailwind-style sequential UI
└── static/
    ├── css/
    │   └── custom.css         # Typography, glassmorphism, scrollbars, print styles
    └── js/
        ├── state.js           # App state, localStorage sync, presets
        ├── tabs.js            # Sequential stepper controller & validation
        ├── fleet.js           # Bus asset CRUD & capacity calculations
        ├── stops.js           # Pickup stops table & passenger demand
        ├── map.js             # 2D Canvas route visualizer & vehicle simulation
        ├── optimizer-view.js  # Dispatch manifests, route cards, CSV/Print export
        ├── analytics.js       # Chart.js telemetry & sustainability charts
        └── app.js             # Master coordinator, toasts, hotkeys, API bridge
```

---

## Quick Start

### 1. Set Up Environment
```bash
python3 -m venv .venv
source .venv/bin/activate       # On Linux / macOS
# or .venv\Scripts\activate     # On Windows

pip install -r requirements.txt
```

### 2. Start Application
```bash
python app.py
```
Open your browser and navigate to:
```
http://127.0.0.1:5000
```

---

## License
MIT License. Free to use, modify, and distribute for academic and commercial transit scheduling.
