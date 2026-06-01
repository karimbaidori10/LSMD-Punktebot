// cache-bust: force rebuild with current package-lock.json
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
const MONGO_URI = mustGetEnv("MONGO_URI");
const LEITUNG_LOG_CHANNEL_ID = mustGetEnv("LEITUNG_LOG_CHANNEL_ID");

// =====================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// =====================
const adminState = new Map();
const handledInteractions = new Set();
const mongo = new MongoClient(process.env.MONGO_URI);

let pointsCollection;
async function getPoints(userId) {

    const data = await pointsCollection.findOne({
        userId
    });

    return data?.points || 0;
}

async function setPoints(userId, points) {

    await pointsCollection.updateOne(
        { userId },
        {
            $set: {
                userId,
                points
            }
        },
        {
            upsert: true
        }
    );
}

async function getAllPoints() {

    const users = await pointsCollection.find({}).toArray();

    const result = {};

    for (const user of users) {
        result[user.userId] = user.points;
    }

    return result;
}
// =====================
client.once(Events.ClientReady, async () => {

    await mongo.connect();

    const db = mongo.db("lsmd");

    pointsCollection = db.collection("points");

    console.log("✅ MongoDB verbunden");
    console.log("✅ Collection:", pointsCollection.collectionName);
    console.log(`🤖 Online als ${client.user.tag}`);
});


// =====================
setInterval(async () => {
    const now = new Date();

    if (now.getDay() === 0 && now.getHours() === 19 && now.getMinutes() === 30) {
        const allPoints = await getAllPoints();
        for (const userId of Object.keys(allPoints)) {
            await setPoints(userId, 0);
        }
        console.log("🔁 Weekly Reset DONE");
    }
}, 60000);

