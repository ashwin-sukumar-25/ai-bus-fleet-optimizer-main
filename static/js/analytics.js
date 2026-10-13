/**
 * Analytics & Fleet Telemetry Dashboard
 * Renders Chart.js data visualizations for capacity distribution, route lengths, fuel costs, and carbon footprint.
 */
const AnalyticsDashboard = {
    charts: {
        capacity: null,
        distanceTime: null,
        emissions: null
    },

    render() {
        const results = AppState.results;
        const container = document.getElementById("analyticsDashboardContent");
        if (!container) return;

        if (!results || !results.routes || results.routes.length === 0) {
            container.innerHTML = `
                <div class="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                    <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                        <i data-lucide="bar-chart-2" class="w-6 h-6"></i>
                    </div>
                    <h3 class="text-base font-semibold text-slate-200">No Telemetry Available</h3>
                    <p class="text-sm text-slate-400 mt-1 max-w-md mx-auto">Telemetry and sustainability charts will populate once fleet optimization is executed.</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        const s = results.summary;
        const routes = results.routes;
        const costPerStudent = s.served_students ? (s.total_fuel_cost / s.served_students).toFixed(2) : "0.00";
        const avgDistance = routes.length ? (s.total_distance / routes.length).toFixed(1) : "0.0";

        container.innerHTML = `
            <!-- Analytics KPI Badges -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg">
                    <div class="text-xs font-medium text-slate-400 flex items-center justify-between">
                        <span>UNIT COMMUTER COST</span>
                        <i data-lucide="coins" class="w-4 h-4 text-indigo-400"></i>
                    </div>
                    <div class="text-2xl font-bold text-white mt-1">₹${costPerStudent}</div>
                    <div class="text-xs text-slate-400 mt-1">Fuel expenditure per student</div>
                </div>

                <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg">
                    <div class="text-xs font-medium text-slate-400 flex items-center justify-between">
                        <span>AVERAGE ROUTE RUN</span>
                        <i data-lucide="gauge" class="w-4 h-4 text-indigo-400"></i>
                    </div>
                    <div class="text-2xl font-bold text-white mt-1">${avgDistance} <span class="text-sm font-normal text-slate-400">km/bus</span></div>
                    <div class="text-xs text-slate-400 mt-1">Across ${routes.length} dispatched buses</div>
                </div>

                <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg">
                    <div class="text-xs font-medium text-slate-400 flex items-center justify-between">
                        <span>TOTAL CARBON FOOTPRINT</span>
                        <i data-lucide="cloud-off" class="w-4 h-4 text-emerald-400"></i>
                    </div>
                    <div class="text-2xl font-bold text-emerald-400 mt-1">${s.total_co2_kg} <span class="text-sm font-normal text-slate-400">kg CO₂</span></div>
                    <div class="text-xs text-slate-400 mt-1">Direct fleet tailpipe emissions</div>
                </div>

                <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg">
                    <div class="text-xs font-medium text-slate-400 flex items-center justify-between">
                        <span>SOLVER CONVERGENCE</span>
                        <i data-lucide="check-circle" class="w-4 h-4 text-indigo-400"></i>
                    </div>
                    <div class="text-2xl font-bold text-white mt-1">Optimal</div>
                    <div class="text-xs text-slate-400 mt-1">Algorithm: ${s.algorithm_used.toUpperCase()} heuristic</div>
                </div>
            </div>

            <!-- Charts Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <!-- Capacity vs Load Chart -->
                <div class="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg">
                    <div class="flex items-center justify-between mb-4">
                        <h4 class="text-sm font-bold text-slate-200 flex items-center gap-2">
                            <i data-lucide="users" class="w-4 h-4 text-indigo-400"></i>
                            Bus Capacity vs Allocated Passenger Load
                        </h4>
                        <span class="text-xs text-slate-500 font-mono">Seats vs Students</span>
                    </div>
                    <div class="h-64 relative">
                        <canvas id="chartCapacityLoad"></canvas>
                    </div>
                </div>

                <!-- Distance & Time Comparison Chart -->
                <div class="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg">
                    <div class="flex items-center justify-between mb-4">
                        <h4 class="text-sm font-bold text-slate-200 flex items-center gap-2">
                            <i data-lucide="timer" class="w-4 h-4 text-indigo-400"></i>
                            Route Distance & Estimated Duration
                        </h4>
                        <span class="text-xs text-slate-500 font-mono">km & minutes</span>
                    </div>
                    <div class="h-64 relative">
                        <canvas id="chartDistanceTime"></canvas>
                    </div>
                </div>
            </div>

            <!-- Fuel Cost & Emissions Breakdown -->
            <div class="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg">
                <div class="flex items-center justify-between mb-4">
                    <h4 class="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <i data-lucide="leaf" class="w-4 h-4 text-emerald-400"></i>
                        Fleet Sustainability & Fuel Expenditure Breakdown
                    </h4>
                    <span class="text-xs text-slate-500 font-mono">By Dispatched Vehicle</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div class="h-64 md:col-span-1 relative flex items-center justify-center">
                        <canvas id="chartEmissionsDoughnut"></canvas>
                    </div>
                    <div class="md:col-span-2 overflow-x-auto">
                        <table class="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr class="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                                    <th class="py-2.5 px-3">Vehicle</th>
                                    <th class="py-2.5 px-3">Fuel Type</th>
                                    <th class="py-2.5 px-3">Fuel (L)</th>
                                    <th class="py-2.5 px-3">Fuel Cost</th>
                                    <th class="py-2.5 px-3">CO₂ (kg)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${routes.map(r => `
                                    <tr class="border-b border-slate-800/60 hover:bg-slate-800/20">
                                        <td class="py-2.5 px-3 font-semibold text-slate-200 flex items-center gap-2">
                                            <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${r.color}"></span>
                                            ${r.bus_name}
                                        </td>
                                        <td class="py-2.5 px-3 text-slate-400">${r.fuel_type || 'Diesel'}</td>
                                        <td class="py-2.5 px-3 font-mono text-slate-200">${r.fuel_consumed_liters} L</td>
                                        <td class="py-2.5 px-3 font-mono text-slate-200 font-semibold">₹${r.fuel_cost}</td>
                                        <td class="py-2.5 px-3 font-mono text-emerald-400">${r.co2_emissions_kg} kg</td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();

        // Render Charts using Chart.js if loaded
        if (window.Chart) {
            this.initCharts(routes);
        }
    },

    initCharts(routes) {
        // Destroy existing instances
        Object.keys(this.charts).forEach(key => {
            if (this.charts[key]) {
                this.charts[key].destroy();
                this.charts[key] = null;
            }
        });

        const labels = routes.map(r => r.bus_name.replace(/\s*\(.*\)/, ''));
        const capacities = routes.map(r => r.capacity);
        const students = routes.map(r => r.students);
        const distances = routes.map(r => r.distance);
        const durations = routes.map(r => r.estimated_time);
        const costs = routes.map(r => r.fuel_cost);
        const colors = routes.map(r => r.color || "#6366f1");

        // Chart 1: Capacity vs Load
        const ctxCap = document.getElementById("chartCapacityLoad");
        if (ctxCap) {
            this.charts.capacity = new Chart(ctxCap, {
                type: "bar",
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: "Students Assigned",
                            data: students,
                            backgroundColor: "rgba(99, 102, 241, 0.8)",
                            borderRadius: 6
                        },
                        {
                            label: "Total Capacity",
                            data: capacities,
                            backgroundColor: "rgba(51, 65, 85, 0.6)",
                            borderRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: "#94a3b8", font: { size: 11 } } }
                    },
                    scales: {
                        x: { grid: { color: "rgba(51, 65, 85, 0.3)" }, ticks: { color: "#94a3b8" } },
                        y: { grid: { color: "rgba(51, 65, 85, 0.3)" }, ticks: { color: "#94a3b8" } }
                    }
                }
            });
        }

        // Chart 2: Distance & Duration
        const ctxDist = document.getElementById("chartDistanceTime");
        if (ctxDist) {
            this.charts.distanceTime = new Chart(ctxDist, {
                type: "bar",
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: "Distance (km)",
                            data: distances,
                            backgroundColor: "rgba(6, 182, 212, 0.8)",
                            borderRadius: 6
                        },
                        {
                            label: "Estimated Duration (mins)",
                            data: durations,
                            backgroundColor: "rgba(245, 158, 11, 0.8)",
                            borderRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: "#94a3b8", font: { size: 11 } } }
                    },
                    scales: {
                        x: { grid: { color: "rgba(51, 65, 85, 0.3)" }, ticks: { color: "#94a3b8" } },
                        y: { grid: { color: "rgba(51, 65, 85, 0.3)" }, ticks: { color: "#94a3b8" } }
                    }
                }
            });
        }

        // Chart 3: Fuel Cost Doughnut
        const ctxEmiss = document.getElementById("chartEmissionsDoughnut");
        if (ctxEmiss) {
            this.charts.emissions = new Chart(ctxEmiss, {
                type: "doughnut",
                data: {
                    labels: labels,
                    datasets: [{
                        data: costs,
                        backgroundColor: colors,
                        borderWidth: 2,
                        borderColor: "#0f172a"
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    cutout: "68%"
                }
            });
        }
    }
};

window.AnalyticsDashboard = AnalyticsDashboard;
