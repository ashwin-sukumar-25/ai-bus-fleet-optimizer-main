/**
 * Dispatch Manifest & Route Results Module
 * Renders optimal routes for each bus, passenger counts, distance, fuel, and itineraries.
 */
const OptimizerView = {
    render() {
        const results = AppState.results;
        const container = document.getElementById("dispatchContainer");
        const summaryContainer = document.getElementById("dispatchKpiGrid");
        const unassignedContainer = document.getElementById("unassignedAlertBox");

        if (!container) return;

        if (!results) {
            container.innerHTML = `
                <div class="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                    <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                        <i data-lucide="route" class="w-6 h-6"></i>
                    </div>
                    <h3 class="text-base font-semibold text-slate-200">No Optimized Routes Computed Yet</h3>
                    <p class="text-sm text-slate-400 mt-1 max-w-md mx-auto">Configure your fleet and pickup stops, then click "Run Optimizer" to calculate minimum fuel and distance routes.</p>
                </div>
            `;
            if (summaryContainer) summaryContainer.innerHTML = "";
            if (unassignedContainer) unassignedContainer.innerHTML = "";
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        const s = results.summary;

        // Render Summary KPIs
        if (summaryContainer) {
            summaryContainer.innerHTML = `
                <div class="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                    <div class="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                        <span>STUDENTS TRANSPORTED</span>
                        <i data-lucide="users" class="w-4 h-4 text-indigo-400"></i>
                    </div>
                    <div class="text-2xl font-extrabold text-white tracking-tight">${s.served_students} <span class="text-sm font-normal text-slate-400">/ ${s.total_students}</span></div>
                    <div class="text-xs text-slate-400 mt-1">
                        Fleet Occupancy: <strong class="text-emerald-400">${s.overall_occupancy}%</strong>
                    </div>
                    <div class="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div class="bg-indigo-500 h-full rounded-full transition-all duration-500" style="width: ${Math.min(100, s.overall_occupancy)}%"></div>
                    </div>
                </div>

                <div class="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                    <div class="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                        <span>BUSES DISPATCHED</span>
                        <i data-lucide="bus" class="w-4 h-4 text-indigo-400"></i>
                    </div>
                    <div class="text-2xl font-extrabold text-white tracking-tight">${s.used_buses} <span class="text-sm font-normal text-slate-400">/ ${s.total_buses}</span></div>
                    <div class="text-xs text-slate-400 mt-1">
                        ${s.idle_buses} idle reserve vehicle${s.idle_buses === 1 ? '' : 's'}
                    </div>
                    <div class="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div class="bg-emerald-500 h-full rounded-full transition-all duration-500" style="width: ${s.total_buses ? (s.used_buses / s.total_buses * 100) : 0}%"></div>
                    </div>
                </div>

                <div class="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                    <div class="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                        <span>TOTAL TRAVEL DISTANCE</span>
                        <i data-lucide="route" class="w-4 h-4 text-indigo-400"></i>
                    </div>
                    <div class="text-2xl font-extrabold text-white tracking-tight">${s.total_distance} <span class="text-sm font-normal text-slate-400">km</span></div>
                    <div class="text-xs text-slate-400 mt-1">
                        Across ${s.served_stops} pickup waypoints
                    </div>
                </div>

                <div class="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                    <div class="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                        <span>FUEL CONSUMED</span>
                        <i data-lucide="fuel" class="w-4 h-4 text-emerald-400"></i>
                    </div>
                    <div class="text-2xl font-extrabold text-emerald-400 tracking-tight">${s.total_fuel_liters} <span class="text-sm font-normal text-slate-400">L</span></div>
                    <div class="text-xs text-slate-400 mt-1">
                        Est. Cost: <strong class="text-slate-200">₹${s.total_fuel_cost}</strong>
                    </div>
                </div>
            `;
        }

        // Render Unassigned Stops Alert
        if (unassignedContainer) {
            if (results.unassigned_stops && results.unassigned_stops.length > 0) {
                unassignedContainer.innerHTML = `
                    <div class="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6 flex items-start gap-3">
                        <div class="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                            <i data-lucide="alert-triangle" class="w-5 h-5"></i>
                        </div>
                        <div class="flex-1">
                            <h4 class="text-sm font-bold text-amber-300">${results.unassigned_stops.length} Stop(s) Could Not Be Accommodated</h4>
                            <p class="text-xs text-amber-200/80 mt-1">Total student demand exceeds currently available seating capacities.</p>
                            <div class="flex flex-wrap gap-2 mt-2">
                                ${results.unassigned_stops.map(u => `
                                    <span class="px-2.5 py-1 rounded-md bg-amber-950/60 border border-amber-500/30 text-amber-200 text-xs">
                                        ${u.name} (<strong>${u.students}</strong> students)
                                    </span>
                                `).join("")}
                            </div>
                        </div>
                    </div>
                `;
            } else {
                unassignedContainer.innerHTML = `
                    <div class="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 mb-6 flex items-center justify-between">
                        <div class="flex items-center gap-2.5 text-xs text-emerald-300 font-medium">
                            <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400"></i>
                            All pickup stops and student commuters have been allocated a bus seat.
                        </div>
                        <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs">100% Demand Met</span>
                    </div>
                `;
            }
        }

        // Render Route Cards
        container.innerHTML = "";
        results.routes.forEach((route) => {
            const card = document.createElement("div");
            card.className = "route-card bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl mb-6 transition-all";

            const itinRows = (route.itinerary || []).map(wp => `
                <tr class="border-b border-slate-800/40 text-xs hover:bg-slate-800/20">
                    <td class="py-2.5 px-3 font-mono text-slate-400">${wp.seq}</td>
                    <td class="py-2.5 px-3 font-semibold text-slate-200 flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full" style="background-color: ${wp.type === 'depot' ? '#6366f1' : route.color}"></span>
                        ${wp.name}
                        ${wp.type === 'depot' ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">Depot Hub</span>' : ''}
                    </td>
                    <td class="py-2.5 px-3 text-slate-400 font-mono">${wp.eta}</td>
                    <td class="py-2.5 px-3 text-slate-300">${wp.students_boarding ? `+${wp.students_boarding}` : '-'}</td>
                    <td class="py-2.5 px-3 text-slate-200 font-medium">${wp.passengers_onboard} / ${route.capacity}</td>
                    <td class="py-2.5 px-3 text-slate-400 font-mono">${wp.leg_km} km</td>
                </tr>
            `).join("");

            card.innerHTML = `
                <div class="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-slate-800/80 gap-4 mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md" style="background-color: ${route.color}">
                            <i data-lucide="bus" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="text-base font-bold text-white">${route.bus_name}</h3>
                                <span class="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300">${route.bus_id}</span>
                            </div>
                            <div class="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                                <span>Driver: <strong class="text-slate-200">${route.driver_name || 'Assigned'}</strong></span>
                                <span>•</span>
                                <span>Fuel: <strong class="text-slate-200">${route.fuel_type || 'Diesel'}</strong></span>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-4">
                        <div class="text-right">
                            <div class="text-xs text-slate-400">Students In This Bus</div>
                            <div class="text-base font-bold text-white">${route.students} Students <span class="text-xs text-slate-400">(${route.occupancy}% of ${route.capacity} seats)</span></div>
                        </div>
                        <div class="w-28 bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div class="h-full rounded-full transition-all" style="width: ${route.occupancy}%; background-color: ${route.color}"></div>
                        </div>
                        <button type="button" onclick="OptimizerView.focusOnMap('${route.bus_id}')" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors">
                            <i data-lucide="map" class="w-3.5 h-3.5"></i>
                            <span>View Route</span>
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
                        <div class="text-xs text-slate-400">Total Route Distance</div>
                        <div class="text-sm font-bold text-slate-200 mt-0.5">${route.distance} km</div>
                    </div>
                    <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
                        <div class="text-xs text-slate-400">Est. Travel Time</div>
                        <div class="text-sm font-bold text-slate-200 mt-0.5">${route.estimated_time} mins</div>
                    </div>
                    <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
                        <div class="text-xs text-slate-400">Fuel Consumed</div>
                        <div class="text-sm font-bold text-slate-200 mt-0.5">${route.fuel_consumed_liters} L (₹${route.fuel_cost})</div>
                    </div>
                    <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
                        <div class="text-xs text-slate-400">Pickup Stops Served</div>
                        <div class="text-sm font-bold text-slate-200 mt-0.5">${route.stops.length} Locations</div>
                    </div>
                </div>

                <!-- Sequential Route Path -->
                <div class="mb-4">
                    <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Route Corridor Sequence
                    </div>
                    <div class="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                        ${route.route.map((stopName, idx) => `
                            <span class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-slate-200 whitespace-nowrap">
                                <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${idx === 0 || idx === route.route.length - 1 ? '#6366f1' : route.color}"></span>
                                <span>${stopName}</span>
                            </span>
                            ${idx < route.route.length - 1 ? '<i data-lucide="chevron-right" class="w-3.5 h-3.5 text-slate-600 shrink-0"></i>' : ''}
                        `).join("")}
                    </div>
                </div>

                <!-- Detailed Waypoint Table -->
                <details class="group mt-2">
                    <summary class="flex items-center gap-2 text-xs font-semibold text-indigo-400 cursor-pointer hover:text-indigo-300 py-1 transition-colors">
                        <i data-lucide="list" class="w-3.5 h-3.5"></i>
                        <span>Show Detailed Turn-by-Turn Waypoint Manifest</span>
                        <i data-lucide="chevron-down" class="w-3 h-3 group-open:rotate-180 transition-transform"></i>
                    </summary>
                    <div class="mt-3 overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
                        <table class="w-full text-left text-xs">
                            <thead class="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                                <tr>
                                    <th class="py-2 px-3">#</th>
                                    <th class="py-2 px-3">Waypoint / Stop</th>
                                    <th class="py-2 px-3">ETA</th>
                                    <th class="py-2 px-3">Boarding</th>
                                    <th class="py-2 px-3">Onboard Load</th>
                                    <th class="py-2 px-3">Leg Distance</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itinRows}
                            </tbody>
                        </table>
                    </div>
                </details>
            `;
            container.appendChild(card);
        });

        if (window.lucide) window.lucide.createIcons();
    },

    focusOnMap(busId) {
        if (window.TabManager) {
            TabManager.switchTab("map");
        }
        if (window.FleetMap) {
            FleetMap.selectBusFilter(busId);
        }
    },

    exportCsv() {
        if (!AppState.results || !AppState.results.routes) return;
        let csv = "Bus ID,Bus Name,Driver,Fuel,Capacity,Students Boarded,Occupancy %,Route Distance (km),Fuel (L),Waypoints\n";
        AppState.results.routes.forEach(r => {
            const waypoints = `"${r.route.join(" -> ")}"`;
            csv += `${r.bus_id},"${r.bus_name}","${r.driver_name}",${r.fuel_type},${r.capacity},${r.students},${r.occupancy}%,${r.distance},${r.fuel_consumed_liters},${waypoints}\n`;
        });

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `fleet_dispatch_manifest_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    },

    exportJson() {
        if (!AppState.results) return;
        const blob = new Blob([JSON.stringify(AppState.results, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `fleet_routes_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    printManifest() {
        window.print();
    }
};

window.OptimizerView = OptimizerView;
