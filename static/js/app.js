/**
 * Master Application Controller for AI College Bus Fleet Optimizer
 * Orchestrates modules, API interaction, scenario presets, toasts, and hotkeys.
 */

// Toast notification utility
function showToast(message, type = "info") {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl backdrop-blur-xl transition-all duration-300 transform translate-y-4 opacity-0";

    if (type === "success") {
        toast.className += " bg-emerald-950/90 border-emerald-500/40 text-emerald-200";
        toast.innerHTML = `<i data-lucide="check-circle" class="w-5 h-5 text-emerald-400 shrink-0"></i><span>${message}</span>`;
    } else if (type === "error") {
        toast.className += " bg-rose-950/90 border-rose-500/40 text-rose-200";
        toast.innerHTML = `<i data-lucide="alert-circle" class="w-5 h-5 text-rose-400 shrink-0"></i><span>${message}</span>`;
    } else {
        toast.className += " bg-slate-900/90 border-slate-700/60 text-slate-200";
        toast.innerHTML = `<i data-lucide="info" class="w-5 h-5 text-indigo-400 shrink-0"></i><span>${message}</span>`;
    }

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    // Trigger animate in
    requestAnimationFrame(() => {
        toast.classList.remove("translate-y-4", "opacity-0");
        toast.classList.add("translate-y-0", "opacity-100");
    });

    // Auto dismiss after 3.5s
    setTimeout(() => {
        toast.classList.remove("translate-y-0", "opacity-100");
        toast.classList.add("translate-y-2", "opacity-0");
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
window.showToast = showToast;

// Main Optimization Execution
async function runOptimization(autoSwitch = true) {
    const buses = FleetManager.getBusesFromUI();
    const stops = StopsManager.getStopsFromUI();

    if (!buses.length) {
        if (autoSwitch) {
            showToast("Please configure at least one bus in Step 1.", "error");
            TabManager.switchTab("fleet");
        }
        return;
    }

    if (!stops.length) {
        if (autoSwitch) {
            showToast("Please add at least one pickup stop in Step 2.", "error");
            TabManager.switchTab("stops");
        }
        return;
    }

    // Read constraints from inputs
    const constraints = {
        max_bus_occupancy: parseInt(document.getElementById("inputMaxOccupancy")?.value) || 55,
        average_speed: parseFloat(document.getElementById("inputAverageSpeed")?.value) || 30,
        fuel_price: parseFloat(document.getElementById("inputFuelPrice")?.value) || 96.5,
        fuel_efficiency: parseFloat(document.getElementById("inputFuelEfficiency")?.value) || 4.5,
        traffic_congestion: parseFloat(document.getElementById("inputTrafficFactor")?.value) || 1.15,
        dwell_time: parseFloat(document.getElementById("inputDwellTime")?.value) || 1.5,
        departure_time: document.getElementById("inputDepartureTime")?.value || "07:15",
        depot_name: document.getElementById("inputDepotName")?.value || "CIT Main Campus",
        depot_x: parseFloat(document.getElementById("inputDepotX")?.value) || 0,
        depot_y: parseFloat(document.getElementById("inputDepotY")?.value) || 0,
        algorithm: document.getElementById("selectAlgorithm")?.value || "2opt",
        allocation_mode: document.getElementById("selectAllocationMode")?.value || "proximity"
    };

    AppState.constraints = constraints;
    AppState.saveToStorage();

    // Show Loading state only if user explicitly triggered it
    const overlay = document.getElementById("globalLoadingOverlay");
    if (autoSwitch && overlay) overlay.classList.remove("hidden");

    try {
        const response = await fetch("/optimize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ buses, stops, constraints })
        });

        const data = await response.json();

        if (!data.success) {
            if (autoSwitch) showToast(data.error || "Optimization calculation failed.", "error");
            return;
        }

        AppState.results = data.result;
        AppState.unlockedSteps.add(4);
        AppState.unlockedSteps.add(5);
        AppState.unlockedSteps.add(6);

        // Update UI views
        OptimizerView.render();
        FleetMap.populateBusFilter();
        FleetMap.fitToData();

        const s = data.result.summary;

        if (autoSwitch) {
            // Switch automatically to Step 4: Dispatch Manifest
            TabManager.switchTab("dispatch");
            showToast(`AI Fleet Optimized: ${s.used_buses} buses dispatched (${s.served_percentage}% demand satisfied)`, "success");
        }

        // Update Top Header Pill
        const pillStatus = document.getElementById("headerPillStatus");
        if (pillStatus) {
            pillStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Solved (${s.overall_occupancy}%)`;
        }
    } catch (err) {
        console.error("Fetch error:", err);
        if (autoSwitch) showToast("Could not connect to optimization server.", "error");
    } finally {
        if (overlay) overlay.classList.add("hidden");
    }
}
window.runOptimization = runOptimization;

// Scenario Preset Loader
async function fetchServerPresets() {
    try {
        const res = await fetch("/api/presets");
        const data = await res.json();
        if (data.success) {
            AppState.serverPresets = data.presets;
        }
    } catch (e) {
        console.warn("Could not fetch server presets:", e);
    }
}

function loadScenario(presetKey) {
    if (!presetKey) return;
    const preset = AppState.serverPresets[presetKey];
    if (!preset) return;

    AppState.setPreset(preset);

    // Sync input fields in constraints form
    syncConstraintsToInputs();

    // Re-render UI modules
    FleetManager.renderBusList();
    StopsManager.renderStopsTable();
    FleetMap.fitToData();

    if (AppState.results) {
        OptimizerView.render();
    }

    showToast(`Loaded scenario: ${preset.name}`, "info");
}
window.loadScenario = loadScenario;

function syncConstraintsToInputs() {
    const c = AppState.constraints;
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el && val !== undefined) el.value = val;
    };

    setVal("inputMaxOccupancy", c.max_bus_occupancy);
    setVal("inputAverageSpeed", c.average_speed);
    setVal("inputFuelPrice", c.fuel_price);
    setVal("inputFuelEfficiency", c.fuel_efficiency);
    setVal("inputTrafficFactor", c.traffic_congestion);
    setVal("inputDwellTime", c.dwell_time);
    setVal("inputDepartureTime", c.departure_time);
    setVal("inputDepotName", c.depot_name);
    setVal("inputDepotX", c.depot_x);
    setVal("inputDepotY", c.depot_y);
    setVal("selectAlgorithm", c.algorithm);
    setVal("selectAllocationMode", c.allocation_mode);
}

// App Initialization on DOM Ready
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Load cached state if available
    AppState.loadFromStorage();

    // 2. Fetch server presets
    await fetchServerPresets();

    // 3. Initialize UI sub-modules
    FleetManager.init();
    StopsManager.init();
    FleetMap.init();
    TabManager.init();
    syncConstraintsToInputs();

    // 4. Bind Top Header Actions
    const presetSelect = document.getElementById("selectScenarioPreset");
    if (presetSelect) {
        presetSelect.addEventListener("change", (e) => loadScenario(e.target.value));
    }

    const btnOptimizeHeader = document.getElementById("btnOptimizeHeader");
    if (btnOptimizeHeader) {
        btnOptimizeHeader.addEventListener("click", () => runOptimization());
    }

    const btnResetFleet = document.getElementById("btnResetFleet");
    if (btnResetFleet) {
        btnResetFleet.addEventListener("click", () => {
            if (confirm("Reset current fleet configuration and reload standard demo?")) {
                localStorage.removeItem("optifleet_state_v2");
                location.reload();
            }
        });
    }

    // Hotkey: Ctrl + Enter to optimize
    window.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            runOptimization();
        }
    });

    // Initialize Lucide icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Auto-run baseline optimization in background so results are instantly populated
    setTimeout(() => {
        runOptimization(false);
    }, 400);
});
