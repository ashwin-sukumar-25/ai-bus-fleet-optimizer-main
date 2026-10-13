/**
 * Interactive 2D Fleet Route Map
 * High-performance HTML5 Canvas renderer for depot hubs, stops, route vectors, and vehicle simulation.
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
                AppState.filterRouteBusId = e.target.value;
                this.render();
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
            y: this.offsetY - y * this.scale // Invert Y so positive is up
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

        AppState.stops.forEach(s => points.push({ x: Number(s.x || 0), y: Number(s.y || 0) }));

        if (points.length === 0) return;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        points.forEach(p => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        });

        const spanX = Math.max(4, (maxX - minX) * 1.4);
        const spanY = Math.max(4, (maxY - minY) * 1.4);

        const w = this.canvas.clientWidth || 800;
        const h = this.canvas.clientHeight || 540;

        this.scale = Math.min(w / spanX, h / spanY);
        this.scale = Math.max(12, Math.min(70, this.scale));

        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;

        this.offsetX = w / 2 - midX * this.scale;
        this.offsetY = h / 2 + midY * this.scale;

        this.populateBusFilter();
        this.render();
    },

    populateBusFilter() {
        const select = document.getElementById("mapBusFilter");
        if (!select) return;

        const currentVal = select.value;
        select.innerHTML = `<option value="all">All Bus Routes</option>`;

        if (AppState.results && AppState.results.routes) {
            AppState.results.routes.forEach(r => {
                select.innerHTML += `<option value="${r.bus_id}">${r.bus_name} (${r.students} students)</option>`;
            });
        }

        select.value = currentVal || "all";
    },

    handleHover(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        let found = null;
        const depot = {
            id: "depot",
            name: AppState.constraints.depot_name || "College Main Campus",
            x: AppState.constraints.depot_x || 0,
            y: AppState.constraints.depot_y || 0,
            isDepot: true
        };

        const allItems = [depot, ...AppState.stops];

        for (const item of allItems) {
            const pos = this.worldToScreen(item.x, item.y);
            const dist = Math.hypot(mx - pos.x, my - pos.y);
            if (dist < 14) {
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
                btn.innerHTML = `<i data-lucide="pause" class="w-4 h-4"></i> Pause Simulation`;
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

        // Draw Route Vectors
        this.drawRoutes();

        // Draw Pickup Stop Nodes
        this.drawStops();

        // Draw Central College Hub
        this.drawDepot();

        // Draw Simulated Moving Buses
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
        ctx.strokeStyle = "rgba(51, 65, 85, 0.25)";
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

        // Draw subtle origin crosshairs (0, 0)
        const origin = this.worldToScreen(0, 0);
        ctx.strokeStyle = "rgba(99, 102, 241, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, origin.y);
        ctx.lineTo(w, origin.y);
        ctx.moveTo(origin.x, 0);
        ctx.lineTo(origin.x, h);
        ctx.stroke();

        ctx.restore();
    },

    drawRoutes() {
        if (!AppState.results || !AppState.results.routes) return;

        const ctx = this.ctx;
        const routes = AppState.results.routes;
        const activeFilter = AppState.filterRouteBusId || "all";

        routes.forEach((route) => {
            if (activeFilter !== "all" && route.bus_id !== activeFilter) return;

            const itin = route.itinerary;
            if (!itin || itin.length < 2) return;

            ctx.save();
            ctx.strokeStyle = route.color || "#6366f1";
            ctx.lineWidth = (activeFilter === route.bus_id) ? 3.5 : 2.5;
            ctx.lineJoin = "round";
            ctx.lineCap = "round";

            // Glow for active route
            ctx.shadowColor = route.color || "#6366f1";
            ctx.shadowBlur = 10;

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
                ctx.moveTo(-5, -4);
                ctx.lineTo(4, 0);
                ctx.lineTo(-5, 4);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            ctx.restore();
        });
    },

    drawStops() {
        const ctx = this.ctx;
        AppState.stops.forEach((stop) => {
            const pos = this.worldToScreen(stop.x, stop.y);

            ctx.save();
            // Outer node halo
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(30, 41, 59, 0.9)";
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#38bdf8";
            ctx.stroke();

            // Inner core
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = "#0284c7";
            ctx.fill();

            // Label
            ctx.font = "600 11px Inter, sans-serif";
            ctx.fillStyle = "#cbd5e1";
            ctx.textAlign = "center";
            ctx.fillText(stop.name, pos.x, pos.y - 12);

            // Students passenger pill
            ctx.font = "500 10px Inter, sans-serif";
            ctx.fillStyle = "#38bdf8";
            ctx.fillText(`${stop.students}p`, pos.x, pos.y + 18);

            ctx.restore();
        });
    },

    drawDepot() {
        const ctx = this.ctx;
        const depotX = AppState.constraints.depot_x || 0;
        const depotY = AppState.constraints.depot_y || 0;
        const pos = this.worldToScreen(depotX, depotY);

        ctx.save();
        // Pulsing glow rings
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 22, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(99, 102, 241, 0.15)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = "#4f46e5";
        ctx.shadowColor = "#6366f1";
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        // Hub Icon / Text
        ctx.font = "700 10px Inter, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("CAMPUS", pos.x, pos.y);

        // Depot label
        ctx.shadowBlur = 0;
        ctx.font = "700 12px Inter, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(AppState.constraints.depot_name || "College Main Hub", pos.x, pos.y - 20);

        ctx.restore();
    },

    drawSimulatedVehicles() {
        const ctx = this.ctx;
        const routes = AppState.results.routes;
        const t = this.simulationProgress;

        routes.forEach((route) => {
            const itin = route.itinerary;
            if (!itin || itin.length < 2) return;

            // Compute vehicle position along polyline at fraction t
            const pos = this.interpolatePolyline(itin, t);
            if (!pos) return;

            const screen = this.worldToScreen(pos.x, pos.y);

            ctx.save();
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, 9, 0, Math.PI * 2);
            ctx.fillStyle = route.color || "#6366f1";
            ctx.shadowColor = route.color || "#6366f1";
            ctx.shadowBlur = 14;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#ffffff";
            ctx.stroke();

            // Vehicle Badge
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

        // Total path length
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

        const title = item.name;
        const line2 = item.isDepot ? "Campus Hub & Depot" : `${item.students} students waiting`;
        const line3 = `Coord: (${Number(item.x).toFixed(1)}, ${Number(item.y).toFixed(1)})`;

        ctx.save();
        ctx.font = "600 12px Inter, sans-serif";
        const w = Math.max(ctx.measureText(title).width, ctx.measureText(line2).width, 140) + 24;
        const h = 64;
        const x = pos.x + 14;
        const y = pos.y - 32;

        // Tooltip container
        ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
        ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();
        ctx.stroke();

        // Tooltip text
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.fillText(title, x + 12, y + 20);

        ctx.font = "500 11px Inter, sans-serif";
        ctx.fillStyle = item.isDepot ? "#818cf8" : "#38bdf8";
        ctx.fillText(line2, x + 12, y + 38);

        ctx.font = "400 10px monospace";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(line3, x + 12, y + 54);

        ctx.restore();
    }
};

window.FleetMap = FleetMap;
