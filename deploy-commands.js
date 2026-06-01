require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

// Debug
console.log("CLIENT_ID =", process.env.CLIENT_ID);
console.log("GUILD_ID  =", process.env.GUILD_ID);
console.log(
    "TOKEN OK?  =",
    process.env.DISCORD_TOKEN ? "JA" : "NEIN"
);

const commands = [
    new SlashCommandBuilder()
        .setName("panel")
        .setDescription("Öffnet das LSMD Punkte Panel"),

    new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("Zeigt die Top 10 Ausbilder"),

    new SlashCommandBuilder()
        .setName("addpoints")
        .setDescription("Gibt einem User Punkte (Admin)")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User auswählen")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("points")
                .setDescription("Anzahl Punkte")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("removepoints")
        .setDescription("Entfernt einem User Punkte (Admin)")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User auswählen")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("points")
                .setDescription("Anzahl Punkte")
                .setRequired(true)
        )
].map(command => command.toJSON());

const rest = new REST({ version: "10" })
    .setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log("⏳ Registriere Slash Commands...");

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );

        console.log("✅ Slash Commands registriert!");
        console.log("📌 Registriert:");
        console.log("/panel");
        console.log("/leaderboard");
        console.log("/addpoints");
        console.log("/removepoints");
    } catch (error) {
        console.error("❌ Fehler:");
        console.error(error);
    }
})();
