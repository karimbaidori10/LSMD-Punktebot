require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

client.once("clientReady", (client) => {
    console.log("=================================");
    console.log(`✅ Bot online als ${client.user.tag}`);
    console.log(`📡 Server: ${client.guilds.cache.size}`);
    console.log("=================================");
});

client.on("error", (error) => {
    console.error("❌ Discord Fehler:");
    console.error(error);
});

client.on("warn", (warning) => {
    console.warn("⚠️ Warnung:");
    console.warn(warning);
});

process.on("unhandledRejection", (error) => {
    console.error("❌ Unhandled Rejection:");
    console.error(error);
});

process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught Exception:");
    console.error(error);
});

if (!process.env.TOKEN) {
    console.error("❌ Kein TOKEN in der .env gefunden!");
    process.exit(1);
}

client.login(process.env.TOKEN);