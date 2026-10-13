import math
from datetime import datetime, timedelta

def build_distance_matrix(college, stops, edges=None):
    """
    Constructs an all-pairs shortest path distance matrix (in kilometers).
    Respects user-specified Hub Distances and user-defined Road Edges.
    """
    if edges is None:
        edges = []

    nodes = ["college"] + [str(s.get("id")) for s in stops]
    stop_map = {str(s.get("id")): s for s in stops}

    # Initialize distance matrix with infinity, 0 on diagonal
    dist = {}
    for u in nodes:
        dist[u] = {}
        for v in nodes:
            dist[u][v] = 0.0 if u == v else float("inf")

    # Set user-specified Hub Distances
    depot_x = float(college.get("x", 0))
    depot_y = float(college.get("y", 0))

    for s in stops:
        sid = str(s.get("id"))
        is_conn = s.get("is_hub_connected", False)
        hub_km = s.get("hub_distance")
        if is_conn and hub_km is not None and str(hub_km).strip() != "" and float(hub_km) > 0:
            d_val = float(hub_km)
            dist["college"][sid] = d_val
            dist[sid]["college"] = d_val

    # Set user-specified Edges (possible paths between stops)
    for edge in edges:
        u = str(edge.get("from", ""))
        v = str(edge.get("to", ""))
        d_km = edge.get("distance")
        if u in dist and v in dist and d_km is not None and float(d_km) > 0:
            val = float(d_km)
            dist[u][v] = min(dist[u][v], val)
            dist[v][u] = min(dist[v][u], val)

    # Floyd-Warshall algorithm to find shortest road network path between all nodes
    for k in nodes:
        for i in nodes:
            for j in nodes:
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = round(dist[i][k] + dist[k][j], 2)

    # For any remaining unconnected pairs, connect via college or Euclidean coordinates
    for i in nodes:
        for j in nodes:
            if dist[i][j] == float("inf"):
                p1 = college if i == "college" else stop_map.get(i, {})
                p2 = college if j == "college" else stop_map.get(j, {})
                x1, y1 = float(p1.get("x", 0)), float(p1.get("y", 0))
                x2, y2 = float(p2.get("x", 0)), float(p2.get("y", 0))
                dist[i][j] = round(math.hypot(x2 - x1, y2 - y1), 2)

    return dist

def get_node_distance(p1, p2, dist_matrix):
    """Retrieve shortest path distance in kilometers between two nodes."""
    id1 = "college" if p1.get("id") == "college" else str(p1.get("id"))
    id2 = "college" if p2.get("id") == "college" else str(p2.get("id"))
    if dist_matrix and id1 in dist_matrix and id2 in dist_matrix[id1]:
        return dist_matrix[id1][id2]
    # Fallback to Euclidean
    x1, y1 = float(p1.get("x", 0)), float(p1.get("y", 0))
    x2, y2 = float(p2.get("x", 0)), float(p2.get("y", 0))
    return round(math.hypot(x2 - x1, y2 - y1), 2)

def calculate_route_distance(route, dist_matrix=None):
    """Calculate total travel distance across consecutive waypoints in a route."""
    if len(route) < 2:
        return 0.0
    total = sum(get_node_distance(route[i], route[i + 1], dist_matrix) for i in range(len(route) - 1))
    return round(total, 2)

def two_opt_swap(route, i, k):
    """Reverses the sub-route segment between index i and k."""
    return route[:i] + route[i:k + 1][::-1] + route[k + 1:]

def apply_two_opt(route, dist_matrix=None):
    """
    Applies the 2-Opt local search heuristic to optimize a route by
    removing crossing legs to minimize total travel distance and fuel.
    """
    if len(route) <= 3:
        return route

    best_route = list(route)
    improved = True
    max_iterations = 60
    iteration = 0

    while improved and iteration < max_iterations:
        improved = False
        iteration += 1
        best_dist = calculate_route_distance(best_route, dist_matrix)

        for i in range(1, len(best_route) - 2):
            for k in range(i + 1, len(best_route) - 1):
                new_route = two_opt_swap(best_route, i, k)
                new_dist = calculate_route_distance(new_route, dist_matrix)

                if new_dist < best_dist - 0.001:
                    best_route = new_route
                    best_dist = new_dist
                    improved = True
                    break
            if improved:
                break

    return best_route

