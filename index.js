require("dotenv").config();
const { MongoClient } = require("mongodb");
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
// 💥 CRASH PROTECTION
// =====================
process.on("unhandledRejection", (reason) => {
    console.error("❌ Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught Exception:", err);
});

// =====================
// 🔐 ENV CHECK
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
const MONGO_URI = mustGetEnv("MONGO_URI");

// =====================
// DISCORD CLIENT
// =====================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// =====================
// MONGO
// =====================
const mongo = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: 5000
});

let pointsCollection;

// =====================
// ADMIN CACHE
// =====================
const adminState = new Map();

// =====================
// DB FUNCTIONS
// =====================
async function getPoints(userId) {
    if (!pointsCollection) return 0; // FIX
    const data = await pointsCollection.findOne({ userId });
    return data?.points || 0;
}

async function setPoints(userId, points) {
    if (!pointsCollection) return; // FIX

    await pointsCollection.updateOne(
        { userId },
        { $set: { userId, points } },
        { upsert: true }
    );
}

async function getAllPoints() {
    if (!pointsCollection) return {}; // FIX

    const users = await pointsCollection.find({}).toArray();

    const result = {};
    for (const u of users) {
        result[u.userId] = u.points;
    }
    return result;
}

// =====================
// 🔁 MONGO CONNECT (SAFE + AUTO RECONNECT)
// =====================
async function connectMongo() {
    try {
        await mongo.connect();

        const db = mongo.db("lsmd");
        pointsCollection = db.collection("points");

        console.log("✅ MongoDB verbunden");
    } catch (err) {
        console.error("❌ MongoDB Fehler:", err);
        console.log("🔁 Retry in 5 Sekunden...");
        setTimeout(connectMongo, 5000);
    }
}

// =====================
// READY
// =====================
client.once(Events.ClientReady, async () => {
    await connectMongo();
    console.log(`🤖 Online als ${client.user.tag}`);
});

// =====================
// WEEKLY RESET
// =====================
setInterval(async () => {
    const now = new Date();

    if (now.getDay() === 0 && now.getHours() === 19 && now.getMinutes() === 30) {

        if (!pointsCollection) return; // FIX

        const all = await getAllPoints();

        for (const userId of Object.keys(all)) {
            await setPoints(userId, 0);
        }

        console.log("🔁 Weekly Reset DONE");
    }
}, 60000);

// =====================
// INTERACTIONS
// =====================
client.on(Events.InteractionCreate, async (interaction) => {

    // =====================
    // LEADERBOARD
    // =====================
    if (interaction.isChatInputCommand() && interaction.commandName === "leaderboard") {

        const db = await getAllPoints();

        const sorted = Object.entries(db)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const embed = new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle("🏆 Leaderboard")
            .setTimestamp();

        let desc = "";

        if (!sorted.length) {
            desc = "Keine Daten vorhanden.";
        } else {
            sorted.forEach(([id, pts], i) => {
                let medal = "🔹";
                if (i === 0) medal = "🥇";
                if (i === 1) medal = "🥈";
                if (i === 2) medal = "🥉";

                desc += `${medal} <@${id}> — **${pts} Punkte**\n`;
            });
        }

        embed.setDescription(desc);

        return interaction.reply({ embeds: [embed] });
    }

    // =====================
    // PANEL
    // =====================
    if (interaction.isChatInputCommand() && interaction.commandName === "panel") {

        let member;
        try {
            member = await interaction.guild.members.fetch(interaction.user.id);
        } catch {
            return interaction.reply({ content: "❌ Fehler beim Laden", ephemeral: true });
        }

        if (!member.roles.cache.has(ADMIN_ROLE_ID)) {
            return interaction.reply({ content: "❌ Keine Berechtigung", ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle("🚑 LSMD Panel")
            .setDescription("Nutze die Buttons für Punktevergabe");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("p1").setLabel("+1").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("p2").setLabel("+2").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("p3").setLabel("+3").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("me").setLabel("Meine Punkte").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("admin").setLabel("Admin").setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
    }

    // =====================
    // BUTTONS
    // =====================
    if (interaction.isButton()) {

        let member;
        try {
            member = await interaction.guild.members.fetch(interaction.user.id);
        } catch {
            return interaction.reply({ content: "❌ Fehler", ephemeral: true });
        }

        const isAdmin = member.roles.cache.has(ADMIN_ROLE_ID);

        let amount = 0;
        let reason = "";

        if (interaction.customId === "p1") { amount = 1; reason = "Aktion 1"; }
        if (interaction.customId === "p2") { amount = 2; reason = "Aktion 2"; }
        if (interaction.customId === "p3") { amount = 3; reason = "Aktion 3"; }

        // =====================
        // POINTS
        // =====================
        if (amount > 0) {

            const current = await getPoints(interaction.user.id);
            const newPoints = Math.max(0, current + amount);

            await setPoints(interaction.user.id, newPoints);

            let log;
            try {
                log = await client.channels.fetch(LOG_CHANNEL_ID);
            } catch {}

            log?.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("📊 Punkte Update")
                        .setDescription(`<@${interaction.user.id}>: ${reason}`)
                        .addFields({ name: "Neu", value: `${newPoints}` })
                ]
            });

            return interaction.reply({
                content: `✅ +${amount} Punkte`,
                ephemeral: true
            });
        }

        // =====================
        // ME
        // =====================
        if (interaction.customId === "me") {
            const pts = await getPoints(interaction.user.id);

            return interaction.reply({
                content: `📊 Punkte: ${pts}`,
                ephemeral: true
            });
        }

        // =====================
        // ADMIN
        // =====================
        if (interaction.customId === "admin") {

            if (!isAdmin) {
                return interaction.reply({ content: "❌ Keine Berechtigung", ephemeral: true });
            }

            const members = await interaction.guild.members.fetch();

            const options = members
                .filter(m => !m.user.bot)
                .map(m => ({
                    label: m.user.username,
                    value: m.id
                }))
                .slice(0, 25); // FIX

            adminState.set(interaction.user.id, {});

            const select = new StringSelectMenuBuilder()
                .setCustomId("admin_user")
                .setPlaceholder("User wählen")
                .addOptions(options);

            return interaction.reply({
                content: "Admin Panel",
                components: [new ActionRowBuilder().addComponents(select)],
                ephemeral: true
            });
        }
    }

    // =====================
    // ADMIN SELECT USER
    // =====================
    if (interaction.isStringSelectMenu() && interaction.customId === "admin_user") {

        adminState.set(interaction.user.id, {
            target: interaction.values[0]
        });

        return interaction.reply({
            content: `Ziel gesetzt: <@${interaction.values[0]}>`,
            ephemeral: true
        });
    }
});

// =====================
client.login(TOKEN);
