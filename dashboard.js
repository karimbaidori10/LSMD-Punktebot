const express = require("express");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

const DB_FILE = "./database.json";

app.use(express.json());

// =====================
// 💾 DB
// =====================
function loadDB() {
    if (!fs.existsSync(DB_FILE)) return {};
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function saveDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// =====================
// 🌐 HOME DASHBOARD
// =====================
app.get("/", (req, res) => {

    const db = loadDB();
    const users = Object.keys(db).length;

    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>LSMD Dashboard</title>
<style>
body{margin:0;font-family:Arial;background:#0f172a;color:white}
.header{padding:20px;background:#111827;text-align:center;font-size:22px}
.grid{display:flex;gap:20px;padding:20px;flex-wrap:wrap}
.card{background:#1f2937;padding:20px;border-radius:12px;width:220px}
button{padding:8px 12px;border:none;border-radius:6px;cursor:pointer}
</style>
</head>
<body>

<div class="header">🚑 LSMD CONTROL PANEL</div>

<div class="grid">

<div class="card">
<h2>${users}</h2>
<p>👤 User gespeichert</p>
</div>

<div class="card">
<h3>⚙️ Admin Tools</h3>
<a href="/admin"><button>Öffnen</button></a>
</div>

<div class="card">
<h3>🏆 Leaderboard</h3>
<a href="/top"><button>Top 10</button></a>
</div>

</div>

</body>
</html>
    `);
});

// =====================
// 🏆 TOP 10
// =====================
app.get("/top", (req, res) => {

    const db = loadDB();

    const sorted = Object.entries(db)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    let html = "<h1>🏆 Top 10 LSMD</h1><ul>";

    sorted.forEach(([id, pts]) => {
        html += `<li>${id} — ${pts} Punkte</li>`;
    });

    html += "</ul><a href='/'>Back</a>";

    res.send(html);
});

// =====================
// 👮 ADMIN PANEL
// =====================
app.get("/admin", (req, res) => {

    const db = loadDB();

    let options = "";

    Object.keys(db).forEach(id => {
        options += `<option value="${id}">${id}</option>`;
    });

    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Admin Panel</title>
<style>
body{margin:0;font-family:Arial;background:#0f172a;color:white}
.container{padding:20px}
input,select,button{padding:10px;margin:5px;border-radius:6px;border:none}
button{cursor:pointer}
</style>
</head>
<body>

<div class="container">

<h1>👮 Admin Panel</h1>

<select id="user">${options}</select><br>

<input id="points" type="number" placeholder="Punkte (+/-)">

<br>

<button onclick="send()">Speichern</button>

<p id="msg"></p>

</div>

<script>
async function send(){
    const user = document.getElementById("user").value;
    const points = document.getElementById("points").value;

    const res = await fetch("/api/points", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({user, points})
    });

    document.getElementById("msg").innerText = "Gespeichert!";
}
</script>

</body>
</html>
    `);
});

// =====================
// ⚙️ API (PUNKTE ÄNDERN)
// =====================
app.post("/api/points", (req, res) => {

    const { user, points } = req.body;

    const db = loadDB();

    if (!db[user]) db[user] = 0;

    db[user] += Number(points);

    if (db[user] < 0) db[user] = 0;

    saveDB(db);

    res.json({ success: true, user, points: db[user] });
});

// =====================
// 🚀 START
// =====================
app.listen(PORT, () => {
    console.log(`🌐 LSMD Dashboard läuft auf Port ${PORT}`);
});
