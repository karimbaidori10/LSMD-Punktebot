
const express = require("express");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

const DB_FILE = "./database.json";

// 📦 DB Loader
function loadDB() {
    if (!fs.existsSync(DB_FILE)) return {};
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

// 🏠 HOME
app.get("/", (req, res) => {

    const db = loadDB();

    const totalUsers = Object.keys(db).length;

    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>LSMD Dashboard</title>
<style>
body {
    margin:0;
    font-family: Arial;
    background:#0f172a;
    color:white;
}

.header {
    padding:20px;
    background:#111827;
    text-align:center;
    font-size:22px;
    font-weight:bold;
}

.container {
    display:flex;
    gap:20px;
    padding:20px;
    flex-wrap:wrap;
}

.card {
    background:#1f2937;
    padding:20px;
    border-radius:12px;
    width:200px;
    text-align:center;
}

.card h2 {
    margin:0;
    font-size:28px;
}

.btn {
    display:inline-block;
    margin-top:10px;
    padding:10px;
    background:#22c55e;
    color:white;
    border-radius:8px;
    text-decoration:none;
}
</style>
</head>

<body>

<div class="header">🚑 LSMD CONTROL DASHBOARD</div>

<div class="container">

    <div class="card">
        <h2>${totalUsers}</h2>
        <p>👤 User gespeichert</p>
    </div>

    <div class="card">
        <h2>LIVE</h2>
        <p>📊 Punkte System aktiv</p>
    </div>

    <div class="card">
        <a class="btn" href="/top">🏆 Top 10 ansehen</a>
    </div>

</div>

</body>
</html>
    `);
});

// 🏆 TOP 10 PAGE
app.get("/top", (req, res) => {

    const db = loadDB();

    const sorted = Object.entries(db)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    let rows = "";

    sorted.forEach(([id, pts], i) => {
        rows += `
        <tr>
            <td>${i + 1}</td>
            <td>${id}</td>
            <td>${pts}</td>
        </tr>
        `;
    });

    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Top 10 LSMD</title>
<style>
body {
    margin:0;
    font-family: Arial;
    background:#0f172a;
    color:white;
}

.header {
    padding:20px;
    background:#111827;
    text-align:center;
    font-size:22px;
    font-weight:bold;
}

table {
    width:80%;
    margin:20px auto;
    border-collapse:collapse;
    background:#1f2937;
    border-radius:10px;
    overflow:hidden;
}

th, td {
    padding:12px;
    text-align:center;
    border-bottom:1px solid #374151;
}

th {
    background:#111827;
}

a {
    color:#22c55e;
    text-decoration:none;
}
</style>
</head>

<body>

<div class="header">🏆 LSMD TOP 10</div>

<table>
<tr>
    <th>#</th>
    <th>User ID</th>
    <th>Punkte</th>
</tr>
${rows}
</table>

<center><a href="/">⬅ Back</a></center>

</body>
</html>
    `);
});

// 🚀 START
app.listen(PORT, () => {
    console.log(`🌐 LSMD Dashboard läuft auf Port ${PORT}`);
});