def optimize_route(college, assigned_stops, dist_matrix=None):
    """
    Constructs an optimized route starting and ending at the college depot.
    Minimizes total distance and fuel consumption.
    """
    if not assigned_stops:
        return [college]

    remaining = assigned_stops.copy()
    route = [college]
    current = college

    # Nearest Neighbor tour generation based on road network distances
    while remaining:
        nearest = min(remaining, key=lambda stop: get_node_distance(current, stop, dist_matrix))
        route.append(nearest)
        current = nearest
        remaining.remove(nearest)

    route.append(college)

    # 2-Opt local search to minimize path crossings & distance
    return apply_two_opt(route, dist_matrix)

def allocate_buses(buses, stops, college, dist_matrix, constraints):
    """
    Allocates stops to buses respecting vehicle seating capacities.
    Clusters adjacent stops to minimize total travel distance and fuel consumption.
    """
    sorted_buses = sorted(buses, key=lambda b: int(b.get("capacity", 50)), reverse=True)
    unassigned_stops = list(stops)
    allocations = [{"bus": bus, "stops": [], "students": 0} for bus in sorted_buses]

    for allocation in allocations:
        if not unassigned_stops:
            break

        bus = allocation["bus"]
        capacity = int(bus.get("capacity", 50))
        max_occupancy = int(constraints.get("max_bus_occupancy", capacity))
        usable_capacity = min(capacity, max_occupancy)

        # Seed stop: furthest unassigned stop from college hub
        candidate_stops = [s for s in unassigned_stops if int(s.get("students", 0)) <= usable_capacity]
        if not candidate_stops:
            continue

        seed_stop = max(candidate_stops, key=lambda s: get_node_distance(college, s, dist_matrix))
        allocation["stops"].append(seed_stop)
        allocation["students"] += int(seed_stop.get("students", 0))
        unassigned_stops.remove(seed_stop)

        # Incrementally add closest reachable stops that fit within usable capacity
        while unassigned_stops:
            remaining_cap = usable_capacity - allocation["students"]
            feasible_stops = [s for s in unassigned_stops if int(s.get("students", 0)) <= remaining_cap]
            if not feasible_stops:
                break

            last_stop = allocation["stops"][-1]
            next_stop = min(feasible_stops, key=lambda s: get_node_distance(last_stop, s, dist_matrix))
            allocation["stops"].append(next_stop)
            allocation["students"] += int(next_stop.get("students", 0))
            unassigned_stops.remove(next_stop)

    return allocations, unassigned_stops

def format_eta(start_time_str, elapsed_minutes):
    """Calculate formatted ETA string given departure start time and elapsed minutes."""
    try:
        base_time = datetime.strptime(start_time_str, "%H:%M")
    except Exception:
        base_time = datetime.strptime("07:15", "%H:%M")
    eta_time = base_time + timedelta(minutes=int(round(elapsed_minutes)))
    return eta_time.strftime("%I:%M %p")

