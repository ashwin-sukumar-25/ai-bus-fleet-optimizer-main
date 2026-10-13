import math
from datetime import datetime, timedelta

def distance(point1, point2):
    """Calculate Euclidean distance between two coordinate points."""
    x1, y1 = float(point1.get("x", 0)), float(point1.get("y", 0))
    x2, y2 = float(point2.get("x", 0)), float(point2.get("y", 0))
    return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

def calculate_route_distance(route):
    """Calculate total travel distance across consecutive waypoints in a route."""
    if len(route) < 2:
        return 0.0
    return round(sum(distance(route[i], route[i + 1]) for i in range(len(route) - 1)), 2)

def two_opt_swap(route, i, k):
    """Reverses the sub-route segment between index i and k (2-Opt move)."""
    return route[:i] + route[i:k + 1][::-1] + route[k + 1:]

def apply_two_opt(route):
    """
    Applies the 2-Opt local search heuristic to optimize a route by
    removing crossing edges. Preserves fixed start and end depot.
    """
    if len(route) <= 3:
        return route

    best_route = list(route)
    improved = True
    max_iterations = 50
    iteration = 0

    while improved and iteration < max_iterations:
        improved = False
        iteration += 1
        best_dist = calculate_route_distance(best_route)

        for i in range(1, len(best_route) - 2):
            for k in range(i + 1, len(best_route) - 1):
                new_route = two_opt_swap(best_route, i, k)
                new_dist = calculate_route_distance(new_route)

                if new_dist < best_dist - 0.001:
                    best_route = new_route
                    best_dist = new_dist
                    improved = True
                    break
            if improved:
                break

    return best_route

def optimize_route(college, assigned_stops, algorithm="2opt"):
    """
    Constructs an optimized route starting and ending at the college depot.
    Uses Greedy Nearest Neighbor as the initial tour, then enhances with 2-Opt.
    """
    if not assigned_stops:
        return [college]

    remaining = assigned_stops.copy()
    route = [college]
    current = college

    # Nearest Neighbor tour generation
    while remaining:
        nearest = min(remaining, key=lambda stop: distance(current, stop))
        route.append(nearest)
        current = nearest
        remaining.remove(nearest)

    route.append(college)

    # Apply 2-Opt heuristic if requested or default
    if algorithm in ("2opt", "clarke_wright", "advanced"):
        route = apply_two_opt(route)

    return route

def allocate_buses(buses, stops, constraints):
    """
    Allocates stops to buses using cluster-aware seed bin packing.
    Groups geographically adjacent stops into the same bus to minimize route detours.
    """
    # Sort buses largest capacity first
    sorted_buses = sorted(buses, key=lambda b: int(b.get("capacity", 50)), reverse=True)
    unassigned_stops = list(stops)
    allocations = [{"bus": bus, "stops": [], "students": 0} for bus in sorted_buses]
    college_depot = {
        "x": float(constraints.get("depot_x", 0)),
        "y": float(constraints.get("depot_y", 0))
    }

    allocation_mode = constraints.get("allocation_mode", "proximity")  # "proximity" or "greedy_capacity"

    if allocation_mode == "greedy_capacity":
        # Classic Greedy Capacity allocation
        stops_sorted = sorted(stops, key=lambda s: int(s.get("students", 0)), reverse=True)
        unassigned = []
        for stop in stops_sorted:
            best_bus = None
            best_remaining = None
            stop_students = int(stop.get("students", 0))

            for allocation in allocations:
                capacity = int(allocation["bus"].get("capacity", 50))
                max_occupancy = int(constraints.get("max_bus_occupancy", capacity))
                usable_capacity = min(capacity, max_occupancy)
                remaining = usable_capacity - allocation["students"]

                if stop_students <= remaining:
                    if best_bus is None or remaining < best_remaining:
                        best_bus = allocation
                        best_remaining = remaining

            if best_bus:
                best_bus["stops"].append(stop)
                best_bus["students"] += stop_students
            else:
                unassigned.append(stop)
        return allocations, unassigned

    # Default: Proximity-aware Seed Clustering
    for allocation in allocations:
        if not unassigned_stops:
            break

        bus = allocation["bus"]
        capacity = int(bus.get("capacity", 50))
        max_occupancy = int(constraints.get("max_bus_occupancy", capacity))
        usable_capacity = min(capacity, max_occupancy)

        # Pick furthest unassigned stop from depot as cluster anchor/seed
        candidate_stops = [s for s in unassigned_stops if int(s.get("students", 0)) <= usable_capacity]
        if not candidate_stops:
            continue

        seed_stop = max(candidate_stops, key=lambda s: distance(college_depot, s))
        allocation["stops"].append(seed_stop)
        allocation["students"] += int(seed_stop.get("students", 0))
        unassigned_stops.remove(seed_stop)

        # Iteratively pick nearest stop to the current cluster centroid
        while unassigned_stops:
            remaining_cap = usable_capacity - allocation["students"]
            feasible_stops = [s for s in unassigned_stops if int(s.get("students", 0)) <= remaining_cap]
            if not feasible_stops:
                break

            # Cluster centroid
            cx = sum(float(s.get("x", 0)) for s in allocation["stops"]) / len(allocation["stops"])
            cy = sum(float(s.get("y", 0)) for s in allocation["stops"]) / len(allocation["stops"])
            centroid = {"x": cx, "y": cy}

            # Pick closest feasible stop to centroid
            next_stop = min(feasible_stops, key=lambda s: distance(centroid, s))
            allocation["stops"].append(next_stop)
            allocation["students"] += int(next_stop.get("students", 0))
            unassigned_stops.remove(next_stop)

    return allocations, unassigned_stops

