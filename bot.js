const Discord = require("discord.js");
const config = require("./config.json");
const client = new Discord.Client();

 
// Set the prefix
let prefix = config.prefix;
client.on("message", (message) => {
  // Exit and stop if the prefix is not there or if user is a bot
  if (!message.content.startsWith(prefix) || message.author.bot) return;
  else
  {
      switch(message.content.substr(1, message.content.length - 1)) 
      {
        case "hello" :
            message.channel.send("Salut " + message.author.toString());
            break;
      }
  }
  
});
 
client.login(config.token);