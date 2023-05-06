const { PermissionsBitField } = require('discord.js');
const { Configuration, OpenAIApi} = require('openai');

//setup openai
const configuration = new Configuration({
    organization: process.env.OPENAI_ORG,
    apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

module.exports = {
    name: 'messageCreate',//event name must match discord event name
    once: false, 
    async execute(message, client) {
        try{
        if(message.author.bot) return;
        if(message.content.startsWith('!')) return;//normal message
        if(!(message.channel.name.startsWith('bot') || !isPublicChannel(message.channel))) return;//only reply in bot chat or private chat
        if(message.content.startsWith('%end')){
            console.log("End Conversation");
            message.reply("=== End Current Conversation ===");
            return;
        }

        //record conversations
        let conversationLog = [{role: 'system', content: "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond all questions using markdown."}];

        console.log(`message channel: ${message.channel.name}, channel type: ${message.channel.type}`);

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
        //console.log(conversationLog);
        let returnMessage;
        let returnContent;
        try{
            const result = await openai.createChatCompletion({
                model:'gpt-3.5-turbo',
                messages: conversationLog
            });
            returnMessage = result.data.choices[0].message;
            returnContent = returnMessage.content;
        }catch(err){
            console.log("chat error: "+err.message);
            returnMessage = `openai API error with ${err.message}. \nPlease input '%end' to start a new conversaion`;
        }

        if(returnContent.length > 2000){
            console.log(`response message length ${returnContent.length} excedds 2000 chrarcters limit`);
            const pageSize = 1980;
            
            let partialResponse = null;
            let pageNumber = Math.ceil(returnContent.length / pageSize );

            for(let currentPage = 0; currentPage < pageNumber; currentPage++){
                let partialResponse = returnContent.slice(currentPage * pageSize, (currentPage+1)*pageSize);
                partialResponse = `[${currentPage+1}/${pageNumber}] ` + partialResponse;
                await finalChannel.send(partialResponse);
                console.log(`Page ${currentPage+1} sent`);
            }
        }else{
            await finalChannel.send(returnContent);
        }
        
        console.log("message Sent");
        return;
    } catch(err){
        console.log(err)
    }
    }
}

function isPublicChannel(channel){
    const guild = channel.guild;
    const everyone = guild.roles.everyone;
    return channel.permissionsFor(everyone).has(PermissionsBitField.Flags.ViewChannel);
}