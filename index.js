var Bot = require('slackbots');
var jsonfile = require('jsonfile')
var command_modules = require('./command_modules');
var sha1 = require('sha1');
var fs = require('fs');
var MarkovChain = require('markovchain')

var general_channel = 'C02JZTC78'; // #general
// var general_channel = 'GESC56Q6R'; // test room
//var general_channel = 'C9Z3QHTEG' // #threadcoin

var OVERRIDE_COUNT = 400;

///////////////////////////
// Set things up to save settings
var user_settings_file = 'user_settings.json'
var user_settings = {};
function load_settings() {
    if(fs.existsSync(user_settings_file)) {
        jsonfile.readFile(user_settings_file, function(err, obj) {
            if(!err) {
                user_settings = obj;
            }
        })
    }
}

function save_settings() {
    jsonfile.writeFile(user_settings_file, user_settings, {spaces: 2}, function(err) {
        if(err) {
            console.error(err);
        }
    });
}

function set_stage() {
    // Only set the stage if user settings don't exist
    if(!fs.existsSync(user_settings_file)) {
        // Give the introductory message
        send_message(general_channel, ":tada: :tada: Happy April 1st. :tada: :tada: \n\r\
This year everybody has been quite busy, and so instead of our normal chaotic festivities we will celebrate with a simple gift: you have been given your very own robot simulation of yourself.\n\r\
Please say hello to your bot (named `YOURNAMEbot` e.g. `erekalperbot` or `lylabot`).\n\r\
\n\r\
Have fun and take a moment to relax with your new, friendly companion! Oh, by the way your bot is very impressionable and wants to spend time with you. The more you talk the more it learns and loves.");
    }
}

///////////////////////////
// user settings stuff

function prepUserState(userId) {
    if(!user_settings[userId]) {
        user_settings[userId] = {
            message_count: 0
        };
    }
}
function recordUserMessage(userId, text) {
    prepUserState(userId);
    user_settings[userId].message_count += 1;
    fs.appendFileSync('users/' + userId + '.txt', text + "\n");
    botDict[getBotName(getUser(userId))].parse(text);
    save_settings();
}

/////////////////////////////
// Load up the markov chains
var userDict = {};
var botDict = {};

function loadUsers() {
    admin_bot.getUsers().then(function(data) {
        var users = data["members"];
        for(var x in users) {
            var user = users[x];
            userDict[user.id] = user;
            createBot(user);
        }
    });
}

function createBot(user) {
    try {
        var filePath = 'users/' + user.id + ".txt";
        var content = fs.readFileSync(filePath, 'utf8');
        var botModel = new MarkovChain(cleanCharacters(content));
        var botName = getBotName(user);
        botDict[botName] = botModel;
    } catch (e) {
        return "";
    }
}

function getBotName(user) {
    return user.profile.display_name + "bot";
}

function getBot(user) {
    var botName = getBotName(user);
    if(botName in botDict) {
        return botDict[botName];
    }
    var newBot = new MarkovChain("");
    botDict[botName] = newBot;
    return newBot;
}

function getUser(userId) {
    return userDict[userId];
}

