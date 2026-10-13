/**
 * State Management & Data Layer for OptiFleet
 */
const AppState = {
    buses: [
        { id: "B1", name: "Titan Express", capacity: 55, fuel_type: "Electric", driver: "Rajesh Kumar" },
        { id: "B2", name: "Apex Cruiser", capacity: 50, fuel_type: "CNG", driver: "Kavitha Murugan" },
        { id: "B3", name: "Sahyadri Link", capacity: 45, fuel_type: "Diesel", driver: "Senthil Nathan" },
        { id: "B4", name: "Kovai Shuttle", capacity: 50, fuel_type: "Diesel", driver: "Vigneshwaran M" },
        { id: "B5", name: "Airport Feeder", capacity: 40, fuel_type: "CNG", driver: "Anand Mohan" }
    ],
    stops: [
        { id: "S1", name: "Gandhipuram Central", students: 28, x: 4.2, y: 3.8, hub_distance: 5.7, is_hub_connected: true },
        { id: "S2", name: "Peelamedu Signal", students: 24, x: 8.0, y: 2.5, hub_distance: null, is_hub_connected: false },
        { id: "S3", name: "Singanallur Stand", students: 22, x: 7.1, y: -2.3, hub_distance: null, is_hub_connected: false },
        { id: "S4", name: "Saibaba Colony", students: 26, x: 2.5, y: 5.2, hub_distance: null, is_hub_connected: false },
        { id: "S5", name: "RS Puram Post Office", students: 19, x: 1.2, y: 3.9, hub_distance: 4.1, is_hub_connected: true },
        { id: "S6", name: "Ukkadam Lake Road", students: 21, x: 2.0, y: -3.5, hub_distance: 4.0, is_hub_connected: true },
        { id: "S7", name: "Sundarapuram Junction", students: 18, x: 3.2, y: -6.1, hub_distance: 6.9, is_hub_connected: true },
        { id: "S8", name: "Saravanampatti Tech", students: 25, x: 6.5, y: 8.0, hub_distance: null, is_hub_connected: false }
    ],
    edges: [
        { from: "S1", to: "S2", distance: 4.2 },
        { from: "S1", to: "S4", distance: 2.8 },
        { from: "S1", to: "S5", distance: 3.1 },
        { from: "S2", to: "S3", distance: 5.0 },
        { from: "S2", to: "S8", distance: 6.1 },
        { from: "S4", to: "S5", distance: 2.4 },
        { from: "S5", to: "S6", distance: 3.6 },
        { from: "S6", to: "S7", distance: 4.0 },
        { from: "S3", to: "S7", distance: 6.5 },
        { from: "S4", to: "S8", distance: 7.2 }
    ],
    constraints: {
        max_bus_occupancy: 55,
        average_speed: 32,
        fuel_price: 96.5,
        fuel_efficiency: 4.5,
        traffic_congestion: 1.15,
        dwell_time: 1.5,
        departure_time: "07:15",
        depot_name: "CIT Main Campus",
        depot_x: 0.0,
        depot_y: 0.0
    },
    results: null,
    activeTab: "fleet",
    unlockedSteps: new Set([1, 2, 3]),
    filterRouteBusId: "all",

    saveToStorage() {
        try {
            const data = {
                buses: this.buses,
                stops: this.stops,
                edges: this.edges,
                constraints: this.constraints
            };
            localStorage.setItem("optifleet_v3_state", JSON.stringify(data));
        } catch (e) {
            console.warn("Storage save error", e);
        }
    },

    loadFromStorage() {
        try {
            const cached = localStorage.getItem("optifleet_v3_state");
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed.buses) && parsed.buses.length) this.buses = parsed.buses;
                if (Array.isArray(parsed.stops) && parsed.stops.length) this.stops = parsed.stops;
                if (Array.isArray(parsed.edges)) this.edges = parsed.edges;
                if (parsed.constraints) this.constraints = { ...this.constraints, ...parsed.constraints };
            }
        } catch (e) {
            console.warn("Storage load error", e);
        }
    },

    getTotalCapacity() {
        return this.buses.reduce((acc, b) => acc + (Number(b.capacity) || 0), 0);
    },

    getTotalStudents() {
        return this.stops.reduce((acc, s) => acc + (Number(s.students) || 0), 0);
    },

    addEdge(from, to, distance) {
        if (!from || !to || from === to) return false;
        // Check if edge already exists in either direction
        const existingIdx = this.edges.findIndex(e => 
            (e.from === from && e.to === to) || (e.from === to && e.to === from)
        );
        const distNum = Math.max(0.1, parseFloat(distance) || 1.0);
        if (existingIdx >= 0) {
            this.edges[existingIdx].distance = distNum;
        } else {
            this.edges.push({ from, to, distance: distNum });
        }
        this.saveToStorage();
        return true;
    },

    removeEdge(from, to) {
        this.edges = this.edges.filter(e => 
            !((e.from === from && e.to === to) || (e.from === to && e.to === from))
        );
        this.saveToStorage();
    },

    getEdgesForStop(stopId) {
        return this.edges.filter(e => e.from === stopId || e.to === stopId);
    },

    resetToDefaultDemo(data) {
        if (!data) return;
        this.buses = JSON.parse(JSON.stringify(data.buses || []));
        this.stops = JSON.parse(JSON.stringify(data.stops || []));
        this.edges = JSON.parse(JSON.stringify(data.edges || []));
        if (data.constraints) {
            this.constraints = { ...this.constraints, ...data.constraints };
        }
        this.results = null;
        this.saveToStorage();
    }
};

window.AppState = AppState;
