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
        console.error(`❌ FEHLER: ${name} fehlt in .env / Railway`);
        process.exit(1);
    }
    return value;
}

const TOKEN = mustGetEnv("DISCORD_TOKEN");
const LOG_CHANNEL_ID = mustGetEnv("LOG_CHANNEL_ID");
const ROLE_NAME = process.env.ROLE_NAME;

// =====================
// 🤖 CLIENT
// =====================
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
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
// 👮 ADMIN STATE
// =====================
const adminState = {};

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
        let db = loadDB();

        for (const id in db) {
            db[id] = 0;
        }

        saveDB(db);

        console.log("🔁 Weekly Reset ausgeführt");
    }
}, 60000);

// =====================
// 🚑 INTERACTIONS
// =====================
client.on(Events.InteractionCreate, async (interaction) => {

    let db = loadDB();

    // =====================
    // 📊 PANEL
    // =====================
    if (interaction.isChatInputCommand() && interaction.commandName === "panel") {

        const embed = new EmbedBuilder()
            .setTitle("🚑 LSMD – Ausbilder Punktepanel")
            .setColor(0x2ecc71)
            .setDescription(
`Wochenziel: 5 Punkte pro Ausbilder

🟢 Bewerber eingestellt → +1  
🔵 Alleine fahren Prüfung → +2  
🔴 Sanitäter Prüfung → +3  

📌 LSMD System`
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("p1").setLabel("+1").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("p2").setLabel("+2").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("p3").setLabel("+3").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("me").setLabel("Meine Stats").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("admin").setLabel("Admin Panel").setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
    }

    // =====================
    // 📊 TOP 5 STATS
    // =====================
    if (interaction.isChatInputCommand() && interaction.commandName === "stats") {

        const sorted = Object.entries(db)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const embed = new EmbedBuilder()
            .setTitle("🏆 LSMD Top 5")
            .setColor(0xf1c40f)
            .setDescription(
                sorted.length
                    ? sorted.map((u, i) =>
                        `**${i + 1}.** <@${u[0]}> — ${u[1]} Punkte`
                    ).join("\n")
                    : "Keine Daten"
            );

        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
        if (logChannel) logChannel.send({ embeds: [embed] });

        return interaction.reply({
            content: "📊 Top 5 im Log Channel gepostet",
            ephemeral: true
        });
    }

    // =====================
    // 🔘 BUTTONS
    // =====================
    if (interaction.isButton()) {

        if (!interaction.member.roles.cache.some(r => r.name === ROLE_NAME)) {
            return interaction.reply({ content: "❌ Keine Berechtigung", ephemeral: true });
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
            if (log) log.send(`📥 <@${interaction.user.id}> +${amount} Punkte`);

            return interaction.reply({
                content: `✅ +${amount} Punkte`,
                ephemeral: true
            });
        }

        if (interaction.customId === "me") {
            return interaction.reply({
                content: `📊 Deine Punkte: ${db[interaction.user.id] || 0}`,
                ephemeral: true
            });
        }

        // =====================
        // 👮 ADMIN PANEL
        // =====================
        if (interaction.customId === "admin") {

            const members = interaction.guild.members.cache
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
                    .addOptions(members)
            );

            const actionSelect = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("admin_action")
                    .setPlaceholder("⚙️ Aktion wählen")
                    .addOptions([
                        { label: "+1 Punkt", value: "add1" },
                        { label: "+2 Punkte", value: "add2" },
                        { label: "+3 Punkte", value: "add3" },
                        { label: "-1 Punkt", value: "rem1" },
                        { label: "-2 Punkte", value: "rem2" },
                        { label: "-3 Punkte", value: "rem3" }
                    ])
            );

            return interaction.reply({
                content: "👮 Admin Control Panel",
                components: [userSelect, actionSelect],
                ephemeral: true
            });
        }

        saveDB(db);
    }

    // =====================
    // 👤 USER SELECT
    // =====================
    if (interaction.isStringSelectMenu() && interaction.customId === "admin_user") {

        adminState[interaction.user.id] = {
            target: interaction.values[0]
        };

        return interaction.reply({
            content: `👤 User: <@${interaction.values[0]}>`,
            ephemeral: true
        });
    }

    // =====================
    // ⚙️ ACTION SELECT
    // =====================
    if (interaction.isStringSelectMenu() && interaction.customId === "admin_action") {

        const state = adminState[interaction.user.id];

        if (!state?.target) {
            return interaction.reply({
                content: "❌ Erst User auswählen",
                ephemeral: true
            });
        }

        let amount = 0;

        if (interaction.values[0] === "add1") amount = 1;
        if (interaction.values[0] === "add2") amount = 2;
        if (interaction.values[0] === "add3") amount = 3;
        if (interaction.values[0] === "rem1") amount = -1;
        if (interaction.values[0] === "rem2") amount = -2;
        if (interaction.values[0] === "rem3") amount = -3;

        if (!db[state.target]) db[state.target] = 0;

        db[state.target] += amount;
        if (db[state.target] < 0) db[state.target] = 0;

        saveDB(db);

        const log = await client.channels.fetch(LOG_CHANNEL_ID);
        if (log) {
            log.send(`👮 Admin: <@${state.target}> ${amount > 0 ? "+" : ""}${amount}`);
        }

        return interaction.reply({
            content: "✅ Gespeichert",
            ephemeral: true
        });
    }
});

// =====================
// 🔑 LOGIN
// =====================
client.login(TOKEN);
