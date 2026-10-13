/**
 * Fleet Management Module
 * Handles bus CRUD operations, capacity counters, and vehicle fuel types.
 */
const FleetManager = {
    init() {
        this.renderBusList();
        this.updateFleetStats();
        this.bindEvents();
    },

    bindEvents() {
        const addBtn = document.getElementById("btnAddBus");
        if (addBtn) {
            addBtn.addEventListener("click", () => this.addBus());
        }
    },

    renderBusList() {
        const container = document.getElementById("fleetContainer");
        if (!container) return;

        container.innerHTML = "";

        if (AppState.buses.length === 0) {
            container.innerHTML = `
                <div class="col-span-full p-8 border border-dashed border-slate-800 rounded-2xl text-center bg-slate-900/30">
                    <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                        <i data-lucide="bus" class="w-6 h-6"></i>
                    </div>
                    <h4 class="text-base font-semibold text-slate-200">No Fleet Buses Configured</h4>
                    <p class="text-sm text-slate-400 mt-1 max-w-sm mx-auto">Add your first campus shuttle or import a scenario preset above.</p>
                    <button onclick="FleetManager.addBus()" class="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-all">
                        + Add First Bus
                    </button>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        AppState.buses.forEach((bus, index) => {
            const card = document.createElement("div");
            card.className = "bus-card group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-lg shadow-black/20 transition-all duration-200";
            card.dataset.index = index;

            const fuelBadgeClass = 
                bus.fuel_type === "Electric" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                bus.fuel_type === "CNG" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                "bg-blue-500/10 text-blue-400 border-blue-500/30";

            card.innerHTML = `
                <div class="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
                    <div class="flex items-center gap-2.5">
                        <span class="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-mono text-xs font-semibold uppercase">
                            ${bus.id || 'B' + (index + 1)}
                        </span>
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${fuelBadgeClass}">
                            <i data-lucide="${bus.fuel_type === 'Electric' ? 'zap' : 'fuel'}" class="w-3 h-3"></i>
                            ${bus.fuel_type || 'Diesel'}
                        </span>
                    </div>
                    <div class="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button type="button" onclick="FleetManager.duplicateBus(${index})" title="Duplicate Vehicle" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                            <i data-lucide="copy" class="w-4 h-4"></i>
                        </button>
                        <button type="button" onclick="FleetManager.removeBus(${index})" title="Remove Bus" class="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>

                <div class="space-y-3.5">
                    <div>
                        <label class="block text-xs font-medium text-slate-400 mb-1">Vehicle Name / Label</label>
                        <input type="text" class="bus-name-input w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-slate-100 placeholder-slate-500 transition-all"
                            value="${bus.name || ''}" placeholder="e.g. Titan Express" onchange="FleetManager.updateBus(${index}, 'name', this.value)">
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-medium text-slate-400 mb-1">Seating Capacity</label>
                            <div class="relative">
                                <input type="number" min="5" max="120" class="bus-capacity-input w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-slate-100 font-semibold transition-all"
                                    value="${bus.capacity || 50}" onchange="FleetManager.updateBus(${index}, 'capacity', this.value)">
                                <span class="absolute right-3 top-2.5 text-xs text-slate-500">seats</span>
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-slate-400 mb-1">Fuel / Propulsion</label>
                            <select class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-sm text-slate-100 transition-all"
                                onchange="FleetManager.updateBus(${index}, 'fuel_type', this.value)">
                                <option value="Diesel" ${bus.fuel_type === 'Diesel' ? 'selected' : ''}>Diesel</option>
                                <option value="CNG" ${bus.fuel_type === 'CNG' ? 'selected' : ''}>CNG</option>
                                <option value="Electric" ${bus.fuel_type === 'Electric' ? 'selected' : ''}>Electric (EV)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-medium text-slate-400 mb-1">Assigned Driver</label>
                        <div class="relative">
                            <span class="absolute left-3 top-2.5 text-slate-500">
                                <i data-lucide="user" class="w-4 h-4"></i>
                            </span>
                            <input type="text" class="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-slate-100 placeholder-slate-500 transition-all"
                                value="${bus.driver || ''}" placeholder="Driver Name" onchange="FleetManager.updateBus(${index}, 'driver', this.value)">
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        if (window.lucide) window.lucide.createIcons();
        this.updateFleetStats();
    },

    addBus(customBus = null) {
        const nextIdx = AppState.buses.length + 1;
        const newBus = customBus || {
            id: `B${nextIdx}`,
            name: `Campus Bus ${nextIdx}`,
            capacity: 50,
            fuel_type: "Diesel",
            driver: `Driver ${nextIdx}`
        };

        AppState.buses.push(newBus);
        AppState.saveToStorage();
        this.renderBusList();

        if (window.showToast) {
            showToast(`Added vehicle: ${newBus.name} (${newBus.capacity} seats)`, "success");
        }
    },

    duplicateBus(index) {
        const src = AppState.buses[index];
        if (!src) return;
        const nextIdx = AppState.buses.length + 1;
        const clone = {
            id: `B${nextIdx}`,
            name: `${src.name} (Copy)`,
            capacity: src.capacity,
            fuel_type: src.fuel_type,
            driver: `Driver ${nextIdx}`
        };
        AppState.buses.push(clone);
        AppState.saveToStorage();
        this.renderBusList();
        if (window.showToast) showToast(`Duplicated ${src.name}`, "info");
    },

    removeBus(index) {
        const removed = AppState.buses.splice(index, 1);
        AppState.saveToStorage();
        this.renderBusList();
        if (window.showToast && removed.length) {
            showToast(`Removed vehicle ${removed[0].name}`, "info");
        }
    },

    updateBus(index, field, value) {
        if (!AppState.buses[index]) return;
        if (field === "capacity") {
            AppState.buses[index][field] = Math.max(5, parseInt(value) || 50);
        } else {
            AppState.buses[index][field] = value.trim();
        }
        AppState.saveToStorage();
        this.updateFleetStats();
    },

    updateFleetStats() {
        const totalBuses = AppState.buses.length;
        const totalCapacity = AppState.getTotalCapacity();
        const evCount = AppState.buses.filter(b => b.fuel_type === "Electric").length;

        const statTotalBuses = document.getElementById("statFleetCount");
        const statTotalCapacity = document.getElementById("statTotalSeats");
        const statEvCount = document.getElementById("statEvBuses");

        if (statTotalBuses) statTotalBuses.textContent = totalBuses;
        if (statTotalCapacity) statTotalCapacity.textContent = totalCapacity;
        if (statEvCount) statEvCount.textContent = `${evCount} / ${totalBuses}`;

        // Top pill header sync
        const pillBuses = document.getElementById("headerPillBuses");
        const pillSeats = document.getElementById("headerPillSeats");
        if (pillBuses) pillBuses.textContent = `${totalBuses} Buses`;
        if (pillSeats) pillSeats.textContent = `${totalCapacity} Seats`;

        const preBuses = document.getElementById("preflightBuses");
        const preSeats = document.getElementById("preflightCapacity");
        if (preBuses) preBuses.textContent = totalBuses;
        if (preSeats) preSeats.textContent = totalCapacity;
    },

    getBusesFromUI() {
        return AppState.buses;
    }
};

window.FleetManager = FleetManager;
