require("dotenv").config();
const fs = require("fs");

const {
    Client,
    GatewayIntentBits,
    Events,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");

// =====================
// 🔐 ENV SAFE
// =====================
function mustGetEnv(name) {
    const value = process.env[name];
    if (!value) {
        console.error(`❌ FEHLER: ${name} fehlt in .env`);
        process.exit(1);
    }
    return value;
}

const TOKEN = mustGetEnv("DISCORD_TOKEN");
const LOG_CHANNEL_ID = mustGetEnv("LOG_CHANNEL_ID");
const ADMIN_ROLE_ID = mustGetEnv("ADMIN_ROLE_ID");

// =====================
// 🤖 CLIENT (FIXED INTENTS)
// =====================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// =====================
// 💾 DB
// =====================
const DB_FILE = "./database.json";

function loadDB() {
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "{}");
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function saveDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// =====================
// 🧠 ADMIN STATE (FIXED)
// =====================
const adminState = new Map();

// =====================
// 🤖 READY
// =====================
client.once(Events.ClientReady, () => {
    console.log(`🤖 Online als ${client.user.tag}`);
});

// =====================
// 🔁 WEEK RESET
// =====================
setInterval(() => {
    const now = new Date();

    if (now.getDay() === 0 && now.getHours() === 19 && now.getMinutes() === 30) {
        saveDB({});
        console.log("🔁 Weekly Reset DONE");
    }
}, 60000);

// =====================
// 🚑 MAIN
// =====================
client.on(Events.InteractionCreate, async (interaction) => {

    let db = loadDB();

    // =====================
    // 📊 PANEL (ORIGINAL DESIGN)
    // =====================
    if (interaction.isChatInputCommand() && interaction.commandName === "panel") {

        const member = await interaction.guild.members.fetch(interaction.user.id);

        if (!member.roles.cache.has(ADMIN_ROLE_ID)) {
            return interaction.reply({
                content: "❌ Keine Berechtigung.",
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle("🚑 LSMD – Ausbilder Punktepanel")
            .setColor(0x2ecc71)
            .setDescription(
`Wochenziel: 5 Punkte pro Ausbilder
Vergib deine Punkte über die Buttons unten.

Wertungen:
🟢 Bewerber eingestellt → +1
🔵 Alleine fahren Prüfung → +2
🔴 Sanitäter Prüfung → +3

📌 Hinweis: Nur mit der Rolle PraktiSani klickbar.
🕒 Report: Sonntag 19:25 · Reset: Sonntag 19:30

LSMD Punkte-System • Buttons unten verwenden`
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("p1")
                .setLabel("🟢 Bewerber eingestellt (+1)")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("p2")
                .setLabel("🔵 Alleine fahren Prüfung (+2)")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("p3")
                .setLabel("🔴 Sanitäter Prüfung (+3)")
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId("me")
                .setLabel("📊 Meine Punkte")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("admin")
                .setLabel("👮 Admin Panel")
                .setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({
            embeds: [embed],
            components: [row]
        });
    }

    // =====================
    // 🔘 BUTTONS
    // =====================
    if (interaction.isButton()) {

        const member = await interaction.guild.members.fetch(interaction.user.id);

        if (!member.roles.cache.has(ADMIN_ROLE_ID)) {
            return interaction.reply({
                content: "❌ Keine Berechtigung",
                ephemeral: true
            });
        }

        if (!db[interaction.user.id]) db[interaction.user.id] = 0;

        let amount = 0;

        if (interaction.customId === "p1") amount = 1;
        if (interaction.customId === "p2") amount = 2;
        if (interaction.customId === "p3") amount = 3;

        if (amount > 0) {
            db[interaction.user.id] += amount;
            saveDB(db);

            const log = await client.channels.fetch(LOG_CHANNEL_ID);

            if (log) {
                log.send(
`📊 **LSMD PUNKTE VERGABE**
👤 User: <@${interaction.user.id}>
➕ Punkte: +${amount}
📌 Grund: Ausbildung / Prüfung
🏆 Neuer Stand: **${db[interaction.user.id]} Punkte**
🕒 Zeit: <t:${Math.floor(Date.now() / 1000)}:F>`
                );
            }

            return interaction.reply({
                content: `✅ +${amount} Punkte`,
                ephemeral: true
            });
        }

        if (interaction.customId === "me") {
            return interaction.reply({
                content: `📊 Punkte: ${db[interaction.user.id] || 0}`,
                ephemeral: true
            });
        }

        // =====================
        // 👮 ADMIN PANEL OPEN
        // =====================
        if (interaction.customId === "admin") {

            const members = await interaction.guild.members.fetch();

            const options = members
                .filter(m => !m.user.bot)
                .map(m => ({
                    label: m.user.username,
                    value: m.id
                }))
                .slice(0, 25);

            const userSelect = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("admin_user")
                    .setPlaceholder("👤 User auswählen")
                    .addOptions(options)
            );

            const actionSelect = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("admin_action")
                    .setPlaceholder("⚙️ Aktion wählen")
                    .addOptions([
                        { label: "+1", value: "add1" },
                        { label: "+2", value: "add2" },
                        { label: "+3", value: "add3" },
                        { label: "-1", value: "rem1" },
                        { label: "-2", value: "rem2" },
                        { label: "-3", value: "rem3" }
                    ])
            );

            return interaction.reply({
                content: "👮 Admin Panel",
                components: [userSelect, actionSelect],
                ephemeral: true
            });
        }
    }

    // =====================
    // 👤 USER SELECT
    // =====================
    if (interaction.isStringSelectMenu() && interaction.customId === "admin_user") {

        adminState.set(interaction.user.id, {
            target: interaction.values[0]
        });

        return interaction.reply({
            content: `👤 Ziel: <@${interaction.values[0]}>`,
            ephemeral: true
        });
    }

    // =====================
    // ⚙️ ACTION SELECT
    // =====================
    if (interaction.isStringSelectMenu() && interaction.customId === "admin_action") {

        const state = adminState.get(interaction.user.id);

        if (!state?.target) {
            return interaction.reply({
                content: "❌ Erst User auswählen",
                ephemeral: true
            });
        }

        let amount = 0;
        let reason = "";

        if (interaction.values[0] === "add1") { amount = 1; reason = "Admin +1"; }
        if (interaction.values[0] === "add2") { amount = 2; reason = "Admin +2"; }
        if (interaction.values[0] === "add3") { amount = 3; reason = "Admin +3"; }
        if (interaction.values[0] === "rem1") { amount = -1; reason = "Admin -1"; }
        if (interaction.values[0] === "rem2") { amount = -2; reason = "Admin -2"; }
        if (interaction.values[0] === "rem3") { amount = -3; reason = "Admin -3"; }

        if (!db[state.target]) db[state.target] = 0;

        db[state.target] += amount;
        if (db[state.target] < 0) db[state.target] = 0;

        saveDB(db);

        const log = await client.channels.fetch(LOG_CHANNEL_ID);

        if (log) {
            log.send(
`📊 **ADMIN ACTION LOG**
👤 Target: <@${state.target}>
👮 Admin: <@${interaction.user.id}>
➕ Änderung: ${amount > 0 ? "+" : ""}${amount}
📌 Grund: ${reason}
🏆 Neuer Stand: **${db[state.target]} Punkte**
🕒 Zeit: <t:${Math.floor(Date.now() / 1000)}:F>`
            );
        }

        return interaction.reply({
            content: "✅ Aktion gespeichert",
            ephemeral: true
        });
    }
});

client.login(TOKEN);