function cleanCharacters(text) {
    return text
        .replace(/[()\"]/g,"")
        .replace(/http\:([^\s])*/g, "");
}

///////////////////////////
// Create the bots
var bot_settings = {}
var admin_settings = {}
var config_file = 'config.json';
obj = jsonfile.readFileSync(config_file);
bot_settings = obj['bot_settings'];
admin_settings = obj['admin_settings'];

var admin_bot = new Bot(admin_settings, false);
var bot = new Bot(bot_settings, true);

///////////////////////////
// Helper methods
function is_command(text) {
    return text.charAt(0) == "!";
}

function parse_command(text) {
    var message_pieces = text.split(" ");
    var command = (message_pieces.length > 0)?message_pieces[0].slice(1):"";
    var parameters = message_pieces.slice(1);

    return {
        "command": command,
        "parameters": parameters
    };
}

function should_process_this_message(message) {
    return message.type == "message"
        && !message.hidden
        && !message.bot_id;
}

function process_command(message) {
    var command_pieces = parse_command(message.text);
    var command = command_pieces.command;
    var user = message.user;
    var parameters = command_pieces.parameters;
    var output = invoke_command(user, command, parameters);
    if(output != "") {
        send_message(message.channel, output);
    }
}

// This lets us run commands without messages being the trigger
function invoke_command(user, command, parameters, ignore_cost, no_followup) {
    // Check if this is a registered command
    if(command in command_modules) {
        // Make sure the user has a settings entry
        if(!(user in user_settings)){
            user_settings[user] = {};
        }

        // Run the command
        var module_response = command_modules[command].invoke_module(user, user_settings[user], parameters, ignore_cost);
        user_settings[user] = module_response.settings;

        // Update reality
        if(!no_followup) {
            update_reality();
        }

        // Save reality
        save_settings();

        // Hard coded, but whatever.
        if(command == "change_name") {
            change_alias(user, user_settings[user]["name"]);
        }

        if(command == "listemoji") {
            module_response.message += "\n\r" + listemoji();
        }
        if(command == "leaderboard") {
            module_response.message += "\n\r" + leaderboard();
        }

        return module_response.message;
    } else {
        return "'" + command + "' is not a valid command.";
    }
}

///////////////////////////
// Slack Methods

/**
 * Returns true if a message should be processed
 * Messages should not be processed if they are hidden, not messages
 * or were created by bots
 */

/**
 * Uses the admin account to delete a message
 */
function delete_message(message) {
    admin_bot._api('chat.delete', {
        "token": admin_settings.token,
        "ts": message.ts,
        "channel": message.channel,
        "as_user": true
    }).then(function(e) {
        console.log(e);
    });
}

function send_message(channel, text) {
    if(text != "") {
        bot._api('chat.postMessage', {
            "token": bot_settings.token,
            "channel": channel,
            "text": text
        });
    }
}

///////////////////////////
// Process every message on slack
bot.on('message', function(message) {
    if(should_process_this_message(message)) {
        delete_message(message);
        setTimeout(function() {
            delete_message(message);
        }, 500);

        prepUserState(message.user);
        var messageCount = user_settings[message.user].message_count;

        // Augment the message
        var oldWords = message.text.split(" ");
        var newWords = [];
        var botName = getBotName(getUser(message.user));
        var personalBot = getBot(getUser(message.user));
        var counter = 0
        var word = ""
        var moddedWord = false
        for(var x in oldWords) {
            counter += 1;
            var previousWord = word;
            word = oldWords[x];
            if(messageCount > 10
            && Math.random() > (OVERRIDE_COUNT - messageCount) / OVERRIDE_COUNT
            && messageCount < 40) {
                if(oldWords.length == 1) {
                    newWord = personalBot.end(1).process().split(" ")[0];
                } else {
                    var markov = personalBot.start(previousWord).process();
                    newWord = markov.split(" ")[1];
                }
                moddedWord = true;
            } else {
                newWord = word;
            }
            if(newWord == "") {
                newWord = word;
            }
            newWords.push(newWord);
        }

        var humanMessage = newWords.join(" ");

        // Craft the bot message
        var words = message.text.split(" ");
        var start = message.text.split(" ")[0];
        var botName = getBotName(getUser(message.user));
        var botMessage = personalBot.start(start).end(words.length + Math.floor(Math.random() * 5)).process();

        // Send the messages
        if(messageCount > 60) {
            send_message(message.channel, "`<" + userDict[message.user].profile.display_name + ">` " + botMessage);
            setTimeout(function() {
                send_message(message.channel, "`<" + botName + ">` " + humanMessage);
            }, 500 + Math.random() * (2000));
        } else {
            send_message(message.channel, "`<" + userDict[message.user].profile.display_name + ">` " + humanMessage);
            setTimeout(function() {
                send_message(message.channel, "`<" + botName + ">` " + botMessage);
            }, 500 + Math.random() * (2000));
        }

        // Record the message last
        recordUserMessage(message.user, message.text);
    }
});

function botChatter() {
    Object.entries(user_settings).forEach(function(entry) {
        var user = entry[0]
        var messageCount = entry[1].message_count;

        if(Math.random() < messageCount / 2000) {
            setTimeout(function() {
                var botName = getBotName(getUser(user));
                var personalBot = getBot(getUser(user));
                var botMessage = personalBot.end(Math.random() * 10).process();
                var displayName = botName;
                send_message(general_channel, "`<" + displayName + ">` " + botMessage);
            }, Math.random() * (60000));
        }
    });
}

// Make sure we have saved before destroying the world
// save_normality();

// Set the stage
set_stage();
loadUsers();


// chance to trigger bots every minute
setInterval(botChatter, 60000);

botChatter();

// Load settings
load_settings();