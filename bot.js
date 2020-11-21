const Discord = require("discord.js");
const config = require("./config.json");
const client = new Discord.Client();

let playersList = [];
let playersAnswers = [];
let isRunning = false;
let round = 0;
let nbRound = 5;
let goodWord = "baleine";
let badWord = "requin";

// Set the prefix
let prefix = config.prefix;

function Player(user, locked){
  this.user = user;
  this.locked = locked;
}


client.on("message", (message) => {
  // Exit and stop if the prefix is not there or if user is a bot
  if (!message.content.startsWith(prefix) || message.author.bot) return;
  else {
    switch (message.content.substr(1, message.content.length - 1).split(" ")[0]) {
      case "hello":
        message.channel.send("Salut " + message.author.toString());
        break;

      case "undercover":
        if (!isRunning) {
          message.channel.send("@everyone Réagissez au message ci-dessous pour participer à la partie").then(function (sentMessage) {
            sentMessage.react('👍');
            playerRecovery(sentMessage.channel, sentMessage.id);
          }).catch((e) => console.error('emoji failed to react.' + e));
          isRunning = true;
        }
        break;

      case "start":
        startGame();
        break;

      case "clear":
        message.channel.messages.fetch({ limit: 100 }).then(messages => {
          message.channel.bulkDelete(messages)
        });
        break;

      case "word":
        console.log("Processing word ...");
        processWord(message.author, message.content.split(" ").join(" "));
        break;


    }
  }

});

client.login(config.token);

function playerRecovery(channel, id) {
  let msg_id = id;
  let msg_channel = channel;
  client.on("messageReactionAdd", (reaction, user) => {
    if (reaction.message.id === id && user.username != "BOT IAE") {
      playersList.push(new Player(user, false));
      msg_channel.send(user.toString() + " participera pour la prochaine partie de l'undercover !");
    }
  })

  client.on("messageReactionRemove", (reaction, user) => {
    if (reaction.message.id === id && user.username != "BOT IAE") {
      playersList = playersList.filter(player => player.user.username != user.username);
      msg_channel.send(user.toString() + " ne participera plus pour la prochaine partie de l'undercover !");
    }
  })
}

function startGame() {
  let win = false;
  let impostor = playersList[0];
  console.log("Imposteur : " + impostor.user.username);
  impostor.user.send("Voici votre mot : " + badWord);
  playersList.filter(player => player !== impostor).forEach(player => player.user.send("Voici votre mot : " + goodWord));
}

function processWord(user, word)
{
  console.log(user + " " + word);
}
