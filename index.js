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

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// =====================
// 🔐 ENV
// =====================
const TOKEN = process.env.DISCORD_TOKEN;
const LOG_CHANNEL = process.env.LOG_CHANNEL_ID;
const ADMIN_ROLE = process.env.ADMIN_ROLE;

// =====================
// 💾 DB
// =====================
const DB_FILE = "./database.json";

function loadDB() {
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "{}");
    return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// =====================
// 🔁 WEEK RESET
// =====================
function resetWeek() {
    let db = loadDB();

    for (const id in db) {
        db[id].weekly = 0;
    }

    saveDB(db);
    console.log("🔁 Weekly Reset done");
}

// Sonntag 19:30
setInterval(() => {
    const now = new Date();
    if (now.getDay() === 0 && now.getHours() === 19 && now.getMinutes() === 30) {
        resetWeek();
    }
}, 60000);

// =====================
// 🤖 READY
// =====================
client.once(Events.ClientReady, () => {
    console.log(`🤖 Online als ${client.user.tag}`);
});

// =====================
// 📊 PANEL
// =====================
client.on(Events.InteractionCreate, async (interaction) => {

    let db = loadDB();

    // =====================
    // 🚑 PANEL COMMAND
    // =====================
    if (interaction.isChatInputCommand() && interaction.commandName === "panel") {

        const embed = new EmbedBuilder()
            .setTitle("🚑 LSMD – Ausbilder Punktepanel")
            .setColor(0x2ecc71)
            .setDescription(
`Wochenziel: 5 Punkte pro Ausbilder

🟢 +1 Bewerber
🔵 +2 Prüfung
🔴 +3 Sanitäter

📌 LSMD System`
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("p1").setLabel("+1").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("p2").setLabel("+2").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("p3").setLabel("+3").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("stats").setLabel("Meine Stats").setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
    }

    // =====================
    // 📊 STATS TOP 5 (LOG CHANNEL)
    // =====================
    if (interaction.isChatInputCommand() && interaction.commandName === "stats") {

        const sorted = Object.entries(db)
            .sort((a, b) => (b[1]?.total || 0) - (a[1]?.total || 0))
            .slice(0, 5);

        const embed = new EmbedBuilder()
            .setTitle("🏆 LSMD Top 5")
            .setColor(0xf1c40f);

        let text = "";

        sorted.forEach((u, i) => {
            text += `**${i + 1}.** <@${u[0]}> — ${u[1]?.total || 0} Punkte\n`;
        });

        embed.setDescription(text || "Keine Daten");

        const logChannel = await client.channels.fetch(LOG_CHANNEL);
        if (logChannel) logChannel.send({ embeds: [embed] });

        return interaction.reply({
            content: "📊 Stats wurden im Log Channel gepostet.",
            ephemeral: true
        });
    }

    // =====================
    // 🔘 BUTTON SYSTEM
    // =====================
    if (interaction.isButton()) {

        const isAdmin = interaction.member.roles.cache.some(r => r.name === ADMIN_ROLE);

        if (!db[interaction.user.id]) {
            db[interaction.user.id] = { total: 0, weekly: 0 };
        }

        let add = 0;

        if (interaction.customId === "p1") add = 1;
        if (interaction.customId === "p2") add = 2;
        if (interaction.customId === "p3") add = 3;

        // =====================
        // ➕ ADD POINTS
        // =====================
        if (add > 0) {

            db[interaction.user.id].total += add;
            db[interaction.user.id].weekly += add;
            saveDB(db);

            const log = await client.channels.fetch(LOG_CHANNEL);
            if (log) {
                log.send(`📥 <@${interaction.user.id}> +${add} Punkte`);
            }

            return interaction.reply({
                content: `✅ +${add} Punkte`,
                ephemeral: true
            });
        }

        // =====================
        // 👮 ADMIN PANEL
        // =====================
        if (interaction.customId === "admin") {

            if (!isAdmin) {
                return interaction.reply({ content: "❌ Kein Zugriff", ephemeral: true });
            }

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("admin_select")
                    .setPlaceholder("🎛 Admin Aktion wählen")
                    .addOptions([
                        {
                            label: "➕ Punkte geben",
                            value: "add"
                        },
                        {
                            label: "➖ Punkte entfernen",
                            value: "remove"
                        },
                        {
                            label: "🔁 Week Reset",
                            value: "reset"
                        }
                    ])
            );

            return interaction.reply({
                content: "👮 Admin Panel",
                components: [menu],
                ephemeral: true
            });
        }

        // =====================
        // 📊 SELF STATS
        // =====================
        if (interaction.customId === "stats") {

            const u = db[interaction.user.id] || { total: 0, weekly: 0 };

            return interaction.reply({
                content: `📊 Total: ${u.total}\n📅 Week: ${u.weekly}`,
                ephemeral: true
            });
        }

        saveDB(db);
    }

    // =====================
    // 🎛 ADMIN MENU ACTION
    // =====================
    if (interaction.isStringSelectMenu() && interaction.customId === "admin_select") {

        const isAdmin = interaction.member.roles.cache.some(r => r.name === ADMIN_ROLE);

        if (!isAdmin) return interaction.reply({ content: "❌ Kein Zugriff", ephemeral: true });

        const value = interaction.values[0];

        if (value === "reset") {
            resetWeek();
            return interaction.reply({ content: "🔁 Week Reset done", ephemeral: true });
        }

        return interaction.reply({
            content: "⚠ Feature (Add/Remove UI mit User Auswahl) kann ich dir als nächste Version bauen",
            ephemeral: true
        });
    }
});

// =====================
// 🔑 LOGIN
// =====================
client.login(TOKEN);
