const { Client, Collection, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const fs = require('fs');

//setup client bot
const client = new Client({
        intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});
client.commands = new Collection();
client.commandArray = [];

//load function handlers
const functionFolders = fs.readdirSync("./src/functions");
for (const folder of functionFolders){
    const functionFiles = fs
        .readdirSync(`./src/functions/${folder}`)
        .filter((file) => file.endsWith(".js"));

    for (const file of functionFiles){
        require(`./functions/${folder}/${file}`)(client);
    }
}

//load handlers
client.handleCommands();
client.handleEvents();
client.login(process.env.DISCORD_TOKEN_DEV);


function isPublicChannel(channel){
    const guild = channel.guild;
    const everyone = guild.roles.everyone;
    return channel.permissionsFor(everyone).has(PermissionsBitField.Flags.ViewChannel);
}


