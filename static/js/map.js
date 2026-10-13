/**
 * Interactive Fleet Route Visualizer
 * HTML5 Canvas renderer with bus-specific isolation, smooth simulation,
 * turn-by-turn stop sequence highlights, and road network backdrop.
 */
const FleetMap = {
    canvas: null,
    ctx: null,
    scale: 25,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    hoveredItem: null,
    animationFrameId: null,
    isSimulating: false,
    simulationProgress: 0, // 0.0 to 1.0

    init() {
        this.canvas = document.getElementById("fleetMapCanvas");
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext("2d");

        this.bindEvents();
        this.resize();
        this.fitToData();
    },

    bindEvents() {
        window.addEventListener("resize", () => this.resize());

        this.canvas.addEventListener("mousedown", (e) => {
            this.isDragging = true;
            this.dragStartX = e.clientX - this.offsetX;
            this.dragStartY = e.clientY - this.offsetY;
        });

        window.addEventListener("mouseup", () => {
            this.isDragging = false;
        });

        this.canvas.addEventListener("mousemove", (e) => {
            if (this.isDragging) {
                this.offsetX = e.clientX - this.dragStartX;
                this.offsetY = e.clientY - this.dragStartY;
                this.render();
            } else {
                this.handleHover(e);
            }
        });

        this.canvas.addEventListener("wheel", (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
            const mouseX = e.clientX - this.canvas.getBoundingClientRect().left;
            const mouseY = e.clientY - this.canvas.getBoundingClientRect().top;

            this.offsetX = mouseX - (mouseX - this.offsetX) * zoomFactor;
            this.offsetY = mouseY - (mouseY - this.offsetY) * zoomFactor;
            this.scale *= zoomFactor;
            this.scale = Math.max(8, Math.min(120, this.scale));
            this.render();
        }, { passive: false });

        // Map UI Controls
        const btnZoomIn = document.getElementById("btnMapZoomIn");
        const btnZoomOut = document.getElementById("btnMapZoomOut");
        const btnFit = document.getElementById("btnMapFit");
        const btnSimulate = document.getElementById("btnMapSimulate");
        const filterSelect = document.getElementById("mapBusFilter");

        if (btnZoomIn) btnZoomIn.addEventListener("click", () => this.zoom(1.25));
        if (btnZoomOut) btnZoomOut.addEventListener("click", () => this.zoom(0.8));
        if (btnFit) btnFit.addEventListener("click", () => this.fitToData());
        if (btnSimulate) btnSimulate.addEventListener("click", () => this.toggleSimulation());
        if (filterSelect) {
            filterSelect.addEventListener("change", (e) => {
                this.selectBusFilter(e.target.value);
            });
        }
    },

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = (rect.height || 540) * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height || 540}px`;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);
        this.render();
    },

    resizeAndRender() {
        this.resize();
        this.fitToData();
    },

    zoom(factor) {
        const cx = this.canvas.clientWidth / 2;
        const cy = this.canvas.clientHeight / 2;
        this.offsetX = cx - (cx - this.offsetX) * factor;
        this.offsetY = cy - (cy - this.offsetY) * factor;
        this.scale *= factor;
        this.scale = Math.max(8, Math.min(120, this.scale));
        this.render();
    },

    worldToScreen(x, y) {
        return {
            x: this.offsetX + x * this.scale,
            y: this.offsetY - y * this.scale
        };
    },

    screenToWorld(sx, sy) {
        return {
            x: (sx - this.offsetX) / this.scale,
            y: -(sy - this.offsetY) / this.scale
        };
    },

    fitToData() {
        const points = [];
        const depot = { x: AppState.constraints.depot_x || 0, y: AppState.constraints.depot_y || 0 };
        points.push(depot);

        const activeFilter = AppState.filterRouteBusId || "all";
        if (activeFilter !== "all" && AppState.results && AppState.results.routes) {
            const r = AppState.results.routes.find(route => route.bus_id === activeFilter);
            if (r && r.itinerary) {
                r.itinerary.forEach(wp => points.push({ x: Number(wp.x || 0), y: Number(wp.y || 0) }));
            }
        } else {
            AppState.stops.forEach(s => points.push({ x: Number(s.x || 0), y: Number(s.y || 0) }));
        }

        if (points.length === 0) return;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        points.forEach(p => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        });

        const spanX = Math.max(5, (maxX - minX) * 1.4);
        const spanY = Math.max(5, (maxY - minY) * 1.4);

        const w = this.canvas.clientWidth || 800;
        const h = this.canvas.clientHeight || 540;

        this.scale = Math.min(w / spanX, h / spanY);
        this.scale = Math.max(12, Math.min(65, this.scale));

        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;

        this.offsetX = w / 2 - midX * this.scale;
        this.offsetY = h / 2 + midY * this.scale;

        this.populateBusFilter();
        this.render();
    },

    selectBusFilter(busId) {
        AppState.filterRouteBusId = busId;
        const select = document.getElementById("mapBusFilter");
        if (select) select.value = busId;

        // Update pills
        this.renderBusFilterPills();
        this.updateFocusedBusCard();
        this.fitToData();
    },

    populateBusFilter() {
        const select = document.getElementById("mapBusFilter");
        if (!select) return;

        const currentVal = AppState.filterRouteBusId || "all";
        select.innerHTML = `<option value="all">All Bus Routes</option>`;

        if (AppState.results && AppState.results.routes) {
            AppState.results.routes.forEach(r => {
                select.innerHTML += `<option value="${r.bus_id}">${r.bus_name} (${r.students} students)</option>`;
            });
        }
        select.value = currentVal;
        this.renderBusFilterPills();
        this.updateFocusedBusCard();
    },

    renderBusFilterPills() {
        const container = document.getElementById("mapBusPillsContainer");
        if (!container) return;

        const activeId = AppState.filterRouteBusId || "all";
        let html = `
            <button type="button" onclick="FleetMap.selectBusFilter('all')" class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${activeId === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'}">
                All Buses
            </button>
        `;

        if (AppState.results && AppState.results.routes) {
            AppState.results.routes.forEach(r => {
                const isSelected = activeId === r.bus_id;
                html += `
                    <button type="button" onclick="FleetMap.selectBusFilter('${r.bus_id}')" class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${isSelected ? 'text-white shadow-md' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'}" style="${isSelected ? `background-color: ${r.color}` : ''}">
                        <span class="w-2 h-2 rounded-full" style="background-color: ${r.color}"></span>
                        <span>${r.bus_name}</span>
                    </button>
                `;
            });
        }
        container.innerHTML = html;
    },

    updateFocusedBusCard() {
        const card = document.getElementById("mapFocusedBusCard");
        if (!card) return;

        const activeId = AppState.filterRouteBusId || "all";
        if (activeId === "all" || !AppState.results || !AppState.results.routes) {
            card.classList.add("hidden");
            return;
        }

        const route = AppState.results.routes.find(r => r.bus_id === activeId);
        if (!route) {
            card.classList.add("hidden");
            return;
        }

        card.classList.remove("hidden");
        card.innerHTML = `
            <div class="flex items-center justify-between gap-4 pb-2.5 border-b border-slate-800">
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full" style="background-color: ${route.color}"></div>
                    <span class="text-sm font-bold text-white">${route.bus_name}</span>
                    <span class="text-xs px-2 py-0.5 rounded bg-slate-800 font-mono text-slate-300">${route.bus_id}</span>
                </div>
                <button type="button" onclick="FleetMap.selectBusFilter('all')" class="text-xs text-slate-400 hover:text-white">
                    Show All
                </button>
            </div>
            <div class="grid grid-cols-3 gap-3 text-xs pt-2.5">
                <div>
                    <span class="text-slate-400 block">Students</span>
                    <strong class="text-white text-sm">${route.students} / ${route.capacity}</strong>
                </div>
                <div>
                    <span class="text-slate-400 block">Distance</span>
                    <strong class="text-white text-sm">${route.distance} km</strong>
                </div>
                <div>
                    <span class="text-slate-400 block">Fuel Est.</span>
                    <strong class="text-white text-sm">${route.fuel_consumed_liters} L</strong>
                </div>
            </div>
            <div class="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span>Driver: <strong class="text-slate-200">${route.driver_name}</strong></span>
                <span>•</span>
                <span>Stops: <strong class="text-slate-200">${route.stops.length}</strong></span>
            </div>
        `;
    },

    handleHover(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        let found = null;
        const depot = {
            id: "depot",
            name: AppState.constraints.depot_name || "Campus Main Hub",
            x: AppState.constraints.depot_x || 0,
            y: AppState.constraints.depot_y || 0,
            isDepot: true
        };

        const allItems = [depot, ...AppState.stops];

        for (const item of allItems) {
            const pos = this.worldToScreen(item.x, item.y);
            const dist = Math.hypot(mx - pos.x, my - pos.y);
            if (dist < 16) {
                found = { item, screenPos: pos };
                break;
            }
        }

        if (this.hoveredItem !== found) {
            this.hoveredItem = found;
            this.canvas.style.cursor = found ? "pointer" : "grab";
            this.render();
        }
    },

    toggleSimulation() {
        this.isSimulating = !this.isSimulating;
        const btn = document.getElementById("btnMapSimulate");

        if (this.isSimulating) {
            if (btn) {
                btn.innerHTML = `<i data-lucide="pause" class="w-4 h-4"></i> Pause Flow`;
                btn.className = btn.className.replace("bg-slate-800", "bg-indigo-600");
            }
            this.startSimulationLoop();
        } else {
            if (btn) {
                btn.innerHTML = `<i data-lucide="play" class="w-4 h-4"></i> Simulate Route Flow`;
                btn.className = btn.className.replace("bg-indigo-600", "bg-slate-800");
            }
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
        }
        if (window.lucide) window.lucide.createIcons();
    },

    startSimulationLoop() {
        const loop = () => {
            if (!this.isSimulating) return;
            this.simulationProgress += 0.0035;
            if (this.simulationProgress > 1.0) this.simulationProgress = 0.0;
            this.render();
            this.animationFrameId = requestAnimationFrame(loop);
        };
        this.animationFrameId = requestAnimationFrame(loop);
    },

    render() {
        if (!this.ctx || !this.canvas) return;

        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, w, h);

        // Background subtle grid
        this.drawGrid(w, h);

        // Draw background road network paths
        this.drawRoadNetwork();

        // Draw Optimized Route Vectors
        this.drawRoutes();

        // Draw Pickup Stop Nodes
        this.drawStops();

        // Draw Central Campus Depot Hub
        this.drawDepot();

        // Draw Simulated Moving Buses (strictly respecting filter)
        if (this.isSimulating && AppState.results && AppState.results.routes) {
            this.drawSimulatedVehicles();
        }

        // Draw Hover Tooltip
        if (this.hoveredItem) {
            this.drawTooltip(this.hoveredItem);
        }
    },

    drawGrid(w, h) {
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = "rgba(51, 65, 85, 0.2)";
        ctx.lineWidth = 1;

        const gridSize = this.scale;
        const startX = this.offsetX % gridSize;
        const startY = this.offsetY % gridSize;

        for (let x = startX; x < w; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = startY; y < h; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        const origin = this.worldToScreen(0, 0);
        ctx.strokeStyle = "rgba(99, 102, 241, 0.2)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, origin.y);
        ctx.lineTo(w, origin.y);
        ctx.moveTo(origin.x, 0);
        ctx.lineTo(origin.x, h);
        ctx.stroke();

        ctx.restore();
    },

    drawRoadNetwork() {
        if (!AppState.edges || !AppState.edges.length) return;
        const ctx = this.ctx;
        const stopMap = {};
        AppState.stops.forEach(s => { stopMap[s.id] = s; });

        ctx.save();
        ctx.strokeStyle = "rgba(51, 65, 85, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);

        AppState.edges.forEach(e => {
            const s1 = stopMap[e.from];
            const s2 = stopMap[e.to];
            if (!s1 || !s2) return;
            const p1 = this.worldToScreen(s1.x, s1.y);
            const p2 = this.worldToScreen(s2.x, s2.y);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        });
        ctx.restore();
    },

    drawRoutes() {
        if (!AppState.results || !AppState.results.routes) return;

        const ctx = this.ctx;
        const routes = AppState.results.routes;
        const activeFilter = AppState.filterRouteBusId || "all";

        routes.forEach((route) => {
            const isTarget = (activeFilter === "all" || route.bus_id === activeFilter);
            if (!isTarget) return; // Completely hide other routes when a specific bus is selected!

            const itin = route.itinerary;
            if (!itin || itin.length < 2) return;

            ctx.save();
            ctx.strokeStyle = route.color || "#6366f1";
            ctx.lineWidth = (activeFilter === route.bus_id) ? 4.0 : 2.8;
            ctx.lineJoin = "round";
            ctx.lineCap = "round";

            ctx.shadowColor = route.color || "#6366f1";
            ctx.shadowBlur = (activeFilter === route.bus_id) ? 14 : 6;

            ctx.beginPath();
            const startPt = this.worldToScreen(itin[0].x, itin[0].y);
            ctx.moveTo(startPt.x, startPt.y);

            for (let i = 1; i < itin.length; i++) {
                const pt = this.worldToScreen(itin[i].x, itin[i].y);
                ctx.lineTo(pt.x, pt.y);
            }
            ctx.stroke();

            // Draw directional vector arrows on edges
            ctx.shadowBlur = 0;
            ctx.fillStyle = route.color || "#6366f1";
            for (let i = 0; i < itin.length - 1; i++) {
                const p1 = this.worldToScreen(itin[i].x, itin[i].y);
                const p2 = this.worldToScreen(itin[i + 1].x, itin[i + 1].y);
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

                ctx.save();
                ctx.translate(midX, midY);
                ctx.rotate(angle);
                ctx.beginPath();
                ctx.moveTo(-6, -4.5);
                ctx.lineTo(5, 0);
                ctx.lineTo(-6, 4.5);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            ctx.restore();
        });
    },

    drawStops() {
        const ctx = this.ctx;
        const activeFilter = AppState.filterRouteBusId || "all";

        let targetStopIds = null;
        let routeColor = "#38bdf8";

        if (activeFilter !== "all" && AppState.results && AppState.results.routes) {
            const activeRoute = AppState.results.routes.find(r => r.bus_id === activeFilter);
            if (activeRoute) {
                targetStopIds = new Set(activeRoute.stops.map(s => s.id));
                routeColor = activeRoute.color || "#6366f1";
            }
        }

        AppState.stops.forEach((stop) => {
            const isAssigned = (targetStopIds === null || targetStopIds.has(stop.id));
            const pos = this.worldToScreen(stop.x, stop.y);

            ctx.save();
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, isAssigned ? 8.5 : 5, 0, Math.PI * 2);
            ctx.fillStyle = isAssigned ? "rgba(30, 41, 59, 0.95)" : "rgba(15, 23, 42, 0.4)";
            ctx.fill();
            ctx.lineWidth = isAssigned ? 2.2 : 1;
            ctx.strokeStyle = isAssigned ? routeColor : "rgba(100, 116, 139, 0.3)";
            ctx.stroke();

            // Inner core
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, isAssigned ? 4 : 2, 0, Math.PI * 2);
            ctx.fillStyle = isAssigned ? routeColor : "rgba(100, 116, 139, 0.4)";
            ctx.fill();

            if (isAssigned) {
                ctx.font = "600 11px Inter, sans-serif";
                ctx.fillStyle = "#f1f5f9";
                ctx.textAlign = "center";
                ctx.fillText(stop.name, pos.x, pos.y - 13);

                ctx.font = "500 10px monospace";
                ctx.fillStyle = routeColor;
                ctx.fillText(`${stop.students}p`, pos.x, pos.y + 19);
            }

            ctx.restore();
        });
    },

    drawDepot() {
        const ctx = this.ctx;
        const depotX = AppState.constraints.depot_x || 0;
        const depotY = AppState.constraints.depot_y || 0;
        const pos = this.worldToScreen(depotX, depotY);

        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(99, 102, 241, 0.18)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 13, 0, Math.PI * 2);
        ctx.fillStyle = "#4f46e5";
        ctx.shadowColor = "#6366f1";
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        ctx.font = "700 9px Inter, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("HUB", pos.x, pos.y);

        ctx.shadowBlur = 0;
        ctx.font = "700 11px Inter, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(AppState.constraints.depot_name || "Campus Main Hub", pos.x, pos.y - 18);

        ctx.restore();
    },

    drawSimulatedVehicles() {
        const ctx = this.ctx;
        const routes = AppState.results.routes;
        const t = this.simulationProgress;
        const activeFilter = AppState.filterRouteBusId || "all";

        routes.forEach((route) => {
            // Strictly simulate ONLY the chosen bus when filtered!
            if (activeFilter !== "all" && route.bus_id !== activeFilter) {
                return;
            }

            const itin = route.itinerary;
            if (!itin || itin.length < 2) return;

            const pos = this.interpolatePolyline(itin, t);
            if (!pos) return;

            const screen = this.worldToScreen(pos.x, pos.y);

            ctx.save();
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, 11, 0, Math.PI * 2);
            ctx.fillStyle = route.color || "#6366f1";
            ctx.shadowColor = route.color || "#6366f1";
            ctx.shadowBlur = 16;
            ctx.fill();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = "#ffffff";
            ctx.stroke();

            // Vehicle Badge text
            ctx.font = "700 9px Inter, sans-serif";
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(route.bus_id, screen.x, screen.y);

            ctx.restore();
        });
    },

    interpolatePolyline(itinerary, progress) {
        if (itinerary.length === 1) return itinerary[0];

        let totalLen = 0;
        const segLens = [];
        for (let i = 0; i < itinerary.length - 1; i++) {
            const d = Math.hypot(itinerary[i + 1].x - itinerary[i].x, itinerary[i + 1].y - itinerary[i].y);
            segLens.push(d);
            totalLen += d;
        }

        if (totalLen === 0) return itinerary[0];

        const targetDist = progress * totalLen;
        let runningDist = 0;

        for (let i = 0; i < segLens.length; i++) {
            const len = segLens[i];
            if (runningDist + len >= targetDist) {
                const segFrac = (targetDist - runningDist) / len;
                return {
                    x: itinerary[i].x + (itinerary[i + 1].x - itinerary[i].x) * segFrac,
                    y: itinerary[i].y + (itinerary[i + 1].y - itinerary[i].y) * segFrac
                };
            }
            runningDist += len;
        }

        return itinerary[itinerary.length - 1];
    },

    drawTooltip(hover) {
        const ctx = this.ctx;
        const item = hover.item;
        const pos = hover.screenPos;

        const hubDistText = item.isDepot ? '' : (item.is_hub_connected ? `Direct Hub: ${item.hub_distance}km` : 'Via Network Paths');
        const line2 = item.isDepot ? "Campus Transit Depot" : `${item.students} students • ${hubDistText}`;

        ctx.save();
        ctx.font = "600 12px Inter, sans-serif";
        const w = Math.max(ctx.measureText(title).width, ctx.measureText(line2).width, 140) + 24;
        const h = 50;
        const x = pos.x + 14;
        const y = pos.y - 25;

        ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
        ctx.strokeStyle = "rgba(99, 102, 241, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.fillText(title, x + 12, y + 18);

        ctx.font = "500 11px Inter, sans-serif";
        ctx.fillStyle = item.isDepot ? "#818cf8" : "#38bdf8";
        ctx.fillText(line2, x + 12, y + 36);

        ctx.restore();
    }
};

window.FleetMap = FleetMap;
