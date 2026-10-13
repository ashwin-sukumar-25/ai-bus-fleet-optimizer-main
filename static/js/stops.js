/**
 * Stops & Road Network Graph Management Module
 * Uses clean UI Cards (no browser prompt popups),
 * supports stops with or without direct Campus Hub connections,
 * and allows users to define road edges with kilometers.
 */
const StopsManager = {
    searchTerm: "",
    selectedStopId: null,
    connectSourceId: null,
    graphMode: "select", // "select" | "add_stop" | "connect"
    canvas: null,
    ctx: null,
    scale: 24,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    dragNode: null,
    dragStartX: 0,
    dragStartY: 0,

    init() {
        this.initCanvas();
        this.renderStopsTable();
        this.renderEdgesList();
        this.updateStopsStats();
        this.bindEvents();
    },

    initCanvas() {
        this.canvas = document.getElementById("stopsGraphCanvas");
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext("2d");

        this.resizeCanvas();
        window.addEventListener("resize", () => this.resizeCanvas());

        this.canvas.addEventListener("mousedown", (e) => this.handleCanvasMouseDown(e));
        this.canvas.addEventListener("mousemove", (e) => this.handleCanvasMouseMove(e));
        window.addEventListener("mouseup", () => this.handleCanvasMouseUp());
        this.canvas.addEventListener("wheel", (e) => this.handleCanvasWheel(e), { passive: false });

        this.fitGraphToData();
    },

    resizeCanvas() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const width = rect.width;
        const height = 440;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);
        this.renderGraph();
    },

    bindEvents() {
        const addBtn = document.getElementById("btnAddStop");
        if (addBtn) addBtn.addEventListener("click", () => this.openAddStopModal());

        const searchInput = document.getElementById("searchStopsInput");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.renderStopsTable();
            });
        }

        // Graph mode buttons
        const btnModeSelect = document.getElementById("btnGraphModeSelect");
        const btnModeAdd = document.getElementById("btnGraphModeAdd");
        const btnModeConnect = document.getElementById("btnGraphModeConnect");
        const btnFit = document.getElementById("btnGraphFit");

        if (btnModeSelect) btnModeSelect.addEventListener("click", () => this.setGraphMode("select"));
        if (btnModeAdd) btnModeAdd.addEventListener("click", () => this.setGraphMode("add_stop"));
        if (btnModeConnect) btnModeConnect.addEventListener("click", () => this.setGraphMode("connect"));
        if (btnFit) btnFit.addEventListener("click", () => this.fitGraphToData());

        const btnAddEdgeDirect = document.getElementById("btnAddEdgeDirect");
        if (btnAddEdgeDirect) {
            btnAddEdgeDirect.addEventListener("click", () => this.openEdgeModal());
        }
    },

    setGraphMode(mode) {
        this.graphMode = mode;
        this.connectSourceId = null;

        const updateBtn = (id, active) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            if (active) {
                btn.className = "px-3 py-1.5 rounded-xl bg-indigo-600 border border-indigo-500 text-white font-semibold transition-all flex items-center gap-1.5";
            } else {
                btn.className = "px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800 transition-all flex items-center gap-1.5";
            }
        };

        updateBtn("btnGraphModeSelect", mode === "select");
        updateBtn("btnGraphModeAdd", mode === "add_stop");
        updateBtn("btnGraphModeConnect", mode === "connect");

        const statusEl = document.getElementById("graphModeStatusText");
        if (statusEl) {
            if (mode === "select") {
                statusEl.textContent = "Select & Move: Drag canvas to pan, drag stops to reposition.";
            } else if (mode === "add_stop") {
                statusEl.textContent = "Place Stop: Click anywhere on the graph space to drop a new pickup stop.";
            } else if (mode === "connect") {
                statusEl.textContent = "Connect Path: Click first stop, then click second stop to connect with road kilometers.";
            }
        }

        this.canvas.style.cursor = mode === "add_stop" ? "crosshair" : (mode === "connect" ? "pointer" : "grab");
        this.renderGraph();
    },

    worldToScreen(x, y) {
        return {
            x: this.offsetX + x * this.scale,
            y: this.offsetY - y * this.scale
        };
    },

    screenToWorld(sx, sy) {
        return {
            x: Math.round(((sx - this.offsetX) / this.scale) * 10) / 10,
            y: Math.round((-(sy - this.offsetY) / this.scale) * 10) / 10
        };
    },

    fitGraphToData() {
        if (!this.canvas) return;
        const depot = { x: AppState.constraints.depot_x || 0, y: AppState.constraints.depot_y || 0 };
        const points = [depot, ...AppState.stops.map(s => ({ x: Number(s.x || 0), y: Number(s.y || 0) }))];

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        points.forEach(p => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        });

        const spanX = Math.max(6, (maxX - minX) * 1.5);
        const spanY = Math.max(6, (maxY - minY) * 1.5);

        const w = this.canvas.clientWidth || 800;
        const h = this.canvas.clientHeight || 440;

        this.scale = Math.min(w / spanX, h / spanY);
        this.scale = Math.max(12, Math.min(48, this.scale));

        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;

        this.offsetX = w / 2 - midX * this.scale;
        this.offsetY = h / 2 + midY * this.scale;

        this.renderGraph();
    },

    handleCanvasWheel(e) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.12 : 0.89;
        const mouseX = e.clientX - this.canvas.getBoundingClientRect().left;
        const mouseY = e.clientY - this.canvas.getBoundingClientRect().top;

        this.offsetX = mouseX - (mouseX - this.offsetX) * factor;
        this.offsetY = mouseY - (mouseY - this.offsetY) * factor;
        this.scale *= factor;
        this.scale = Math.max(10, Math.min(80, this.scale));
        this.renderGraph();
    },

    handleCanvasMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Check if user clicked on a node
        const clickedNode = this.getNodeAtScreen(mx, my);

        if (this.graphMode === "add_stop") {
            const worldPos = this.screenToWorld(mx, my);
            this.openAddStopModal(worldPos.x, worldPos.y);
            return;
        }

        if (this.graphMode === "connect") {
            if (clickedNode) {
                if (!this.connectSourceId) {
                    this.connectSourceId = clickedNode.id;
                    if (window.showToast) showToast(`Selected ${clickedNode.name}. Now click target stop to link.`, "info");
                    this.renderGraph();
                } else if (this.connectSourceId !== clickedNode.id) {
                    const srcId = this.connectSourceId;
                    const tgtId = clickedNode.id;
                    this.connectSourceId = null;
                    this.openEdgeModal(srcId, tgtId);
                }
            }
            return;
        }

        // Mode: select & move
        if (clickedNode && clickedNode.id !== "college") {
            this.dragNode = clickedNode;
            this.selectedStopId = clickedNode.id;
            this.renderStopsTable();
        } else {
            // Check if user clicked near an edge badge to edit it
            const clickedEdge = this.getEdgeAtScreen(mx, my);
            if (clickedEdge) {
                this.openEdgeModal(clickedEdge.from, clickedEdge.to, clickedEdge.distance);
                return;
            }

            this.isDragging = true;
            this.dragStartX = e.clientX - this.offsetX;
            this.dragStartY = e.clientY - this.offsetY;
        }
        this.renderGraph();
    },

    handleCanvasMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        if (this.dragNode) {
            const worldPos = this.screenToWorld(mx, my);
            this.dragNode.x = worldPos.x;
            this.dragNode.y = worldPos.y;
            AppState.saveToStorage();
            this.renderGraph();
            this.renderStopsTable();
            return;
        }

        if (this.isDragging) {
            this.offsetX = e.clientX - this.dragStartX;
            this.offsetY = e.clientY - this.dragStartY;
            this.renderGraph();
        }
    },

    handleCanvasMouseUp() {
        this.isDragging = false;
        this.dragNode = null;
    },

    getNodeAtScreen(sx, sy) {
        const depot = {
            id: "college",
            name: AppState.constraints.depot_name || "Campus Hub",
            x: AppState.constraints.depot_x || 0,
            y: AppState.constraints.depot_y || 0
        };
        const nodes = [depot, ...AppState.stops];
        for (const n of nodes) {
            const pos = this.worldToScreen(n.x, n.y);
            if (Math.hypot(sx - pos.x, sy - pos.y) <= 18) {
                return n;
            }
        }
        return null;
    },

    getEdgeAtScreen(sx, sy) {
        const stopMap = {
            college: { x: AppState.constraints.depot_x || 0, y: AppState.constraints.depot_y || 0 }
        };
        AppState.stops.forEach(s => { stopMap[s.id] = s; });

        for (const e of AppState.edges) {
            const s1 = stopMap[e.from];
            const s2 = stopMap[e.to];
            if (!s1 || !s2) continue;
            const p1 = this.worldToScreen(s1.x, s1.y);
            const p2 = this.worldToScreen(s2.x, s2.y);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            if (Math.hypot(sx - midX, sy - midY) <= 16) {
                return e;
            }
        }
        return null;
    },

    renderGraph() {
        if (!this.ctx || !this.canvas) return;
        const ctx = this.ctx;
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;

        ctx.clearRect(0, 0, w, h);

        // Draw background grid
        this.drawGraphGrid(ctx, w, h);

        // Draw Direct Hub Lines ONLY for stops that are directly connected to Hub!
        this.drawDirectHubLines(ctx);

        // Draw user-defined edges between stops
        this.drawEdges(ctx);

        // Draw stop nodes
        this.drawStopNodes(ctx);

        // Draw campus depot hub
        this.drawCampusDepot(ctx);
    },

    drawGraphGrid(ctx, w, h) {
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

    drawDirectHubLines(ctx) {
        const depotPos = this.worldToScreen(AppState.constraints.depot_x || 0, AppState.constraints.depot_y || 0);

        ctx.save();
        AppState.stops.forEach(stop => {
            // ONLY draw connection to hub if is_hub_connected is TRUE!
            if (!stop.is_hub_connected) return;

            const stopPos = this.worldToScreen(stop.x, stop.y);

            ctx.beginPath();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = "rgba(129, 140, 248, 0.6)";
            ctx.lineWidth = 2.0;
            ctx.moveTo(depotPos.x, depotPos.y);
            ctx.lineTo(stopPos.x, stopPos.y);
            ctx.stroke();

            // Direct hub distance pill
            const midX = (depotPos.x + stopPos.x) / 2;
            const midY = (depotPos.y + stopPos.y) / 2;
            const distLabel = `${stop.hub_distance || 5.0} km to hub`;

            ctx.font = "600 9px monospace";
            const textWidth = ctx.measureText(distLabel).width;
            const badgeW = textWidth + 10;
            const badgeH = 16;

            ctx.setLineDash([]);
            ctx.fillStyle = "#090d16";
            ctx.strokeStyle = "rgba(129, 140, 248, 0.7)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(midX - badgeW / 2, midY - badgeH / 2, badgeW, badgeH, 5);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "#c7d2fe";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(distLabel, midX, midY);
        });
        ctx.restore();
    },

    drawEdges(ctx) {
        const stopMap = {
            college: { x: AppState.constraints.depot_x || 0, y: AppState.constraints.depot_y || 0 }
        };
        AppState.stops.forEach(s => { stopMap[s.id] = s; });

        ctx.save();
        AppState.edges.forEach(edge => {
            const s1 = stopMap[edge.from];
            const s2 = stopMap[edge.to];
            if (!s1 || !s2) return;

            const p1 = this.worldToScreen(s1.x, s1.y);
            const p2 = this.worldToScreen(s2.x, s2.y);

            // Draw road edge line
            ctx.beginPath();
            ctx.strokeStyle = "rgba(56, 189, 248, 0.8)";
            ctx.lineWidth = 2.5;
            ctx.lineCap = "round";
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            // Distance Pill badge in the middle of edge
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const distLabel = `${edge.distance} km`;

            ctx.font = "600 10px Inter, sans-serif";
            const textWidth = ctx.measureText(distLabel).width;
            const badgeW = textWidth + 12;
            const badgeH = 18;

            ctx.fillStyle = "#0f172a";
            ctx.strokeStyle = "#38bdf8";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(midX - badgeW / 2, midY - badgeH / 2, badgeW, badgeH, 6);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "#e0f2fe";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(distLabel, midX, midY);
        });
        ctx.restore();
    },

    drawStopNodes(ctx) {
        ctx.save();
        AppState.stops.forEach(stop => {
            const pos = this.worldToScreen(stop.x, stop.y);
            const isSelected = this.selectedStopId === stop.id;
            const isConnectSource = this.connectSourceId === stop.id;

            // Halo
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, isConnectSource ? 14 : 10, 0, Math.PI * 2);
            ctx.fillStyle = isConnectSource ? "rgba(245, 158, 11, 0.3)" : (isSelected ? "rgba(99, 102, 241, 0.4)" : "rgba(30, 41, 59, 0.9)");
            ctx.fill();
            ctx.lineWidth = isConnectSource || isSelected ? 2.5 : 1.8;
            ctx.strokeStyle = isConnectSource ? "#f59e0b" : (isSelected ? "#818cf8" : "#38bdf8");
            ctx.stroke();

            // Core
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = isConnectSource ? "#f59e0b" : "#38bdf8";
            ctx.fill();

            // Stop ID and Name Label
            ctx.font = "600 11px Inter, sans-serif";
            ctx.fillStyle = "#f8fafc";
            ctx.textAlign = "center";
            ctx.fillText(`${stop.id}: ${stop.name}`, pos.x, pos.y - 14);

            // Details: students & hub connection status
            ctx.font = "500 10px monospace";
            if (stop.is_hub_connected) {
                ctx.fillStyle = "#818cf8";
                ctx.fillText(`${stop.students}p • Direct Hub (${stop.hub_distance}km)`, pos.x, pos.y + 18);
            } else {
                ctx.fillStyle = "#94a3b8";
                ctx.fillText(`${stop.students}p • Via Network`, pos.x, pos.y + 18);
            }
        });
        ctx.restore();
    },

    drawCampusDepot(ctx) {
        const depotX = AppState.constraints.depot_x || 0;
        const depotY = AppState.constraints.depot_y || 0;
        const pos = this.worldToScreen(depotX, depotY);

        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = "#4f46e5";
        ctx.shadowColor = "#6366f1";
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        ctx.font = "700 9px Inter, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("CAMPUS", pos.x, pos.y);

        ctx.shadowBlur = 0;
        ctx.font = "700 11px Inter, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(AppState.constraints.depot_name || "Campus Main Hub", pos.x, pos.y - 20);
        ctx.restore();
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
                    <td colspan="6" class="py-10 text-center text-slate-400">
                        <p class="font-medium text-slate-300">No pickup stops found</p>
                        <p class="text-xs text-slate-500 mt-1">Click "+ Add Pickup Stop" or click on the graph space above to place a stop.</p>
                    </td>
                </tr>
            `;
            return;
        }

        filteredStops.forEach((stop) => {
            const index = AppState.stops.indexOf(stop);
            const connectedEdges = AppState.getEdgesForStop(stop.id);

            const isHubConn = !!stop.is_hub_connected;
            const hubDisplay = isHubConn ? `
                <div class="flex items-center gap-1.5">
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono text-xs font-semibold">
                        <i data-lucide="check" class="w-3 h-3 text-indigo-400"></i>
                        Direct: ${stop.hub_distance || 5.0} km
                    </span>
                    <button type="button" onclick="StopsManager.toggleStopHubConnection(${index})" title="Toggle hub connection" class="text-xs text-slate-500 hover:text-slate-300 p-1">
                        <i data-lucide="edit-2" class="w-3 h-3"></i>
                    </button>
                </div>
            ` : `
                <div class="flex items-center gap-1.5">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 text-xs">
                        Via Network Paths
                    </span>
                    <button type="button" onclick="StopsManager.toggleStopHubConnection(${index})" class="px-2 py-0.5 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-[11px] font-medium text-indigo-300 transition-colors">
                        + Link Hub
                    </button>
                </div>
            `;

            const tr = document.createElement("tr");
            tr.className = `border-b border-slate-800/60 hover:bg-slate-900/40 transition-colors group ${this.selectedStopId === stop.id ? 'bg-indigo-950/20' : ''}`;
            tr.innerHTML = `
                <td class="py-3 px-4">
                    <span class="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-mono text-xs font-semibold uppercase">
                        ${stop.id}
                    </span>
                </td>
                <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                        <input type="text" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-sm text-slate-200 placeholder-slate-500 transition-all"
                            value="${stop.name || ''}" placeholder="Stop location name" onchange="StopsManager.updateStop(${index}, 'name', this.value)">
                    </div>
                </td>
                <td class="py-3 px-4">
                    <div class="flex items-center gap-1.5">
                        <button type="button" onclick="StopsManager.adjustStudents(${index}, -2)" class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold transition-colors">-</button>
                        <input type="number" min="1" max="150" class="w-16 text-center px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-sm text-slate-100 font-semibold transition-all"
                            value="${stop.students || 20}" onchange="StopsManager.updateStop(${index}, 'students', this.value)">
                        <button type="button" onclick="StopsManager.adjustStudents(${index}, 2)" class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold transition-colors">+</button>
                    </div>
                </td>
                <td class="py-3 px-4">
                    ${hubDisplay}
                </td>
                <td class="py-3 px-4">
                    <div class="flex flex-wrap items-center gap-1.5">
                        ${connectedEdges.map(e => {
                            const otherId = e.from === stop.id ? e.to : e.from;
                            return `
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-[11px] font-mono text-sky-300">
                                    <button type="button" onclick="StopsManager.openEdgeModal('${e.from}', '${e.to}', ${e.distance})" class="hover:underline">
                                        ${otherId}: <strong>${e.distance}km</strong>
                                    </button>
                                    <button type="button" onclick="StopsManager.removeEdge('${e.from}', '${e.to}')" title="Disconnect path" class="text-slate-400 hover:text-rose-400 ml-0.5">×</button>
                                </span>
                            `;
                        }).join("")}
                        <button type="button" onclick="StopsManager.openEdgeModal('${stop.id}')" class="px-2 py-0.5 rounded-md bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-[11px] font-medium text-sky-300 transition-colors">
                            + Connect
                        </button>
                    </div>
                </td>
                <td class="py-3 px-4 text-right">
                    <div class="flex items-center justify-end gap-1">
                        <button type="button" onclick="StopsManager.openEditStopModal(${index})" title="Edit Stop Details Card" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                        </button>
                        <button type="button" onclick="StopsManager.removeStop(${index})" title="Delete Stop" class="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        if (window.lucide) window.lucide.createIcons();
        this.updateStopsStats();
        this.renderEdgesList();
    },

    renderEdgesList() {
        const container = document.getElementById("activeEdgesContainer");
        if (!container) return;

        if (AppState.edges.length === 0) {
            container.innerHTML = `<span class="text-xs text-slate-500">No road connections defined yet. Click "Connect Path" or use table "+ Connect".</span>`;
            return;
        }

        container.innerHTML = AppState.edges.map(e => `
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
                <button type="button" onclick="StopsManager.openEdgeModal('${e.from}', '${e.to}', ${e.distance})" class="hover:text-white transition-colors">
                    <span class="text-sky-400 font-semibold">${e.from} ⇄ ${e.to}</span>
                    <span class="text-indigo-300 ml-1">${e.distance} km</span>
                </button>
                <button type="button" onclick="StopsManager.removeEdge('${e.from}', '${e.to}')" title="Delete connection" class="text-slate-500 hover:text-rose-400 font-bold ml-1">×</button>
            </div>
        `).join("");
    },

    // ===============================================
    // CARD MODAL HANDLERS: STOP ADD & EDIT
    // ===============================================
    openAddStopModal(defaultX = null, defaultY = null) {
        const modal = document.getElementById("modalStopCard");
        if (!modal) return;

        document.getElementById("modalStopCardTitle").textContent = "Add Pickup Stop";
        document.getElementById("cardStopEditIndex").value = "-1";

        const nextIdx = AppState.stops.length + 1;
        document.getElementById("cardStopId").value = `S${nextIdx}`;
        document.getElementById("cardStopName").value = `Pickup Point ${nextIdx}`;
        document.getElementById("cardStopStudents").value = "20";

        const x = defaultX !== null ? defaultX : Math.round((Math.random() * 8 - 4) * 10) / 10;
        const y = defaultY !== null ? defaultY : Math.round((Math.random() * 8 - 4) * 10) / 10;
        document.getElementById("cardStopX").value = x;
        document.getElementById("cardStopY").value = y;

        // Default hub connection: checked if close, otherwise unchecked
        const approxDist = Math.round(Math.hypot(x, y) * 10) / 10;
        const isClose = approxDist <= 6.0;
        const hubCheck = document.getElementById("cardStopHubConnected");
        if (hubCheck) {
            hubCheck.checked = isClose;
            this.toggleCardHubInput(isClose);
        }
        document.getElementById("cardStopHubDistance").value = approxDist;

        modal.classList.remove("hidden");
        if (window.lucide) window.lucide.createIcons();
    },

    openEditStopModal(index) {
        const stop = AppState.stops[index];
        if (!stop) return;

        const modal = document.getElementById("modalStopCard");
        if (!modal) return;

        document.getElementById("modalStopCardTitle").textContent = `Edit Stop: ${stop.name}`;
        document.getElementById("cardStopEditIndex").value = index;

        document.getElementById("cardStopId").value = stop.id;
        document.getElementById("cardStopName").value = stop.name;
        document.getElementById("cardStopStudents").value = stop.students;
        document.getElementById("cardStopX").value = stop.x;
        document.getElementById("cardStopY").value = stop.y;

        const isConnected = !!stop.is_hub_connected;
        const hubCheck = document.getElementById("cardStopHubConnected");
        if (hubCheck) {
            hubCheck.checked = isConnected;
            this.toggleCardHubInput(isConnected);
        }
        document.getElementById("cardStopHubDistance").value = stop.hub_distance || Math.round(Math.hypot(stop.x, stop.y) * 10) / 10;

        modal.classList.remove("hidden");
        if (window.lucide) window.lucide.createIcons();
    },

    closeStopModal() {
        const modal = document.getElementById("modalStopCard");
        if (modal) modal.classList.add("hidden");
    },

    toggleCardHubInput(isChecked) {
        const container = document.getElementById("cardStopHubDistanceContainer");
        const notice = document.getElementById("cardStopHubNotice");
        if (container) {
            if (isChecked) {
                container.classList.remove("hidden");
                if (notice) notice.textContent = "Direct transit link connecting this stop directly to the campus hub.";
            } else {
                container.classList.add("hidden");
                if (notice) notice.textContent = "Stop has no direct link to the hub. It reaches the campus through connected road network paths.";
            }
        }
    },

    saveStopFromModal() {
        const editIndex = parseInt(document.getElementById("cardStopEditIndex").value);
        const sid = document.getElementById("cardStopId").value.trim().toUpperCase();
        const name = document.getElementById("cardStopName").value.trim();
        const students = Math.max(1, parseInt(document.getElementById("cardStopStudents").value) || 20);
        const x = parseFloat(document.getElementById("cardStopX").value) || 0;
        const y = parseFloat(document.getElementById("cardStopY").value) || 0;
        const isHubConnected = document.getElementById("cardStopHubConnected").checked;
        const hubDistance = isHubConnected ? (parseFloat(document.getElementById("cardStopHubDistance").value) || Math.round(Math.hypot(x, y) * 10) / 10) : null;

        if (!name) return;

        if (editIndex >= 0 && AppState.stops[editIndex]) {
            // Update existing stop
            const stop = AppState.stops[editIndex];
            stop.id = sid;
            stop.name = name;
            stop.students = students;
            stop.x = x;
            stop.y = y;
            stop.is_hub_connected = isHubConnected;
            stop.hub_distance = hubDistance;
            if (window.showToast) showToast(`Updated stop ${stop.name}`, "success");
        } else {
            // Add new stop
            const newStop = {
                id: sid,
                name: name,
                students: students,
                x: x,
                y: y,
                is_hub_connected: isHubConnected,
                hub_distance: hubDistance
            };
            AppState.stops.push(newStop);
            if (window.showToast) showToast(`Added stop ${newStop.id}: ${newStop.name}`, "success");
        }

        AppState.saveToStorage();
        this.closeStopModal();
        this.renderStopsTable();
        this.renderGraph();
    },

    toggleStopHubConnection(index) {
        const stop = AppState.stops[index];
        if (!stop) return;
        stop.is_hub_connected = !stop.is_hub_connected;
        if (stop.is_hub_connected && (!stop.hub_distance || stop.hub_distance <= 0)) {
            stop.hub_distance = Math.round(Math.hypot(stop.x, stop.y) * 10) / 10;
        }
        AppState.saveToStorage();
        this.renderStopsTable();
        this.renderGraph();
        if (window.showToast) {
            showToast(stop.is_hub_connected ? `${stop.name} directly linked to Hub (${stop.hub_distance} km)` : `${stop.name} unlinked from direct Hub path`, "info");
        }
    },

    // ===============================================
    // CARD MODAL HANDLERS: ROAD PATH (EDGE) ADD & EDIT
    // ===============================================
    openEdgeModal(preFromId = null, preToId = null, existingDistance = null) {
        const modal = document.getElementById("modalEdgeCard");
        if (!modal) return;

        const selectFrom = document.getElementById("cardEdgeFrom");
        const selectTo = document.getElementById("cardEdgeTo");
        const inputDist = document.getElementById("cardEdgeDistance");
        const btnDelete = document.getElementById("btnDeleteEdgeFromModal");

        // Populate options with stops
        const stopOptions = AppState.stops.map(s => `<option value="${s.id}">${s.id}: ${s.name}</option>`).join("");
        selectFrom.innerHTML = stopOptions;
        selectTo.innerHTML = stopOptions;

        if (preFromId) selectFrom.value = preFromId;
        if (preToId) selectTo.value = preToId;
        else if (AppState.stops.length > 1) {
            const other = AppState.stops.find(s => s.id !== preFromId);
            if (other) selectTo.value = other.id;
        }

        let defaultDist = 4.0;
        if (existingDistance !== null) {
            defaultDist = existingDistance;
            if (btnDelete) btnDelete.classList.remove("hidden");
        } else {
            if (btnDelete) btnDelete.classList.add("hidden");
            const s1 = AppState.stops.find(s => s.id === selectFrom.value);
            const s2 = AppState.stops.find(s => s.id === selectTo.value);
            if (s1 && s2) {
                defaultDist = Math.round(Math.hypot(s2.x - s1.x, s2.y - s1.y) * 1.15 * 10) / 10;
            }
        }
        inputDist.value = defaultDist;

        modal.classList.remove("hidden");
        if (window.lucide) window.lucide.createIcons();
    },

    closeEdgeModal() {
        const modal = document.getElementById("modalEdgeCard");
        if (modal) modal.classList.add("hidden");
    },

    saveEdgeFromModal() {
        const from = document.getElementById("cardEdgeFrom").value;
        const to = document.getElementById("cardEdgeTo").value;
        const dist = parseFloat(document.getElementById("cardEdgeDistance").value);

        if (!from || !to || from === to) {
            if (window.showToast) showToast("Please select two distinct stops to connect.", "error");
            return;
        }
        if (!dist || dist <= 0) {
            if (window.showToast) showToast("Please enter a valid road distance in km.", "error");
            return;
        }

        AppState.addEdge(from, to, dist);
        this.closeEdgeModal();
        this.renderStopsTable();
        this.renderGraph();
        if (window.showToast) showToast(`Saved road path: ${from} ⇄ ${to} (${dist} km)`, "success");
    },

    deleteCurrentEdgeFromModal() {
        const from = document.getElementById("cardEdgeFrom").value;
        const to = document.getElementById("cardEdgeTo").value;
        AppState.removeEdge(from, to);
        this.closeEdgeModal();
        this.renderStopsTable();
        this.renderGraph();
        if (window.showToast) showToast(`Deleted road path: ${from} ⇄ ${to}`, "info");
    },

    removeEdge(from, to) {
        AppState.removeEdge(from, to);
        this.renderStopsTable();
        this.renderGraph();
        if (window.showToast) showToast(`Disconnected path ${from} ⇄ ${to}`, "info");
    },

    adjustStudents(index, delta) {
        if (!AppState.stops[index]) return;
        const current = Number(AppState.stops[index].students) || 0;
        AppState.stops[index].students = Math.max(1, current + delta);
        AppState.saveToStorage();
        this.renderStopsTable();
        this.renderGraph();
    },

    removeStop(index) {
        const removed = AppState.stops.splice(index, 1);
        if (removed.length) {
            const rid = removed[0].id;
            AppState.edges = AppState.edges.filter(e => e.from !== rid && e.to !== rid);
            AppState.saveToStorage();
            this.renderStopsTable();
            this.renderGraph();
            if (window.showToast) showToast(`Removed stop ${removed[0].name}`, "info");
        }
    },

    updateStop(index, field, value) {
        if (!AppState.stops[index]) return;
        if (field === "students") {
            AppState.stops[index][field] = Math.max(1, parseInt(value) || 1);
        } else {
            AppState.stops[index][field] = value.trim();
        }
        AppState.saveToStorage();
        this.updateStopsStats();
        this.renderGraph();
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
