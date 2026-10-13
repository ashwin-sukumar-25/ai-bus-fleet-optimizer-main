from flask import Flask, render_template, request, jsonify
from optimizer import optimize_fleet

app = Flask(__name__)

# Standard demo fleet and route network configuration
DEFAULT_DEMO_DATA = {
    "depot": {"name": "CIT Main Campus", "x": 0.0, "y": 0.0},
    "constraints": {
        "max_bus_occupancy": 55,
        "average_speed": 32,
        "fuel_price": 96.5,
        "fuel_efficiency": 4.5,
        "traffic_congestion": 1.15,
        "dwell_time": 1.5,
        "departure_time": "07:15",
        "depot_name": "CIT Main Campus",
        "depot_x": 0.0,
        "depot_y": 0.0
    },
    "buses": [
        {"id": "B1", "name": "Titan Express (EV)", "capacity": 55, "fuel_type": "Electric", "driver": "Rajesh Kumar"},
        {"id": "B2", "name": "Apex Cruiser (CNG)", "capacity": 50, "fuel_type": "CNG", "driver": "Kavitha Murugan"},
        {"id": "B3", "name": "Sahyadri Link", "capacity": 45, "fuel_type": "Diesel", "driver": "Senthil Nathan"},
        {"id": "B4", "name": "Kovai Shuttle", "capacity": 50, "fuel_type": "Diesel", "driver": "Vigneshwaran M"},
        {"id": "B5", "name": "Airport Feeder", "capacity": 40, "fuel_type": "CNG", "driver": "Anand Mohan"}
    ],
    "stops": [
        {"id": "S1", "name": "Gandhipuram Central", "students": 28, "x": 4.2, "y": 3.8, "hub_distance": 5.7, "is_hub_connected": True},
        {"id": "S2", "name": "Peelamedu Signal", "students": 24, "x": 8.0, "y": 2.5, "hub_distance": None, "is_hub_connected": False},
        {"id": "S3", "name": "Singanallur Bus Stand", "students": 22, "x": 7.1, "y": -2.3, "hub_distance": None, "is_hub_connected": False},
        {"id": "S4", "name": "Saibaba Colony", "students": 26, "x": 2.5, "y": 5.2, "hub_distance": None, "is_hub_connected": False},
        {"id": "S5", "name": "RS Puram Post Office", "students": 19, "x": 1.2, "y": 3.9, "hub_distance": 4.1, "is_hub_connected": True},
        {"id": "S6", "name": "Ukkadam Lake Road", "students": 21, "x": 2.0, "y": -3.5, "hub_distance": 4.0, "is_hub_connected": True},
        {"id": "S7", "name": "Sundarapuram Junction", "students": 18, "x": 3.2, "y": -6.1, "hub_distance": 6.9, "is_hub_connected": True},
        {"id": "S8", "name": "Saravanampatti Tech", "students": 25, "x": 6.5, "y": 8.0, "hub_distance": None, "is_hub_connected": False}
    ],
    "edges": [
        {"from": "S1", "to": "S2", "distance": 4.2},
        {"from": "S1", "to": "S4", "distance": 2.8},
        {"from": "S1", "to": "S5", "distance": 3.1},
        {"from": "S2", "to": "S3", "distance": 5.0},
        {"from": "S2", "to": "S8", "distance": 6.1},
        {"from": "S4", "to": "S5", "distance": 2.4},
        {"from": "S5", "to": "S6", "distance": 3.6},
        {"from": "S6", "to": "S7", "distance": 4.0},
        {"from": "S3", "to": "S7", "distance": 6.5},
        {"from": "S4", "to": "S8", "distance": 7.2}
    ]
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
        edges = data.get("edges", [])
        constraints = data.get("constraints", {})

        if not buses:
            return jsonify({"success": False, "error": "Please configure at least one bus in your fleet."}), 400
        if not stops:
            return jsonify({"success": False, "error": "Please add at least one pickup stop to schedule."}), 400

        result = optimize_fleet(buses, stops, constraints=constraints, edges=edges)
        return jsonify({"success": True, "result": result})
    except Exception as e:
        return jsonify({"success": False, "error": f"Optimization engine error: {str(e)}"}), 500

@app.route("/api/default-demo", methods=["GET"])
def get_default_demo():
    return jsonify({"success": True, "data": DEFAULT_DEMO_DATA})

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "online", "service": "optifleet"})

if __name__ == "__main__":
    app.run(debug=True)
