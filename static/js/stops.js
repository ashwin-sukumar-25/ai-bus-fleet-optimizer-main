/**
 * Stops & Demand Management Module
 * Handles pickup locations, student passenger demand, and geo-coordinates.
 */
const StopsManager = {
    searchTerm: "",

    init() {
        this.renderStopsTable();
        this.updateStopsStats();
        this.bindEvents();
    },

    bindEvents() {
        const addBtn = document.getElementById("btnAddStop");
        if (addBtn) addBtn.addEventListener("click", () => this.addStop());

        const searchInput = document.getElementById("searchStopsInput");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.renderStopsTable();
            });
        }
    },

    renderStopsTable() {
        const tbody = document.getElementById("stopsTableBody");
        if (!tbody) return;

        tbody.innerHTML = "";

        const filteredStops = AppState.stops.filter(s => 
            s.name.toLowerCase().includes(this.searchTerm) ||
            s.id.toLowerCase().includes(this.searchTerm)
        );

        if (filteredStops.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="py-12 text-center text-slate-400">
                        <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                            <i data-lucide="map-pin-off" class="w-6 h-6"></i>
                        </div>
                        <p class="font-medium text-slate-300">No pickup stops found</p>
                        <p class="text-xs text-slate-500 mt-1">Try modifying your search or click "+ Add Pickup Stop" below.</p>
                    </td>
                </tr>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        const depot = { x: AppState.constraints.depot_x || 0, y: AppState.constraints.depot_y || 0 };

        filteredStops.forEach((stop) => {
            const index = AppState.stops.indexOf(stop);
            const distFromDepot = Math.sqrt(
                Math.pow(Number(stop.x || 0) - depot.x, 2) + 
                Math.pow(Number(stop.y || 0) - depot.y, 2)
            ).toFixed(1);

            const tr = document.createElement("tr");
            tr.className = "border-b border-slate-800/60 hover:bg-slate-900/40 transition-colors group";
            tr.innerHTML = `
                <td class="py-3 px-4">
                    <span class="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-mono text-xs font-semibold uppercase">
                        ${stop.id || 'S' + (index + 1)}
                    </span>
                </td>
                <td class="py-3 px-4">
                    <input type="text" class="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 text-sm text-slate-200 placeholder-slate-500 transition-all"
                        value="${stop.name || ''}" placeholder="Stop location name" onchange="StopsManager.updateStop(${index}, 'name', this.value)">
                </td>
                <td class="py-3 px-4">
                    <div class="flex items-center gap-1.5">
                        <button type="button" onclick="StopsManager.adjustStudents(${index}, -2)" class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold transition-colors">-</button>
                        <input type="number" min="1" max="100" class="w-20 text-center px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 text-sm text-slate-100 font-semibold transition-all"
                            value="${stop.students || 15}" onchange="StopsManager.updateStop(${index}, 'students', this.value)">
                        <button type="button" onclick="StopsManager.adjustStudents(${index}, 2)" class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold transition-colors">+</button>
                    </div>
                </td>
                <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                        <div class="flex items-center gap-1">
                            <span class="text-xs text-slate-500 font-mono">X:</span>
                            <input type="number" step="0.1" class="w-16 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-slate-200 font-mono transition-all"
                                value="${stop.x ?? 0}" onchange="StopsManager.updateStop(${index}, 'x', this.value)">
                        </div>
                        <div class="flex items-center gap-1">
                            <span class="text-xs text-slate-500 font-mono">Y:</span>
                            <input type="number" step="0.1" class="w-16 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-slate-200 font-mono transition-all"
                                value="${stop.y ?? 0}" onchange="StopsManager.updateStop(${index}, 'y', this.value)">
                        </div>
                    </div>
                </td>
                <td class="py-3 px-4 text-xs font-mono text-slate-400">
                    <span class="px-2 py-1 rounded bg-slate-900 border border-slate-800 inline-flex items-center gap-1">
                        <i data-lucide="navigation" class="w-3 h-3 text-indigo-400"></i>
                        ${distFromDepot} km
                    </span>
                </td>
                <td class="py-3 px-4 text-right">
                    <button type="button" onclick="StopsManager.removeStop(${index})" title="Delete Stop" class="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 opacity-70 group-hover:opacity-100 transition-all">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        if (window.lucide) window.lucide.createIcons();
        this.updateStopsStats();
    },

    addStop(customStop = null) {
        const nextIdx = AppState.stops.length + 1;
        // Generate pseudo-random coordinates around campus if not given
        const angle = (nextIdx * 36) * (Math.PI / 180);
        const radius = 3 + (nextIdx % 4) * 2;
        const newStop = customStop || {
            id: `S${nextIdx}`,
            name: `Pickup Point ${nextIdx}`,
            students: 20,
            x: Math.round((Math.cos(angle) * radius) * 10) / 10,
            y: Math.round((Math.sin(angle) * radius) * 10) / 10
        };

        AppState.stops.push(newStop);
        AppState.saveToStorage();
        this.renderStopsTable();

        if (window.showToast) {
            showToast(`Added pickup stop: ${newStop.name}`, "success");
        }
    },

    adjustStudents(index, delta) {
        if (!AppState.stops[index]) return;
        const current = Number(AppState.stops[index].students) || 0;
        AppState.stops[index].students = Math.max(1, current + delta);
        AppState.saveToStorage();
        this.renderStopsTable();
    },

    removeStop(index) {
        const removed = AppState.stops.splice(index, 1);
        AppState.saveToStorage();
        this.renderStopsTable();
        if (window.showToast && removed.length) {
            showToast(`Removed stop ${removed[0].name}`, "info");
        }
    },

    updateStop(index, field, value) {
        if (!AppState.stops[index]) return;
        if (field === "students") {
            AppState.stops[index][field] = Math.max(1, parseInt(value) || 1);
        } else if (field === "x" || field === "y") {
            AppState.stops[index][field] = parseFloat(value) || 0;
        } else {
            AppState.stops[index][field] = value.trim();
        }
        AppState.saveToStorage();
        this.updateStopsStats();
    },

    updateStopsStats() {
        const totalStops = AppState.stops.length;
        const totalStudents = AppState.getTotalStudents();
        const avgStudents = totalStops ? Math.round(totalStudents / totalStops) : 0;

        const statTotalStops = document.getElementById("statStopsCount");
        const statTotalDemand = document.getElementById("statTotalDemand");
        const statAvgDemand = document.getElementById("statAvgDemand");

        if (statTotalStops) statTotalStops.textContent = totalStops;
        if (statTotalDemand) statTotalDemand.textContent = totalStudents;
        if (statAvgDemand) statAvgDemand.textContent = `${avgStudents} / stop`;

        // Top pill header sync
        const pillDemand = document.getElementById("headerPillDemand");
        if (pillDemand) pillDemand.textContent = `${totalStudents} Students`;

        const preDemand = document.getElementById("preflightDemand");
        if (preDemand) preDemand.textContent = totalStudents;
    },

    getStopsFromUI() {
        return AppState.stops;
    }
};

window.StopsManager = StopsManager;