// =====================
client.on(Events.InteractionCreate, async (interaction) => {

    if (handledInteractions.has(interaction.id)) return;
    handledInteractions.add(interaction.id);
    setTimeout(() => handledInteractions.delete(interaction.id), 60000);

    let db = await getAllPoints();

    if (interaction.isChatInputCommand() && interaction.commandName === "leaderboard") {

    const sorted = Object.entries(db)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const leaderboardEmbed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle("🏆 Prakti Sani Punkte Leaderboard")
        .setTimestamp();

    let description = "";

    if (sorted.length === 0) {
        description = "Keine Daten vorhanden.";
    } else {
        for (let i = 0; i < sorted.length; i++) {
            const [userId, points] = sorted[i];

            let medal = "🔹";
            if (i === 0) medal = "🥇";
            if (i === 1) medal = "🥈";
            if (i === 2) medal = "🥉";

            description += `${medal} <@${userId}> — **${points} Punkte**\n`;
        }
    }

    leaderboardEmbed.setDescription(description);

    return interaction.reply({
        embeds: [leaderboardEmbed]
    });
}

    if (interaction.isChatInputCommand() && interaction.commandName === "addpoints") {

    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (!member.roles.cache.has(ADMIN_ROLE_ID)) {
        return interaction.reply({
            content: "❌ Keine Berechtigung.",
            ephemeral: true
        });
    }

    const target = interaction.options.getUser("user");
    const points = interaction.options.getInteger("points");

    if (!db[target.id]) db[target.id] = 0;

    db[target.id] -= points;

    if (db[target.id] < 0) db[target.id] = 0;

    await setPoints(target.id, db[target.id]);

    const logEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle("📉 LSMD Punkte entfernt")
        .addFields(
            { name: "👤 User", value: `<@${target.id}>`, inline: true },
            { name: "👮 Leitung", value: `<@${interaction.user.id}>`, inline: true },
            { name: "➖ Entfernt", value: `${points}`, inline: true },
            { name: "🏆 Neuer Stand", value: `${db[target.id]} Punkte` }
        )
        .setTimestamp();

    let leitungLog;
    try {
        leitungLog = await client.channels.fetch(LEITUNG_LOG_CHANNEL_ID);
    } catch {}

    if (leitungLog) {
        await leitungLog.send({ embeds: [logEmbed] });
    }

    return interaction.reply({
        content: `✅ ${points} Punkte von ${target.tag} entfernt.\n🏆 Neuer Stand: ${db[target.id]} Punkte`,
        ephemeral: true
    });
}

    const target = interaction.options.getUser("user");
    const points = interaction.options.getInteger("points");

    if (!db[target.id]) db[target.id] = 0;

    db[target.id] += points;

    if (db[target.id] < 0) db[target.id] = 0;

    await setPoints(target.id, db[target.id]);

    const logEmbed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("📊 LSMD Punkte Änderung")
        .addFields(
            { name: "👤 User", value: `<@${target.id}>`, inline: true },
            { name: "👮 Admin", value: `<@${interaction.user.id}>`, inline: true },
            { name: "➕ Änderung", value: `${points}`, inline: true },
            { name: "🏆 Neuer Stand", value: `${db[target.id]} Punkte` }
        )
        .setTimestamp();

    let leitungLog;
try {
    leitungLog = await client.channels.fetch(LEITUNG_LOG_CHANNEL_ID);
} catch {}

if (leitungLog) {
    await leitungLog.send({ embeds: [logEmbed] });
}

    return interaction.reply({
        content: `✅ ${points} Punkte für ${target.tag} verbucht.\n🏆 Neuer Stand: ${db[target.id]} Punkte`,
        ephemeral: true
    });
}
    // =====================
    // 📊 PANEL 
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
            new ButtonBuilder().setCustomId("p1").setLabel("🟢 Bewerber eingestellt (+1)").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("p2").setLabel("🔵 Alleine fahren Prüfung (+2)").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("p3").setLabel("🔴 Sanitäter Prüfung (+3)").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("me").setLabel("📊 Meine Punkte").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("admin").setLabel("👮 Leitungs Panel").setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({
            embeds: [embed],
            components: [row]
        });
    }

    // =====================
    // 🔘 BUTTONS (FIXED)
    // =====================
    if (interaction.isButton()) {

        const member = await interaction.guild.members.fetch(interaction.user.id);

        const isAdmin = member.roles.cache.has(ADMIN_ROLE_ID);

        if (!db[interaction.user.id]) db[interaction.user.id] = 0;

       let amount = 0;
let reason = "";

if (interaction.customId === "p1") {
    amount = 1;
    reason = "Bewerber eingestellt";
}

if (interaction.customId === "p2") {
    amount = 2;
    reason = "Alleine fahren Prüfung";
}

if (interaction.customId === "p3") {
    amount = 3;
    reason = "Sanitäter Prüfung";
}

        if (amount > 0) {
            db[interaction.user.id] += amount;
            await setPoints(interaction.user.id, db[interaction.user.id]);

            const log = await client.channels.fetch(LOG_CHANNEL_ID);

            let color = 0x2ECC71;
let emoji = "🟢";

if (amount === 2) {
    color = 0x3498DB;
    emoji = "🔵";
}

if (amount === 3) {
    color = 0xE74C3C;
    emoji = "🔴";
}

const ziel = 5;
const stand = db[interaction.user.id];

const logEmbed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${emoji} Aktion verbucht`)
    .setDescription(
        `<@${interaction.user.id}> hat **${reason}** erledigt.`
    )
    .addFields(
        {
            name: "Punkte",
            value: `+${amount}`,
            inline: true
        },
        {
            name: "Wochenstand",
            value: `${stand}/${ziel}`,
            inline: true
        },
        {
            name: "Status",
            value: stand >= ziel
                ? "✅ Ziel erreicht"
                : "⌛ Ziel noch nicht erreicht",
            inline: false
        }
    )
    .setFooter({
        text: `LSMD Punkte-System • ${new Date().toLocaleString("de-DE")}`
    });

log?.send({
    embeds: [logEmbed]
});

            return interaction.reply({
                content: `✅ +${amount} Punkte`,
                ephemeral: true
            });
        }

        // 📊 USER POINTS (ALLE)
        if (interaction.customId === "me") {
            return interaction.reply({
                content: `📊 Punkte: ${db[interaction.user.id] || 0}`,
                ephemeral: true
            });
        }

        // 👮 LEITUNGS PANEL (NUR LEITUNG!)
        if (interaction.customId === "admin") {

            if (!isAdmin) {
                return interaction.reply({
                    content: "❌ Keine Berechtigung",
                    ephemeral: true
                });
            }

            const members = await interaction.guild.members.fetch({ limit: 100 });
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
    // 👤 SELECT USER
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
    // ⚙️ SELECT ACTION
    // =====================
    if (interaction.isStringSelectMenu() && interaction.customId === "admin_action") {

        const state = adminState.get(interaction.user.id);

        if (!state?.target) {
            return interaction.reply({
                content: "❌ Erst User auswählen",
                ephemeral: true
            });
        }

        const val = interaction.values[0];

        let amount = 0;
        let reason = "";

        if (val === "add1") { amount = 1; reason = "Admin +1"; }
        if (val === "add2") { amount = 2; reason = "Admin +2"; }
        if (val === "add3") { amount = 3; reason = "Admin +3"; }
        if (val === "rem1") { amount = -1; reason = "Admin -1"; }
        if (val === "rem2") { amount = -2; reason = "Admin -2"; }
        if (val === "rem3") { amount = -3; reason = "Admin -3"; }

        if (!db[state.target]) db[state.target] = 0;

        db[state.target] += amount;
        if (db[state.target] < 0) db[state.target] = 0;

        await setPoints(state.target, db[state.target]);

        const adminEmbed = new EmbedBuilder()
    .setColor(amount > 0 ? 0x3498DB : 0xE74C3C)
    .setTitle("👮 LSMD • Leitung Aktion")
    .addFields(
        {
            name: "👤 Betroffener User",
            value: `<@${state.target}>`,
            inline: true
        },
        {
            name: "👮 Leitung",
            value: `<@${interaction.user.id}>`,
            inline: true
        },
        {
            name: "⚙️ Änderung",
            value: `${amount > 0 ? "+" : ""}${amount}`,
            inline: true
        },
        {
            name: "🏆 Neuer Punktestand",
            value: `${db[state.target]} Punkte`,
            inline: false
        }
    )
    .setFooter({
        text: "LSMD Leitungs-System"
    })
    .setTimestamp();

// 🔴 LEITUNG LOG (NEU)
let leitungLog;
try {
    leitungLog = await client.channels.fetch(LEITUNG_LOG_CHANNEL_ID);
} catch {}

leitungLog?.send({
    embeds: [
        new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle("🔒 Leitungs Aktion")
            .addFields(
                { name: "User", value: `<@${state.target}>`, inline: true },
                { name: "Admin", value: `<@${interaction.user.id}>`, inline: true },
                { name: "Änderung", value: `${amount}`, inline: true },
                { name: "Neuer Stand", value: `${db[state.target]} Punkte` }
            )
            .setTimestamp()
    ]
});

        return interaction.reply({
            content: "✅ Aktion gespeichert",
            ephemeral: true
        });
    }
});

client.login(TOKEN);
