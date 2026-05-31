console.log("TOKEN CHECK:", process.env.DISCORD_TOKEN);
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

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const ROLE_NAME = process.env.ROLE_NAME || "Prakti-Sani-Leitung";
const DB_FILE = "./database.json";

// 📦 DB SAFE LOAD
function loadDB() {
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "{}");
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

// 💾 SAVE
function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 🧠 ADD POINTS
function addPoints(userId, amount, data) {
    if (!data[userId]) data[userId] = 0;
    data[userId] += amount;
}

// 🤖 READY
client.once(Events.ClientReady, () => {
    console.log(`🤖 Online als ${client.user.tag}`);
});

// 🚑 INTERACTIONS
client.on(Events.InteractionCreate, async interaction => {

    let db = loadDB();

    // =====================
    // 📊 PANEL
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

📌 Nur für berechtigte Ausbilder`
            )
            .setFooter({ text: "LSMD Punkte-System" });

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

        sorted.forEach(([id, pts], i) => {
            desc += `**${i + 1}.** <@${id}> — ${pts} Punkte\n`;
        });

        embed.setDescription(desc || "Keine Daten");

        return interaction.reply({ embeds: [embed] });
    }

    // =====================
    // 👮 ADMIN ADDPOINTS
    // =====================
    if (interaction.isChatInputCommand() && interaction.commandName === "addpoints") {

        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: "❌ Kein Admin.",
                ephemeral: true
            });
        }

        const user = interaction.options.getUser("user");
        const points = interaction.options.getInteger("points");

        addPoints(user.id, points, db);
        saveDB(db);

        return interaction.reply({
            content: `✅ ${user.tag} hat jetzt +${points} Punkte`
        });
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

        let amount = 0;

        if (interaction.customId === "p1") amount = 1;
        if (interaction.customId === "p2") amount = 2;
        if (interaction.customId === "p3") amount = 3;

        if (amount > 0) {
            addPoints(interaction.user.id, amount, db);
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

client.login(process.env.DISCORD_TOKEN);
