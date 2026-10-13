let busCount = 0;
let stopCount = 0;

function addBus(id=null, name=null, capacity=50) {
    busCount++;
    const container = document.getElementById("busContainer");
    const row = document.createElement("div");
    row.className = "input-row";
    row.innerHTML = `
        <input type="text" class="bus-id" placeholder="Bus ID" value="${id || "B" + busCount}">
        <input type="text" class="bus-name" placeholder="Bus Name" value="${name || "Bus " + busCount}">
        <input type="number" class="bus-capacity" placeholder="Capacity" value="${capacity}" min="1">
        <div></div><div></div>
        <button class="remove" onclick="this.parentElement.remove()">Remove</button>`;
    container.appendChild(row);
}

function addStop(id=null, name=null, students=20, x=1, y=1) {
    stopCount++;
    const container = document.getElementById("stopContainer");
    const row = document.createElement("div");
    row.className = "input-row";
    row.innerHTML = `
        <input type="text" class="stop-id" placeholder="Stop ID" value="${id || "S" + stopCount}">
        <input type="text" class="stop-name" placeholder="Pickup Stop" value="${name || "Stop " + stopCount}">
        <input type="number" class="stop-students" placeholder="Students" value="${students}" min="1">
        <input type="number" class="stop-x" placeholder="X" value="${x}">
        <input type="number" class="stop-y" placeholder="Y" value="${y}">
        <button class="remove" onclick="this.parentElement.remove()">Remove</button>`;
    container.appendChild(row);
}

function getBuses() {
    const rows = document.querySelectorAll("#busContainer .input-row");
    return [...rows].map(row => ({
        id: row.querySelector(".bus-id").value.trim(),
        name: row.querySelector(".bus-name").value.trim(),
        capacity: Number(row.querySelector(".bus-capacity").value)
    })).filter(b => b.id && b.name && b.capacity > 0);
}

function getStops() {
    const rows = document.querySelectorAll("#stopContainer .input-row");
    return [...rows].map(row => ({
        id: row.querySelector(".stop-id").value.trim(),
        name: row.querySelector(".stop-name").value.trim(),
        students: Number(row.querySelector(".stop-students").value),
        x: Number(row.querySelector(".stop-x").value),
        y: Number(row.querySelector(".stop-y").value)
    })).filter(s => s.id && s.name && s.students > 0);
}

async function optimizeFleet() {
    const buses = getBuses();
    const stops = getStops();
    const maxOccupancy = Number(document.getElementById("maxOccupancy").value);
    const averageSpeed = Number(document.getElementById("averageSpeed").value);

    if (!buses.length) return alert("Please add at least one bus.");
    if (!stops.length) return alert("Please add at least one pickup stop.");

    document.getElementById("loading").classList.remove("hidden");
    document.getElementById("results").classList.add("hidden");

    try {
        const response = await fetch("/optimize", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                buses,
                stops,
                constraints: {max_bus_occupancy: maxOccupancy, average_speed: averageSpeed}
            })
        });
        const data = await response.json();
        if (!data.success) return alert(data.error || "Optimization failed.");
        displayResults(data.result);
    } catch (error) {
        console.error(error);
        alert("Could not connect to the Flask server.");
    } finally {
        document.getElementById("loading").classList.add("hidden");
    }
}

function displayResults(result) {
    document.getElementById("results").classList.remove("hidden");
    displaySummary(result.summary);
    displayRoutes(result.routes);
    displayUnassigned(result.unassigned_stops);
}

function displaySummary(s) {
    document.getElementById("summary").innerHTML = `
        <div class="metric"><div class="metric-value">${s.used_buses}</div><div class="metric-label">Buses Used</div></div>
        <div class="metric"><div class="metric-value">${s.served_students}</div><div class="metric-label">Students Served</div></div>
        <div class="metric"><div class="metric-value">${s.overall_occupancy}%</div><div class="metric-label">Fleet Occupancy</div></div>
        <div class="metric"><div class="metric-value">${s.total_distance}</div><div class="metric-label">Total Distance</div></div>`;
}

function displayRoutes(routes) {
    const container = document.getElementById("routes");
    container.innerHTML = "";
    routes.forEach(route => {
        const card = document.createElement("div");
        card.className = "route-card";
        const stopsHTML = route.stops.map(stop => `
            <div class="stop-item"><span>${stop.name}</span><strong>${stop.students} students</strong></div>
        `).join("");
        card.innerHTML = `
            <div class="route-header">
                <div class="route-title">🚌 ${route.bus_name}</div>
                <div>${route.occupancy}% occupied</div>
            </div>
            <div class="route-stats">
                <div class="stat"><strong>${route.students}</strong><br>Students</div>
                <div class="stat"><strong>${route.capacity}</strong><br>Capacity</div>
                <div class="stat"><strong>${route.distance}</strong><br>Distance</div>
                <div class="stat"><strong>${route.estimated_time}</strong><br>Minutes</div>
            </div>
            <div class="route-path">${route.route.join(" → ")}</div>
            <div class="stop-list">${stopsHTML}</div>`;
        container.appendChild(card);
    });
}

function displayUnassigned(stops) {
    const container = document.getElementById("unassigned");
    if (!stops || !stops.length) {
        container.innerHTML = "";
        return;
    }
    container.innerHTML = `<div class="warning"><strong>⚠ Some pickup stops could not be assigned.</strong><br><br>${
        stops.map(s => `${s.name} — ${s.students} students`).join("<br>")
    }</div>`;
}

addBus("B1", "Bus 1", 50);
addBus("B2", "Bus 2", 40);
addBus("B3", "Bus 3", 50);

addStop("S1", "Gandhipuram", 25, 4, 3);
addStop("S2", "Peelamedu", 20, 8, 2);
addStop("S3", "Singanallur", 18, 6, -2);
addStop("S4", "Saibaba Colony", 22, 2, 5);
addStop("S5", "RS Puram", 15, 1, 4);
