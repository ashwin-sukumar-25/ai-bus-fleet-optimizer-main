/**
 * State Management & Data Presets for AI Bus Fleet Optimizer
 */
const AppState = {
    buses: [
        { id: "B1", name: "Titan Express (EV)", capacity: 55, fuel_type: "Electric", driver: "Rajesh Kumar" },
        { id: "B2", name: "Apex Cruiser (CNG)", capacity: 50, fuel_type: "CNG", driver: "Kavitha Murugan" },
        { id: "B3", name: "Sahyadri Link", capacity: 45, fuel_type: "Diesel", driver: "Senthil Nathan" },
        { id: "B4", name: "Kovai Shuttle", capacity: 50, fuel_type: "Diesel", driver: "Vigneshwaran M" },
        { id: "B5", name: "Airport Feeder", capacity: 40, fuel_type: "CNG", driver: "Anand Mohan" }
    ],
    stops: [
        { id: "S1", name: "Gandhipuram Central", students: 28, x: 4.2, y: 3.8 },
        { id: "S2", name: "Peelamedu Signal", students: 24, x: 8.0, y: 2.5 },
        { id: "S3", name: "Singanallur Bus Stand", students: 22, x: 7.1, y: -2.3 },
        { id: "S4", name: "Saibaba Colony Junction", students: 26, x: 2.5, y: 5.2 },
        { id: "S5", name: "RS Puram Post Office", students: 19, x: 1.2, y: 3.9 },
        { id: "S6", name: "Ukkadam Lake Road", students: 21, x: 2.0, y: -3.5 },
        { id: "S7", name: "Sundarapuram Junction", students: 18, x: 3.2, y: -6.1 },
        { id: "S8", name: "Saravanampatti Tech Park", students: 25, x: 6.5, y: 8.0 },
        { id: "S9", name: "Ganapathy Bus Stop", students: 20, x: 4.8, y: 5.7 },
        { id: "S10", name: "Hopes College Station", students: 15, x: 8.9, y: 1.4 }
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
        depot_x: 0,
        depot_y: 0,
        algorithm: "2opt",
        allocation_mode: "proximity"
    },
    results: null,
    activeTab: "fleet",
    unlockedSteps: new Set([1, 2, 3]),
    filterRouteBusId: "all",
    serverPresets: {},

    saveToStorage() {
        try {
            const data = {
                buses: this.buses,
                stops: this.stops,
                constraints: this.constraints
            };
            localStorage.setItem("optifleet_state_v2", JSON.stringify(data));
        } catch (e) {
            console.warn("Storage save error", e);
        }
    },

    loadFromStorage() {
        try {
            const cached = localStorage.getItem("optifleet_state_v2");
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed.buses) && parsed.buses.length) this.buses = parsed.buses;
                if (Array.isArray(parsed.stops) && parsed.stops.length) this.stops = parsed.stops;
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

    setPreset(presetData) {
        if (!presetData) return;
        this.buses = JSON.parse(JSON.stringify(presetData.buses || []));
        this.stops = JSON.parse(JSON.stringify(presetData.stops || []));
        if (presetData.constraints) {
            this.constraints = { ...this.constraints, ...presetData.constraints };
        }
        if (presetData.depot) {
            this.constraints.depot_name = presetData.depot.name || this.constraints.depot_name;
            this.constraints.depot_x = presetData.depot.x ?? 0;
            this.constraints.depot_y = presetData.depot.y ?? 0;
        }
        this.results = null;
        this.saveToStorage();
    }
};

window.AppState = AppState;
