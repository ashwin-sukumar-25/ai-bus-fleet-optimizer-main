from flask import Flask, render_template, request, jsonify
from optimizer import optimize_fleet

app = Flask(__name__)

# Pre-packaged realistic industry scenarios for instant demo loading
PRESETS = {
    "coimbatore": {
        "name": "Coimbatore Tech Campus (Standard)",
        "description": "5 buses serving key Coimbatore arterial transit hubs with balanced passenger loads.",
        "depot": {"name": "CIT Main Campus", "x": 0, "y": 0},
        "constraints": {
            "max_bus_occupancy": 55,
            "average_speed": 32,
            "fuel_price": 96.5,
            "fuel_efficiency": 4.5,
            "traffic_congestion": 1.15,
            "dwell_time": 1.5,
            "departure_time": "07:15",
            "algorithm": "2opt",
            "allocation_mode": "proximity"
        },
        "buses": [
            {"id": "B1", "name": "Titan Express (EV)", "capacity": 55, "fuel_type": "Electric", "driver": "Rajesh Kumar"},
            {"id": "B2", "name": "Apex Cruiser (CNG)", "capacity": 50, "fuel_type": "CNG", "driver": "Kavitha Murugan"},
            {"id": "B3", "name": "Sahyadri Link", "capacity": 45, "fuel_type": "Diesel", "driver": "Senthil Nathan"},
            {"id": "B4", "name": "Kovai Shuttle", "capacity": 50, "fuel_type": "Diesel", "driver": "Vigneshwaran M"},
            {"id": "B5", "name": "Airport Feeder", "capacity": 40, "fuel_type": "CNG", "driver": "Anand Mohan"}
        ],
        "stops": [
            {"id": "S1", "name": "Gandhipuram Central", "students": 28, "x": 4.2, "y": 3.8},
            {"id": "S2", "name": "Peelamedu Signal", "students": 24, "x": 8.0, "y": 2.5},
            {"id": "S3", "name": "Singanallur Bus Stand", "students": 22, "x": 7.1, "y": -2.3},
            {"id": "S4", "name": "Saibaba Colony Junction", "students": 26, "x": 2.5, "y": 5.2},
            {"id": "S5", "name": "RS Puram Post Office", "students": 19, "x": 1.2, "y": 3.9},
            {"id": "S6", "name": "Ukkadam Lake Road", "students": 21, "x": 2.0, "y": -3.5},
            {"id": "S7", "name": "Sundarapuram Junction", "students": 18, "x": 3.2, "y": -6.1},
            {"id": "S8", "name": "Saravanampatti Tech Park", "students": 25, "x": 6.5, "y": 8.0},
            {"id": "S9", "name": "Ganapathy Bus Stop", "students": 20, "x": 4.8, "y": 5.7},
            {"id": "S10", "name": "Hopes College Station", "students": 15, "x": 8.9, "y": 1.4}
        ]
    },
    "morning_peak": {
        "name": "Metro High-Density Morning Peak",
        "description": "High volume student transit across dense urban corridors with maximum capacity constraints.",
        "depot": {"name": "Central Engineering Depot", "x": 0, "y": 0},
        "constraints": {
            "max_bus_occupancy": 60,
            "average_speed": 28,
            "fuel_price": 98.0,
            "fuel_efficiency": 4.0,
            "traffic_congestion": 1.25,
            "dwell_time": 2.0,
            "departure_time": "07:00",
            "algorithm": "2opt",
            "allocation_mode": "proximity"
        },
        "buses": [
            {"id": "B101", "name": "Volvo Double-Axle A1", "capacity": 65, "fuel_type": "Diesel", "driver": "R. Selvam"},
            {"id": "B102", "name": "Volvo Double-Axle A2", "capacity": 65, "fuel_type": "Diesel", "driver": "M. Karthik"},
            {"id": "B103", "name": "Tata Starbus EV", "capacity": 55, "fuel_type": "Electric", "driver": "P. Divya"},
            {"id": "B104", "name": "Ashok Leyland CNG", "capacity": 50, "fuel_type": "CNG", "driver": "K. Balaji"},
            {"id": "B105", "name": "Eicher Skyline Pro", "capacity": 45, "fuel_type": "Diesel", "driver": "S. Prakash"}
        ],
        "stops": [
            {"id": "M1", "name": "North Metro Terminal", "students": 32, "x": 3.0, "y": 9.0},
            {"id": "M2", "name": "Civic Center Cross", "students": 28, "x": 1.5, "y": 6.5},
            {"id": "M3", "name": "University Circle", "students": 35, "x": -2.0, "y": 5.0},
            {"id": "M4", "name": "West End Mall", "students": 24, "x": -5.5, "y": 2.0},
            {"id": "M5", "name": "South Gate Interchange", "students": 30, "x": -3.0, "y": -4.5},
            {"id": "M6", "name": "Industrial Hub Sector 4", "students": 22, "x": 1.0, "y": -6.0},
            {"id": "M7", "name": "East Coast Highway Point", "students": 38, "x": 7.0, "y": -1.0},
            {"id": "M8", "name": "Silicon Boulevard", "students": 29, "x": 6.0, "y": 4.5}
        ]
    },
    "rural_sparse": {
        "name": "Suburban & Rural Extended Transit",
        "description": "Long distance commuter routes connecting outlying towns and rural pickup waypoints.",
        "depot": {"name": "Hill Campus Depot", "x": 0, "y": 0},
        "constraints": {
            "max_bus_occupancy": 50,
            "average_speed": 42,
            "fuel_price": 95.0,
            "fuel_efficiency": 5.0,
            "traffic_congestion": 1.05,
            "dwell_time": 1.0,
            "departure_time": "06:45",
            "algorithm": "2opt",
            "allocation_mode": "proximity"
        },
        "buses": [
            {"id": "R1", "name": "Highland Cruiser 1", "capacity": 50, "fuel_type": "Diesel", "driver": "G. Manickam"},
            {"id": "R2", "name": "Highland Cruiser 2", "capacity": 50, "fuel_type": "Diesel", "driver": "A. Joseph"},
            {"id": "R3", "name": "Valley Transit 3", "capacity": 40, "fuel_type": "Diesel", "driver": "V. Subramanian"}
        ],
        "stops": [
            {"id": "R10", "name": "Pollachi Bypass Toll", "students": 22, "x": 12.0, "y": -14.0},
            {"id": "R11", "name": "Kinathukadavu Market", "students": 18, "x": 8.0, "y": -9.0},
            {"id": "R12", "name": "Mettupalayam Gate", "students": 26, "x": -7.0, "y": 15.0},
            {"id": "R13", "name": "Karamadai Railway Cross", "students": 20, "x": -5.0, "y": 10.0},
            {"id": "R14", "name": "Sulur Airforce Station", "students": 24, "x": 14.0, "y": 2.0}
        ]
    }
}

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/optimize", methods=["POST"])
def optimize():
    try:
        data = request.get_json(silent=True) or {}
        buses = data.get("buses", [])
        stops = data.get("stops", [])
        constraints = data.get("constraints", {})

        if not buses:
            return jsonify({"success": False, "error": "Please configure at least one bus in your fleet."}), 400
        if not stops:
            return jsonify({"success": False, "error": "Please add at least one pickup stop to schedule."}), 400

        result = optimize_fleet(buses, stops, constraints)
        return jsonify({"success": True, "result": result})
    except Exception as e:
        return jsonify({"success": False, "error": f"Optimization engine error: {str(e)}"}), 500

@app.route("/api/presets", methods=["GET"])
def get_presets():
    return jsonify({"success": True, "presets": PRESETS})

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "online", "version": "2.4.0", "ai_engine": "active"})

if __name__ == "__main__":
    app.run(debug=True)
