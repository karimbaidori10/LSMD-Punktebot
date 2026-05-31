require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

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
        .addUserOption(opt =>
            opt.setName("user").setDescription("User").setRequired(true)
        )
        .addIntegerOption(opt =>
            opt.setName("points").setDescription("Punkte").setRequired(true)
        )
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log("⏳ Registriere Commands...");

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );

        console.log("✅ Commands fertig!");
    } catch (err) {
        console.error(err);
    }
})();
