require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events
} = require("discord.js");

const fs = require("fs");

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const ROLE_NAME = "Prakti-Sani-Leitung";
const DATABASE = "./database.json";

function loadData() {
    return JSON.parse(fs.readFileSync(DATABASE, "utf8"));
}

function saveData(data) {
    fs.writeFileSync(DATABASE, JSON.stringify(data, null, 2));
}

client.once("clientReady", () => {
    console.log(`✅ Bot online als ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {

    if (interaction.isChatInputCommand()) {

        if (interaction.commandName === "panel") {

            if (!interaction.member.roles.cache.some(r => r.name === ROLE_NAME)) {
                return interaction.reply({
                    content: "❌ Keine Berechtigung.",
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setTitle("🚑 LSMD – Ausbilder Punktepanel")
                .setDescription(
                    "Wochenziel: **5 Punkte**\n\n" +
                    "🟢 Bewerber eingestellt = +1\n" +
                    "🔵 Alleine fahren Prüfung = +2\n" +
                    "🔴 Sanitäter Prüfung = +3"
                );

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("plus1")
                        .setLabel("Bewerber eingestellt (+1)")
                        .setStyle(ButtonStyle.Success),

                    new ButtonBuilder()
                        .setCustomId("plus2")
                        .setLabel("Alleine fahren Prüfung (+2)")
                        .setStyle(ButtonStyle.Primary),

                    new ButtonBuilder()
                        .setCustomId("plus3")
                        .setLabel("Sanitäter Prüfung (+3)")
                        .setStyle(ButtonStyle.Danger),

                    new ButtonBuilder()
                        .setCustomId("mypoints")
                        .setLabel("Meine Punkte")
                        .setStyle(ButtonStyle.Secondary)
                );

            return interaction.reply({
                embeds: [embed],
                components: [row]
            });
        }
    }

    if (interaction.isButton()) {

        let data = loadData();

        if (!data[interaction.user.id]) {
            data[interaction.user.id] = 0;
        }

        if (interaction.customId === "plus1") {
            data[interaction.user.id] += 1;
        }

        if (interaction.customId === "plus2") {
            data[interaction.user.id] += 2;
        }

        if (interaction.customId === "plus3") {
            data[interaction.user.id] += 3;
        }

        saveData(data);

        if (interaction.customId === "mypoints") {

            return interaction.reply({
                content:
                    `🏆 Deine Punkte: ${data[interaction.user.id] || 0}/5`,
                ephemeral: true
            });
        }

        return interaction.reply({
            content:
                `✅ Verbucht.\nAktueller Stand: ${data[interaction.user.id]}/5`,
            ephemeral: true
        });
    }

});

client.login(process.env.TOKEN);