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
let nbRound = 3;
let goodWord = "baleine";
let badWord = "requin";

// Set the prefix
let prefix = config.prefix;

function Player(user, locked) {
    this.user = user;
    this.locked = locked;
    this.voteChoice = null;
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
                    message.channel.send(message.author.toString() + " envoyez ce message dans le channel !")
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
        playersAnswers.push(player.user.toString() + " a écrit le mot : " + word.split(" ")[1]);
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
    let i = 0;

    playersList.forEach(p => {
        p.react = playersReactions[i];
        msg += (p.react + " : " + p.user.toString() + " ")
        i++;
    });

    channel.send("Voter pour l'imposteur de votre choix\n" + msg).then(function (sentMessage) {
        playersList.forEach(p => sentMessage.react(p.react));
        votingProcess(sentMessage.id);
    }).catch((e) => console.error('emoji failed to react.' + e));
}

function votingProcess(id) {
    let count = 0;

    client.on("messageReactionAdd", (reaction, user) => {
        if (reaction.message.id === id && user.username != "BOT IAE") {
            let p = playersList.find(p => p.user === user);
            /* Si le joueur n'a jamais voté */
            if (!p.voteChoice) {

                let playerVoted = playersList.find(player => player.react === reaction.emoji.toString());
                p.voteChoice = playerVoted;
                console.log(user.username.toString() + " a voté pour " + playerVoted.user.username.toString());
                playerVoted.vote++;
                if (++count >= playersList.length) {
                    let msg = "";
                    let voteMax = 0;
                    let playerChoosen;

                    playersList.forEach(player => {
                        msg += player.user.toString() + " a reçu " + player.vote + " vote(s)\n";

                        if (player.vote > voteMax) {
                            voteMax = player.vote;
                            playerChoosen = player;
                        }
                    });

                    channel.send("Vote terminé !\nRésultats :\n" + msg);
                    channel.send(playerChoosen.user.toString() + " a été désigné Imposteur !");

                    if (playerChoosen === impostor) {
                        channel.send("Bien joué ! L'imposteur était bien " + impostor.user.toString());
                    }
                    else {
                        channel.send("Dommage ! L'imposteur était " + impostor.user.toString());
                    }
                }
            }
            /* Si le joueur a deja vote on enleve le vote */
            else {
                reaction.users.remove(user);
                channel.send(user.toString() + " vous ne pouvez pas voter pour deux personnes différentes !");
            }
        }
    })

    client.on("messageReactionRemove", (reaction, user) => {
        if (reaction.message.id === id && user.username !== "BOT IAE") {

            let p = playersList.find(p => p.user == user);
            let playerVoted = playersList.find(player => player.react === reaction.emoji.toString());

            if (p.voteChoice === playerVoted) {

                console.log(user.username.toString() + " a enlevé son vote pour " + playerVoted.user.username.toString());

                playerVoted.vote--;
                p.voteChoice = null;
                count--;
            }
            else {
                console.log("Le bot a enlevé un vote");
            }
        }
    })
}