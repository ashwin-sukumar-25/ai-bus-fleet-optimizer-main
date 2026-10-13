/**
 * Sequential Tab and Stepper Controller
 */
const TabManager = {
    steps: [
        { id: "fleet", stepNum: 1, label: "Fleet Vehicles", shortDesc: "Configure buses & capacities" },
        { id: "stops", stepNum: 2, label: "Pickup Stops", shortDesc: "Define demand & coordinates" },
        { id: "constraints", stepNum: 3, label: "Routing Policies", shortDesc: "Speed, fuel & AI constraints" },
        { id: "dispatch", stepNum: 4, label: "Dispatch Manifest", shortDesc: "AI itinerary & bus assignments" },
        { id: "map", stepNum: 5, label: "Interactive Fleet Map", shortDesc: "Visual 2D routing & simulation" },
        { id: "analytics", stepNum: 6, label: "Fleet Telemetry", shortDesc: "Cost, occupancy & sustainability" }
    ],

    currentTab: "fleet",

    init() {
        this.bindEvents();
        this.updateStepperUI();
    },

    bindEvents() {
        document.querySelectorAll("[data-tab-target]").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                const target = btn.getAttribute("data-tab-target");
                this.switchTab(target);
            });
        });
    },

    switchTab(tabId) {
        const stepObj = this.steps.find(s => s.id === tabId);
        if (!stepObj) return;

        // If user tries to jump to results tabs before optimizing, inform them
        if ((tabId === "dispatch" || tabId === "map" || tabId === "analytics") && !AppState.results) {
            if (window.showToast) {
                showToast("Please run the AI optimizer first to view routes and telemetry.", "info");
            }
            // If they are on step 1 or 2, proceed to constraints
            if (this.currentTab === "fleet" || this.currentTab === "stops") {
                this.switchTab("constraints");
                return;
            }
        }

        this.currentTab = tabId;
        AppState.activeTab = tabId;
        AppState.unlockedSteps.add(stepObj.stepNum);

        // Hide all tab panels
        document.querySelectorAll(".tab-panel").forEach(panel => {
            panel.classList.add("hidden");
        });

        // Show active panel
        const activePanel = document.getElementById(`panel-${tabId}`);
        if (activePanel) {
            activePanel.classList.remove("hidden");
        }

        this.updateStepperUI();

        // Trigger tab-specific component callbacks
        if (tabId === "map" && window.FleetMap) {
            setTimeout(() => window.FleetMap.resizeAndRender(), 50);
        }
        if (tabId === "analytics" && window.AnalyticsDashboard) {
            setTimeout(() => window.AnalyticsDashboard.render(), 50);
        }
        if (tabId === "dispatch" && window.OptimizerView) {
            window.OptimizerView.render();
        }

        // Re-hydrate Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: "smooth" });
    },

    nextStep() {
        const currentIndex = this.steps.findIndex(s => s.id === this.currentTab);
        if (currentIndex < 0) return;

        // Validation for each step
        if (this.currentTab === "fleet") {
            const buses = window.FleetManager ? window.FleetManager.getBusesFromUI() : AppState.buses;
            if (!buses.length) {
                if (window.showToast) showToast("Please add at least one bus to proceed.", "error");
                return;
            }
        } else if (this.currentTab === "stops") {
            const stops = window.StopsManager ? window.StopsManager.getStopsFromUI() : AppState.stops;
            if (!stops.length) {
                if (window.showToast) showToast("Please add at least one pickup stop to proceed.", "error");
                return;
            }
        } else if (this.currentTab === "constraints") {
            // Trigger optimization
            if (window.runOptimization) {
                window.runOptimization();
            }
            return;
        }

        if (currentIndex < this.steps.length - 1) {
            const nextTab = this.steps[currentIndex + 1].id;
            this.switchTab(nextTab);
        }
    },

    prevStep() {
        const currentIndex = this.steps.findIndex(s => s.id === this.currentTab);
        if (currentIndex > 0) {
            const prevTab = this.steps[currentIndex - 1].id;
            this.switchTab(prevTab);
        }
    },

    updateStepperUI() {
        const currentStepObj = this.steps.find(s => s.id === this.currentTab);
        const currentNum = currentStepObj ? currentStepObj.stepNum : 1;

        this.steps.forEach(step => {
            const btn = document.querySelector(`[data-tab-target="${step.id}"]`);
            if (!btn) return;

            const isCurrent = step.id === this.currentTab;
            const isCompleted = step.stepNum < currentNum || (AppState.results && step.stepNum <= 3);

            // Styling state classes
            if (isCurrent) {
                btn.className = "step-item group flex items-center gap-3 px-4 py-2.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 text-white font-medium transition-all shadow-md shadow-indigo-950/40";
                const badge = btn.querySelector(".step-badge");
                if (badge) badge.className = "step-badge flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-bold shadow-inner";
            } else if (isCompleted) {
                btn.className = "step-item group flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:border-slate-700 transition-all cursor-pointer";
                const badge = btn.querySelector(".step-badge");
                if (badge) badge.className = "step-badge flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold";
            } else {
                btn.className = "step-item group flex items-center gap-3 px-4 py-2.5 rounded-xl border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 transition-all cursor-pointer";
                const badge = btn.querySelector(".step-badge");
                if (badge) badge.className = "step-badge flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800 text-slate-400 text-xs font-medium";
            }
        });
    }
};

window.TabManager = TabManager;
