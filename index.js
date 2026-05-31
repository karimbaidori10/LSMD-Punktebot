require("dotenv").config();
const fs = require("fs");

const {
    Client,
    GatewayIntentBits,
    Events,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

// =====================
// 🔐 SAFE ENV CHECK
// =====================
function mustGetEnv(name) {
    const value = process.env[name];
    if (!value) {
        console.error(`❌ FEHLER: ${name} fehlt in Railway Variables!`);
        process.exit(1);
    }
    return value;
}

const TOKEN = mustGetEnv("DISCORD_TOKEN");

// =====================
// 🤖 CLIENT
// =====================
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const ROLE_NAME = process.env.ROLE_NAME || "Prakti-Sani-Leitung";
const DB_FILE = "./database.json";

// =====================
// 📦 DATABASE SAFE
// =====================
function loadDB() {
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "{}");
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function addPoints(db, userId, amount) {
    if (!db[userId]) db[userId] = 0;
    db[userId] += amount;
}

// =====================
// 🔍 DEBUG ENV (Railway)
// =====================
console.log("🔍 ENV CHECK:");
console.log("TOKEN:", process.env.DISCORD_TOKEN ? "OK" : "FEHLT");
console.log("CLIENT_ID:", process.env.CLIENT_ID ? "OK" : "FEHLT");
console.log("GUILD_ID:", process.env.GUILD_ID ? "OK" : "FEHLT");

// =====================
// 🤖 READY
// =====================
client.once(Events.ClientReady, () => {
    console.log(`🤖 Bot online als ${client.user.tag}`);
});

// =====================
// 🚑 INTERACTIONS
// =====================
client.on(Events.InteractionCreate, async (interaction) => {

    let db = loadDB();

    // =====================
    // 📊 PANEL COMMAND
    // =====================
    if (interaction.isChatInputCommand() && interaction.commandName === "panel") {

        if (!interaction.member.roles.cache.some(r => r.name === ROLE_NAME)) {
            return interaction.reply({
                content: "❌ Keine Berechtigung.",
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle("🚑 LSMD – Ausbilder Punktepanel")
            .setColor(0x2ecc71)
            .setDescription(
`**📊 Wochenziel:** 5 Punkte pro Ausbilder  

🟢 Bewerber eingestellt → +1  
🔵 Alleine fahren Prüfung → +2  
🔴 Sanitäter Prüfung → +3  

📌 LSMD Punkte System`
            )
            .setFooter({ text: "LSMD System • Buttons verwenden" });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("p1").setLabel("🟢 +1").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("p2").setLabel("🔵 +2").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("p3").setLabel("🔴 +3").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("me").setLabel("📊 Meine Punkte").setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({
            embeds: [embed],
            components: [row]
        });
    }

    // =====================
    // 🏆 LEADERBOARD
    // =====================
    if (interaction.isChatInputCommand() && interaction.commandName === "leaderboard") {

        const sorted = Object.entries(db)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const embed = new EmbedBuilder()
            .setTitle("🏆 LSMD Leaderboard")
            .setColor(0xf1c40f);

        let desc = "";

        if (sorted.length === 0) desc = "Keine Daten vorhanden.";

        sorted.forEach(([id, pts], i) => {
            desc += `**${i + 1}.** <@${id}> — ${pts} Punkte\n`;
        });

        embed.setDescription(desc);

        return interaction.reply({ embeds: [embed] });
    }

    // =====================
    // 🔘 BUTTONS
    // =====================
    if (interaction.isButton()) {

        if (!interaction.member.roles.cache.some(r => r.name === ROLE_NAME)) {
            return interaction.reply({
                content: "❌ Keine Berechtigung.",
                ephemeral: true
            });
        }

        if (!db[interaction.user.id]) db[interaction.user.id] = 0;

        let amount = 0;

        if (interaction.customId === "p1") amount = 1;
        if (interaction.customId === "p2") amount = 2;
        if (interaction.customId === "p3") amount = 3;

        if (amount > 0) {
            addPoints(db, interaction.user.id, amount);
            saveDB(db);

            return interaction.reply({
                content: `✅ +${amount} Punkte | Gesamt: ${db[interaction.user.id]}`,
                ephemeral: true
            });
        }

        if (interaction.customId === "me") {
            return interaction.reply({
                content: `📊 Deine Punkte: ${db[interaction.user.id] || 0}`,
                ephemeral: true
            });
        }
    }
});

// =====================
// 🔑 LOGIN (RAILWAY SAFE)
// =====================
client.login(TOKEN);
