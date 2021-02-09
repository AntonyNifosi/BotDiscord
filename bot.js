const Discord = require("discord.js");
const config = require("./config.json");
const client = new Discord.Client({ partials: ["USER", "GUILD_MEMBER", "REACTION"] });

let channel;
let impostor;
let playersList = [];
let playersAnswers = [];
let playersReactions = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
let isRunning = false;
let votingTime = false;
let round = 0;
let nbRound = 4;
let goodWord = "baleine";
let badWord = "requin";

// Set the prefix
let prefix = config.prefix;

function Player(user, locked, react) {
    this.user = user;
    this.locked = locked;
    this.react = react;
    this.hasVoted = false;
    this.vote = 0;
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
                    channel = message.channel;
                    message.channel.send("@everyone Réagissez au message ci-dessous pour participer à la partie").then(function (sentMessage) {
                        sentMessage.react('👍');
                        playerRecovery(sentMessage.channel, sentMessage.id);
                    }).catch((e) => console.error('emoji failed to react.' + e));
                    isRunning = true;
                }
                break;

            case "start":
                if (playersList.length >= 1)
                    startGame();
                else
                    channel.send("Pas assez de joueur inscrit !");
                break;

            case "clear":
                message.channel.messages.fetch({ limit: 100 }).then(messages => {
                    message.channel.bulkDelete(messages)
                });
                break;

            case "word":
                if (message.channel.name != null) {
                    let player = playersList.find(player => player.user === message.author);
                    console.log("Processing word ..." + player.user.username.toString());
                    processWord(player, message.content.split(" ").join(" "));
                }
                else {
                    message.delete();
                    message.channel.send(message.author.toString() + " envoyez ce message en privé !")
                }
                break;
        }
    }

});

client.login(config.token);

function playerRecovery(channel, id) {
    let msg_channel = channel;
    client.on("messageReactionAdd", (reaction, user) => {
        if (reaction.message.id === id && user.username != "BOT IAE") {
            playersList.push(new Player(user, false, playersReactions[playersList.length]));
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
    round = 0;
    let win = false;
    impostor = playersList[0];
    console.log("Imposteur : " + impostor.user.username);
    impostor.user.send("Voici votre mot : " + badWord);
    playersList.filter(player => player !== impostor).forEach(player => player.user.send("Voici votre mot : " + goodWord));
}

function processWord(player, word) {
    if (player.locked)
        console.log(player.user.username + " a déjà rentré un mot");
    else {
        player.locked = true;
        playersAnswers.push(player.user.username.toString() + " a écrit le mot : " + word.split(" ")[1]);
        if (playersAnswers.length >= playersList.length)
            endOfRound();
    }
}

function endOfRound() {
    round++;
    playersAnswers.forEach(message => channel.send(message));
    if (round >= nbRound) {
        channel.send("Fin du round " + round + "\nIl est temps de voter ! Réagissez pour la personne qui serait l'imposteur");
        votingTime = true;
        votingChoice();
    }
    else {
        channel.send("Fin du round " + round + " écrivez un autre mot")
        playersList.forEach(player => {
            player.locked = false;
        });
    }
    playersAnswers = [];
}

function votingChoice() {
    let msg = "";
    playersList.forEach(p => msg += (p.react + " : " + p.user.username.toString() + " "));
    channel.send("Voter pour l'imposteur de votre choix, une fois le vote fini appuyer sur ✅\n" + msg).then(function (sentMessage) {
        playersList.forEach(p => sentMessage.react(p.react));
        sentMessage.react('✅');
        votingProcess(sentMessage.id);
    }).catch((e) => console.error('emoji failed to react.' + e));

}

function votingProcess(id) {

    client.on("messageReactionAdd", (reaction, user) => {
        if (reaction.message.id === id && user.username != "BOT IAE" && reaction.emoji.toString() != '✅') {
            user.hasVoted = true;
            playersList.forEach(p => console.log(p.hasVoted));
            let playerVoted = playersList.find(player => player.react === reaction.emoji.toString());
            console.log(user.username.toString() + " a voté pour " + playerVoted.user.username.toString());
            playerVoted.vote++;
        }

        if (reaction.message.id === id && reaction.emoji.toString() === '✅' && user.username != "BOT IAE") {
            if (reaction.count >= playersList.length + 1) {
                let msg = "";
                let voteMax = 0;
                let playerChoosen;
                playersList.forEach(player => {
                    msg += player.user.username.toString() + " a reçu " + player.vote + " vote(s)\n";
                    if (player.vote > voteMax) {
                        voteMax = player.vote;
                        playerChoosen = player;
                    }
                });
                channel.send("Vote terminé !\nRésultats :\n" + msg);
                channel.send(playerChoosen.user.username.toString() + " a été désigné Imposteur !");
                if (playerChoosen === impostor) {
                    channel.send("Bien joué ! L'imposteur était bien " + impostor.user.username.toString());
                }
                else {
                    channel.send("Dommage ! L'imposteur était " + impostor.user.username.toString());
                }
            }
        }
    })

    client.on("messageReactionRemove", (reaction, user) => {
        if (reaction.message.id === id && user.username !== "BOT IAE" && reaction.emoji.toString() !== '✅') {
            let playerVoted = playersList.find(player => player.react === reaction.emoji.toString());
            console.log(user.username.toString() + " a enlevé son vote pour " + playerVoted.user.username.toString());
            playerVoted.vote--;
        }
    })
}