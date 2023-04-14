const {Client, GatewayIntentBits} = require('discord.js');
const { Configuration, OpenAIApi} = require('openai');
//setup openai
const configuration = new Configuration({
    //organization: process.env.OPENAI_ORG,
    apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

//setup discord bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.on('ready', () => {
  console.log(`Bot Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    try{
        if(message.author.bot) return;
        if(message.content.startsWith('!')) return;//normal message
        if(message.content.startsWith('%end')){
            console.log("End Conversation");
            message.reply("=== End Current Conversation ===");
            return;
        }
        console.log("Start Conversation");
        //record conversations
        let conversationLog = [{role: 'system', content: "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown."}];

        await message.channel.sendTyping();
        //fetch last 30 messages
        let prevMessages = await message.channel.messages.fetch({limit: 30});
        let endKey = prevMessages.findKey((msg) => {
            return msg.content.startsWith('%end');
        });

        const filteredMessages = prevMessages.filter((msg, key) => {
            return key > endKey;
        })

        filteredMessages.reverse();
        filteredMessages.forEach((msg) => {
            if(message.content.startsWith('!')) return;
            //if(msg.author.id !== client.user.id && message.author.bot) return;
            if(msg.author.id !== message.author.id) return;
            conversationLog.push({
                role: 'user',
                content: msg.content,
            })
        });
        //console.log(conversationLog);
        
        const result = await openai.createChatCompletion({
            model:'gpt-3.5-turbo',
            messages: conversationLog,
            temperature: 0.6
        })
        
        message.reply(result.data.choices[0].message);
        console.log("Reply Sent");
        return;
    } catch(err){
        console.log(err)
    }
});

client.login(process.env.DISCORD_TOKEN);