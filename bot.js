const Discord = require("discord.js");
const config = require("./config.json");
const client = new Discord.Client({ partials: ["USER", "GUILD_MEMBER", "REACTION"] });
const fetch = require('node-fetch');

let channel;
let impostor;
let playersList = [];
let playersAnswers = [];
let playersReactions = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
let isRunning = false;
let isStarted = false;
let round = 0;
let nbRound = 1;
let goodWord = "";
let badWord = "";

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
                else {
                    message.channel.send("Une partie est déjà en cours veuillez terminer cette dernière pour pouvoir en relancer une !");
                }
                break;

            case "start":
                if (playersList.length >= 1) {

                    isStarted = true;
                    startGame();
                }
                else
                    message.channel.send("Pas assez de joueur inscrit !");
                break;

            case "clear":
                message.channel.messages.fetch({ limit: 100 }).then(messages => {
                    message.channel.bulkDelete(messages)
                });
                break;

            case "word":
                if (message.channel.name != null) {
                    let player = playersList.find(player => player.user === message.author);
                    if (player != null) {
                        console.log("Processing word ..." + player.user.username.toString());
                        processWord(player, message.content.split(" ").join(" "));
                    }
                    else {
                        message.channel.send(message.author.toString() + " vous ne participez pas à la partie !");
                    }
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

async function getAPIRemi() {
    let resp;
    await fetch('http://127.0.0.1:5000/wordpair', {
    }).then((res) => {
        return res.json();
    }).then((res) => {
        resp = res;
    });
    return resp;
}


function playerRecovery(channel, id) {
    let msg_channel = channel;

    client.on("messageReactionAdd", (reaction, user) => {
        if (!isStarted && reaction.emoji.name == '👍' && reaction.message.id === id && user.username != "BOT IAE") {
            playersList.push(new Player(user, false));
            msg_channel.send(user.toString() + " participera pour la prochaine partie de l'undercover !");
        }
    });

    client.on("messageReactionRemove", (reaction, user) => {

        if (!isStarted && reaction.emoji.name == '👍' && reaction.message.id === id && user.username != "BOT IAE") {
            playersList = playersList.filter(player => player.user.username != user.username);
            msg_channel.send(user.toString() + " ne participera plus pour la prochaine partie de l'undercover !");
        }
    });
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

async function startGame() {
    round = 0;
    let win = false;
    impostor = playersList[getRandomInt(playersList.length)];
    APIWords = await getAPIRemi();
    badWord = APIWords.undercover_word;
    goodWord = APIWords.bystander_word;

    console.log("Les mots sont : " + goodWord + " / " + badWord);

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
        if (playersReactions.includes(reaction.emoji.name) && reaction.message.id === id && user.username != "BOT IAE") {
            let p = playersList.find(p => p.user === user);
            /* Si le joueur n'a jamais voté */
            if (p != null) {

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
            else {
                reaction.users.remove(user);
                channel.send(user.toString() + " vous ne participez pas à la partie !");
            }
        }
    })

    client.on("messageReactionRemove", (reaction, user) => {
        if (playersReactions.includes(reaction.emoji.name) && reaction.message.id === id && user.username !== "BOT IAE") {

            let p = playersList.find(p => p.user == user);
            let playerVoted = playersList.find(player => player.react === reaction.emoji.toString());

            if (p != null && p.voteChoice === playerVoted) {

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