def format_eta(start_time_str, elapsed_minutes):
    """Calculate formatted ETA string given start time and elapsed minutes."""
    try:
        base_time = datetime.strptime(start_time_str, "%H:%M")
    except Exception:
        base_time = datetime.strptime("07:30", "%H:%M")
    eta_time = base_time + timedelta(minutes=int(round(elapsed_minutes)))
    return eta_time.strftime("%I:%M %p")

def optimize_fleet(buses, stops, constraints=None):
    """
    Main Fleet Optimization Engine.
    Allocates buses, solves routing, computes fuel/carbon metrics, and generates turn-by-turn dispatch.
    """
    if constraints is None:
        constraints = {}

    depot_x = float(constraints.get("depot_x", 0))
    depot_y = float(constraints.get("depot_y", 0))
    depot_name = str(constraints.get("depot_name", "College Main Campus"))
    college = {"id": "college", "name": depot_name, "x": depot_x, "y": depot_y, "students": 0}

    allocations, unassigned = allocate_buses(buses, stops, constraints)

    algorithm = constraints.get("algorithm", "2opt")
    average_speed = float(constraints.get("average_speed", 30))  # km/h
    fuel_price = float(constraints.get("fuel_price", 95.0))     # per liter
    fuel_efficiency = float(constraints.get("fuel_efficiency", 4.5))  # km/liter
    traffic_factor = float(constraints.get("traffic_congestion", 1.1)) # traffic multiplier
    dwell_time = float(constraints.get("dwell_time", 1.5))       # mins per pickup
    departure_time = str(constraints.get("departure_time", "07:15"))

    routes = []
    total_distance = 0.0
    total_students = 0
    used_buses = 0
    total_fuel_liters = 0.0

    color_palette = [
        "#6366f1", "#06b6d4", "#10b981", "#f59e0b",
        "#ec4899", "#8b5cf6", "#14b8a6", "#f97316"
    ]

    for idx, allocation in enumerate(allocations):
        bus = allocation["bus"]
        assigned_stops = allocation["stops"]

        if not assigned_stops:
            continue

        used_buses += 1
        route = optimize_route(college, assigned_stops, algorithm=algorithm)
        route_distance = calculate_route_distance(route)
        students = allocation["students"]
        capacity = int(bus.get("capacity", 50))
        occupancy = round((students / capacity) * 100, 1)

        # Time Calculation
        drive_time_mins = (route_distance / max(average_speed, 5.0)) * 60.0 * traffic_factor
        stop_service_time_mins = len(assigned_stops) * dwell_time
        estimated_time = round(drive_time_mins + stop_service_time_mins, 1)

        # Environmental & Cost Telemetry
        fuel_consumed = round(route_distance / max(fuel_efficiency, 1.0), 2)
        fuel_cost = round(fuel_consumed * fuel_price, 2)
        fuel_type = bus.get("fuel_type", "Diesel").lower()

        if "electric" in fuel_type or "ev" in fuel_type:
            co2_emissions = round(route_distance * 0.15, 2)  # grid indirect equivalent
        elif "cng" in fuel_type:
            co2_emissions = round(fuel_consumed * 1.85, 2)
        else:
            co2_emissions = round(fuel_consumed * 2.64, 2)   # Diesel default kg CO2/L

        total_distance += route_distance
        total_students += students
        total_fuel_liters += fuel_consumed

        # Generate Detailed Turn-by-Turn Waypoints with ETAs and cumulative loads
        itinerary = []
        cumulative_mins = 0.0
        current_boarded = 0

        for stop_idx, wp in enumerate(route):
            if stop_idx > 0:
                prev_wp = route[stop_idx - 1]
                leg_dist = distance(prev_wp, wp)
                leg_mins = (leg_dist / max(average_speed, 5.0)) * 60.0 * traffic_factor
                cumulative_mins += leg_mins
            else:
                leg_dist = 0.0

            is_pickup = (wp["id"] != "college")
            boarding = int(wp.get("students", 0)) if is_pickup else 0
            if is_pickup:
                cumulative_mins += dwell_time
                current_boarded += boarding

            itinerary.append({
                "seq": stop_idx + 1,
                "id": wp["id"],
                "name": wp["name"],
                "type": "pickup" if is_pickup else "depot",
                "x": float(wp.get("x", 0)),
                "y": float(wp.get("y", 0)),
                "students_boarding": boarding,
                "passengers_onboard": current_boarded,
                "seats_remaining": capacity - current_boarded,
                "leg_km": round(leg_dist, 2),
                "eta": format_eta(departure_time, cumulative_mins)
            })

        color = color_palette[idx % len(color_palette)]

        routes.append({
            "bus_id": bus.get("id", f"B{idx+1}"),
            "bus_name": bus.get("name", f"Bus {idx+1}"),
            "driver_name": bus.get("driver", f"Driver #{idx+1}"),
            "fuel_type": bus.get("fuel_type", "Diesel"),
            "color": color,
            "capacity": capacity,
            "students": students,
            "occupancy": occupancy,
            "distance": route_distance,
            "estimated_time": estimated_time,
            "fuel_consumed_liters": fuel_consumed,
            "fuel_cost": fuel_cost,
            "co2_emissions_kg": co2_emissions,
            "stops": [
                {"id": s["id"], "name": s["name"], "students": int(s.get("students", 0)), "x": float(s.get("x", 0)), "y": float(s.get("y", 0))}
                for s in assigned_stops
            ],
            "route": [item["name"] for item in route],
            "itinerary": itinerary
        })

    total_capacity = sum(int(bus.get("capacity", 50)) for bus in buses)
    total_requested_students = sum(int(stop.get("students", 0)) for stop in stops)

    overall_occupancy = round((total_students / total_capacity) * 100, 1) if total_capacity else 0.0
    served_percentage = round((total_students / total_requested_students) * 100, 1) if total_requested_students else 0.0
    total_fuel_cost = round(total_fuel_liters * fuel_price, 2)
    total_co2 = round(sum(r["co2_emissions_kg"] for r in routes), 2)
    green_score = max(10, min(100, int(100 - (total_co2 * 0.4))))

    return {
        "summary": {
            "total_buses": len(buses),
            "used_buses": used_buses,
            "idle_buses": len(buses) - used_buses,
            "total_stops": len(stops),
            "served_stops": len(stops) - len(unassigned),
            "unserved_stops": len(unassigned),
            "total_students": total_requested_students,
            "served_students": total_students,
            "unserved_students": total_requested_students - total_students,
            "total_capacity": total_capacity,
            "overall_occupancy": overall_occupancy,
            "served_percentage": served_percentage,
            "total_distance": round(total_distance, 2),
            "total_fuel_liters": round(total_fuel_liters, 2),
            "total_fuel_cost": total_fuel_cost,
            "total_co2_kg": total_co2,
            "green_fleet_score": green_score,
            "algorithm_used": algorithm,
            "college_depot": {"name": depot_name, "x": depot_x, "y": depot_y}
        },
        "routes": routes,
        "unassigned_stops": [
            {"id": s["id"], "name": s["name"], "students": int(s.get("students", 0)), "x": float(s.get("x", 0)), "y": float(s.get("y", 0))}
            for s in unassigned
        ]
    }
