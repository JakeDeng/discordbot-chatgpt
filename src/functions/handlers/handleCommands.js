const fs = require('fs');

module.exports = (client) => {
    //add a new function to client object
    client.handleCommands = async() => {
        console.log("Attach Command Handlers");
        const commandFolders = fs.readdirSync('./src/commands');
        for (const folder of commandFolders){
            const commandFiles = fs.readdirSync(`./src/commands/${folder}`)
                .filter((file) => file.endsWith(".js"));

            const {commands, commandArray} = client;
            for(const file of commandFiles){
                //command is coming from the file
                const command = require(`../../commands/${folder}/${file}`);
                commands.set(command.data.name, command);
                commandArray.push(command.data.toJSON());
                console.log(`Command: ${command.data.name} has been registered to the handler`);
            }
        }
        console.log("Attach Command Handlers Done");
    }
}