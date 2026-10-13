/**
 * Optimizer View & Dispatch Manifest Module
 * Renders summary KPIs, per-bus route cards, turn-by-turn stop itineraries, and exports.
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
                        <i data-lucide="cpu" class="w-6 h-6"></i>
                    </div>
                    <h3 class="text-base font-semibold text-slate-200">No Optimization Dispatched Yet</h3>
                    <p class="text-sm text-slate-400 mt-1 max-w-md mx-auto">Configure your fleet and pickup stops, then click "Run AI Fleet Optimizer" to compute the schedules.</p>
                    <button onclick="TabManager.switchTab('constraints')" class="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-all">
                        Go to Routing Policies
                    </button>
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
                    <div class="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
                        <span>FLEET UTILIZATION</span>
                        <i data-lucide="percent" class="w-4 h-4 text-indigo-400"></i>
                    </div>
                    <div class="text-2xl font-bold text-white tracking-tight">${s.overall_occupancy}%</div>
                    <div class="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                        <span class="text-emerald-400 font-semibold">${s.served_students} / ${s.total_students}</span> students accommodated
                    </div>
                    <div class="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div class="bg-indigo-500 h-full rounded-full transition-all duration-500" style="width: ${Math.min(100, s.overall_occupancy)}%"></div>
                    </div>
                </div>

                <div class="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                    <div class="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
                        <span>BUSES DISPATCHED</span>
                        <i data-lucide="bus" class="w-4 h-4 text-indigo-400"></i>
                    </div>
                    <div class="text-2xl font-bold text-white tracking-tight">${s.used_buses} <span class="text-sm font-normal text-slate-400">/ ${s.total_buses}</span></div>
                    <div class="text-xs text-slate-400 mt-1">
                        ${s.idle_buses} idle reserve vehicle${s.idle_buses === 1 ? '' : 's'}
                    </div>
                    <div class="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div class="bg-emerald-500 h-full rounded-full transition-all duration-500" style="width: ${s.total_buses ? (s.used_buses / s.total_buses * 100) : 0}%"></div>
                    </div>
                </div>

                <div class="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                    <div class="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
                        <span>TOTAL FLEET DISTANCE</span>
                        <i data-lucide="route" class="w-4 h-4 text-indigo-400"></i>
                    </div>
                    <div class="text-2xl font-bold text-white tracking-tight">${s.total_distance} <span class="text-sm font-normal text-slate-400">km</span></div>
                    <div class="text-xs text-slate-400 mt-1">
                        Est. Fuel: <span class="text-slate-200 font-semibold">${s.total_fuel_liters} L</span> (₹${s.total_fuel_cost})
                    </div>
                </div>

                <div class="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                    <div class="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
                        <span>GREEN FLEET SCORE</span>
                        <i data-lucide="leaf" class="w-4 h-4 text-emerald-400"></i>
                    </div>
                    <div class="text-2xl font-bold text-emerald-400 tracking-tight">${s.green_fleet_score}<span class="text-sm font-normal text-slate-400"> / 100</span></div>
                    <div class="text-xs text-slate-400 mt-1">
                        CO₂ Footprint: <span class="text-slate-200 font-semibold">${s.total_co2_kg} kg</span>
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
                            <h4 class="text-sm font-bold text-amber-300">Capacity Bottleneck: ${results.unassigned_stops.length} Pickup Stop(s) Could Not Be Assigned</h4>
                            <p class="text-xs text-amber-200/80 mt-1">The current fleet capacity is insufficient to service all stops under the occupancy constraints.</p>
                            <div class="flex flex-wrap gap-2 mt-2">
                                ${results.unassigned_stops.map(u => `
                                    <span class="px-2.5 py-1 rounded-md bg-amber-950/60 border border-amber-500/30 text-amber-200 text-xs">
                                        ${u.name} (<strong>${u.students}</strong> students)
                                    </span>
                                `).join("")}
                            </div>
                        </div>
                        <button onclick="TabManager.switchTab('fleet')" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold whitespace-nowrap transition-colors">
                            + Add Bus
                        </button>
                    </div>
                `;
            } else {
                unassignedContainer.innerHTML = `
                    <div class="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 mb-6 flex items-center justify-between">
                        <div class="flex items-center gap-2.5">
                            <i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-400"></i>
                            <span class="text-xs font-medium text-emerald-300">100% Demand Satisfaction: All requested stops and student commuters have been allocated a seat.</span>
                        </div>
                        <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs">Zero Backlog</span>
                    </div>
                `;
            }
        }

        // Render Route Cards
        container.innerHTML = "";
        results.routes.forEach((route, rIndex) => {
            const card = document.createElement("div");
            card.className = "route-card bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl mb-6 transition-all";
            
            const itinRows = (route.itinerary || []).map(wp => `
                <tr class="border-b border-slate-800/40 text-xs hover:bg-slate-800/20">
                    <td class="py-2.5 px-3 font-mono text-slate-400">${wp.seq}</td>
                    <td class="py-2.5 px-3 font-semibold text-slate-200 flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full" style="background-color: ${wp.type === 'depot' ? '#6366f1' : route.color}"></span>
                        ${wp.name}
                        ${wp.type === 'depot' ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">Depot</span>' : ''}
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
                                <span>Driver: <strong class="text-slate-300">${route.driver_name || 'Assigned'}</strong></span>
                                <span>•</span>
                                <span>Propulsion: <strong class="text-slate-300">${route.fuel_type || 'Diesel'}</strong></span>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-4">
                        <div class="text-right">
                            <div class="text-xs text-slate-400">Load Factor</div>
                            <div class="text-base font-bold text-white">${route.occupancy}% <span class="text-xs text-slate-400">(${route.students}/${route.capacity})</span></div>
                        </div>
                        <div class="w-28 bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div class="h-full rounded-full transition-all" style="width: ${route.occupancy}%; background-color: ${route.color}"></div>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
                        <div class="text-xs text-slate-400">Distance</div>
                        <div class="text-sm font-bold text-slate-200 mt-0.5">${route.distance} km</div>
                    </div>
                    <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
                        <div class="text-xs text-slate-400">Est. Duration</div>
                        <div class="text-sm font-bold text-slate-200 mt-0.5">${route.estimated_time} mins</div>
                    </div>
                    <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
                        <div class="text-xs text-slate-400">Fuel Consumed</div>
                        <div class="text-sm font-bold text-slate-200 mt-0.5">${route.fuel_consumed_liters} L (₹${route.fuel_cost})</div>
                    </div>
                    <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
                        <div class="text-xs text-slate-400">Carbon Footprint</div>
                        <div class="text-sm font-bold text-slate-200 mt-0.5">${route.co2_emissions_kg} kg CO₂</div>
                    </div>
                </div>

                <div class="mb-4">
                    <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>Waypoint Tour Path</span>
                        <span class="text-[11px] font-normal text-slate-500">${route.stops.length} pickup locations</span>
                    </div>
                    <div class="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs font-medium text-slate-300 flex flex-wrap items-center gap-2">
                        ${route.route.map((nodeName, idx) => `
                            <span class="inline-flex items-center gap-1.5 ${idx === 0 || idx === route.route.length - 1 ? 'text-indigo-400 font-semibold' : 'text-slate-200'}">
                                ${nodeName}
                            </span>
                            ${idx < route.route.length - 1 ? '<i data-lucide="arrow-right" class="w-3.5 h-3.5 text-slate-600"></i>' : ''}
                        `).join("")}
                    </div>
                </div>

                <details class="group/details border border-slate-800/60 rounded-xl bg-slate-950/40 overflow-hidden">
                    <summary class="py-2.5 px-4 text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer flex items-center justify-between select-none">
                        <span class="flex items-center gap-2">
                            <i data-lucide="list-ordered" class="w-4 h-4"></i>
                            View Turn-by-Turn Driver Manifest & Timetable
                        </span>
                        <i data-lucide="chevron-down" class="w-4 h-4 transition-transform group-open/details:rotate-180"></i>
                    </summary>
                    <div class="overflow-x-auto p-2">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="border-b border-slate-800 text-[11px] text-slate-400 uppercase">
                                    <th class="py-2 px-3">#</th>
                                    <th class="py-2 px-3">Location</th>
                                    <th class="py-2 px-3">Scheduled ETA</th>
                                    <th class="py-2 px-3">Boarding</th>
                                    <th class="py-2 px-3">Onboard Load</th>
                                    <th class="py-2 px-3">Leg Dist</th>
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

    exportCsv() {
        if (!AppState.results || !AppState.results.routes) {
            if (window.showToast) showToast("Please optimize fleet first to export.", "error");
            return;
        }

        let csv = "Bus ID,Bus Name,Driver,Sequence,Location,Type,ETA,Boarding Students,Onboard Passengers,Leg Distance (km)\n";

        AppState.results.routes.forEach(route => {
            (route.itinerary || []).forEach(wp => {
                csv += `"${route.bus_id}","${route.bus_name}","${route.driver_name || ''}",${wp.seq},"${wp.name}","${wp.type}","${wp.eta}",${wp.students_boarding},${wp.passengers_onboard},${wp.leg_km}\n`;
            });
        });

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `OptiFleet_Manifest_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        if (window.showToast) showToast("Downloaded Driver Manifest CSV", "success");
    },

    exportJson() {
        if (!AppState.results) {
            if (window.showToast) showToast("No optimization result to export.", "error");
            return;
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(AppState.results, null, 2));
        const a = document.createElement("a");
        a.href = dataStr;
        a.download = `OptiFleet_Dispatch_Plan_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        if (window.showToast) showToast("Exported Route Plan JSON", "success");
    },

    printManifest() {
        if (!AppState.results) {
            if (window.showToast) showToast("Please optimize first before printing.", "error");
            return;
        }
        window.print();
    }
};

window.OptimizerView = OptimizerView;
