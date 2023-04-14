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
        //fetch last 30 messages from the same channel
        let prevMessages = await message.channel.messages.fetch({limit: 30});
        let endKey = prevMessages.findKey((msg) => {
            return msg.content.startsWith('%end');
        });
        const filteredMessages = prevMessages.filter((msg, key) => {
            return key > endKey;
        })
        filteredMessages.reverse();
        filteredMessages.delete(filteredMessages.at(0).id);
        console.log(filteredMessages.at(0));
        filteredMessages.forEach((msg) => {
            if(message.content.startsWith('!')) return;
            //if(msg.author.id !== client.user.id && message.author.bot) return;
            //message sent by other user that is not a bot
            if(msg.author.id !== message.author.id && !msg.author.bot) return;
            conversationLog.push({
                role: (msg.author.bot)? 'assistant':'user',
                content: msg.content,
            })
        });
        console.log(conversationLog);
        
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

//============================================================
//setup dev bot
const clientDev = new Client({
        intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

clientDev.on('ready', () => {
  console.log(`Bot Logged in as ${clientDev.user.tag}!`);
});

clientDev.on('messageCreate', async (message) => {
    try{
        if(message.author.bot) return;
        if(message.content.startsWith('!')) return;//normal message
        if(message.content.startsWith('%end')){
            console.log("End Conversation");
            message.reply("=== End Current Conversation ===");
            return;
        }

        //record conversations
        let conversationLog = [{role: 'system', content: "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown."}];

        console.log("check message channel");
        const msgChannel = message.channel;
        let finalChannel = null;
        if(!msgChannel.isThread()){
            console.log("message has no thread, create thread");
            const msgThread = await message.startThread({
                name: `thread-${message.id}`,
                autoArchiveDuration: 10080,//one week
            });
            finalChannel = msgThread;
            console.log(`message thread id ${msgThread.id}`);
            //add first user message into conversation log
            conversationLog.push({
                role: 'user',
                content: message.content
            });
        }else{
            finalChannel = msgChannel;
            console.log(`message has thread ${msgChannel.id}`)
        }

        console.log("Start Conversation");

        await finalChannel.sendTyping();
        //fetch last 30 messages from the same channel
        let prevMessages = await finalChannel.messages.fetch({limit: 30});
        let endKey = prevMessages.findKey((msg) => {
            return msg.content.startsWith('%end');
        });

        let filteredMessages = null;
        if(endKey){
            filteredMessages = prevMessages.filter((msg, key) => {
                return key > endKey;
            })
        }else{
            filteredMessages = prevMessages;
        }
        filteredMessages.reverse();
        
        if(endKey){
            filteredMessages.delete(filteredMessages.at(0).id);
        }
        filteredMessages.forEach((msg) => {
            if(msg.type == 21) return;//exclude thread starter message
            if(msg.content.startsWith('!')) return;
            if(msg.author.id !== message.author.id && !msg.author.bot) return;
            conversationLog.push({
                role: (msg.author.bot)? 'assistant':'user',
                content: msg.content,
            })
        });
        console.log(conversationLog);
        
        const result = await openai.createChatCompletion({
            model:'gpt-3.5-turbo',
            messages: conversationLog
        })
        
        finalChannel.send(result.data.choices[0].message);
        console.log("message Sent");
        return;
    } catch(err){
        console.log(err)
    }
});

clientDev.login(process.env.DISCORD_TOKEN_DEV);