def optimize_fleet(buses, stops, constraints=None, edges=None):
    """
    Fleet Optimization Engine:
    Optimizes bus routes to achieve minimum fuel consumption and minimum distance.
    Provides route sequence, student rider count, and turn-by-turn leg kilometers.
    """
    if constraints is None:
        constraints = {}
    if edges is None:
        edges = []

    depot_x = float(constraints.get("depot_x", 0))
    depot_y = float(constraints.get("depot_y", 0))
    depot_name = str(constraints.get("depot_name", "College Main Campus"))
    college = {"id": "college", "name": depot_name, "x": depot_x, "y": depot_y, "students": 0}

    # Build road network distance matrix using user hub distances and edge kilometers
    dist_matrix = build_distance_matrix(college, stops, edges)

    # Allocate buses to stops
    allocations, unassigned = allocate_buses(buses, stops, college, dist_matrix, constraints)

    average_speed = float(constraints.get("average_speed", 32))      # km/h
    fuel_price = float(constraints.get("fuel_price", 96.5))          # per liter
    fuel_efficiency = float(constraints.get("fuel_efficiency", 4.5)) # km/liter
    traffic_factor = float(constraints.get("traffic_congestion", 1.15))
    dwell_time = float(constraints.get("dwell_time", 1.5))           # mins per stop
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
        route = optimize_route(college, assigned_stops, dist_matrix=dist_matrix)
        route_distance = calculate_route_distance(route, dist_matrix=dist_matrix)
        students = allocation["students"]
        capacity = int(bus.get("capacity", 50))
        occupancy = round((students / capacity) * 100, 1)

        # Time Calculation
        drive_time_mins = (route_distance / max(average_speed, 5.0)) * 60.0 * traffic_factor
        stop_service_time_mins = len(assigned_stops) * dwell_time
        estimated_time = round(drive_time_mins + stop_service_time_mins, 1)

        # Fuel Consumption & Cost (Minimizing route distance directly minimizes fuel)
        fuel_consumed = round(route_distance / max(fuel_efficiency, 1.0), 2)
        fuel_cost = round(fuel_consumed * fuel_price, 2)
        fuel_type = bus.get("fuel_type", "Diesel").capitalize()

        if "Electric" in fuel_type:
            co2_emissions = round(route_distance * 0.12, 2)
        elif "CNG" in fuel_type:
            co2_emissions = round(fuel_consumed * 1.85, 2)
        else:
            co2_emissions = round(fuel_consumed * 2.64, 2)

        total_distance += route_distance
        total_students += students
        total_fuel_liters += fuel_consumed

        # Generate Turn-by-Turn Waypoints with user-specified leg kilometers
        itinerary = []
        cumulative_mins = 0.0
        current_boarded = 0

        for stop_idx, wp in enumerate(route):
            if stop_idx > 0:
                prev_wp = route[stop_idx - 1]
                leg_dist = get_node_distance(prev_wp, wp, dist_matrix)
                leg_mins = (leg_dist / max(average_speed, 5.0)) * 60.0 * traffic_factor
                cumulative_mins += leg_mins
            else:
                leg_dist = 0.0

            is_pickup = (wp.get("id") != "college")
            boarding = int(wp.get("students", 0)) if is_pickup else 0
            if is_pickup:
                cumulative_mins += dwell_time
                current_boarded += boarding

            itinerary.append({
                "seq": stop_idx + 1,
                "id": wp.get("id"),
                "name": wp.get("name"),
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
            "fuel_type": fuel_type,
            "color": color,
            "capacity": capacity,
            "students": students,
            "occupancy": occupancy,
            "distance": round(route_distance, 2),
            "estimated_time": estimated_time,
            "fuel_consumed_liters": fuel_consumed,
            "fuel_cost": fuel_cost,
            "co2_emissions_kg": co2_emissions,
            "stops": [
                {
                    "id": s["id"],
                    "name": s["name"],
                    "students": int(s.get("students", 0)),
                    "x": float(s.get("x", 0)),
                    "hub_distance": float(s.get("hub_distance")) if s.get("hub_distance") is not None else None,
                    "is_hub_connected": bool(s.get("is_hub_connected", False))
                }
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
            "college_depot": {"name": depot_name, "x": depot_x, "y": depot_y}
        },
        "routes": routes,
        "unassigned_stops": [
            {
                "id": s["id"],
                "name": s["name"],
                "students": int(s.get("students", 0)),
                "x": float(s.get("x", 0)),
                "y": float(s.get("y", 0))
            }
            for s in unassigned
        ]
    }
