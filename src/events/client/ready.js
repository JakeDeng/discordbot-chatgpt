module.exports = {
    name: 'ready',//event name must match discord event name
    once: true, //only execute once
    async execute(client) {
        console.log(`Bot Logged in as ${client.user.tag}!`);
    }
}