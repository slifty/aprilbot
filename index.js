var Bot = require('slackbots');
var jsonfile = require('jsonfile')
var command_modules = require('./command_modules');
var fs = require('fs');
const execSync = require('child_process').execSync;
var request = require('request')
var wrap = require('word-wrap')

// var general_channel = 'C02JZTC78'; // #general
//var general_channel = 'C9Z3QHTEG' // #threadcoin

var general_channel = 'GV5ENRZB3' // test room

var rate_limiter = 0 // how many posts since last rate limit reset

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
        send_message(general_channel, ":cats: :cats: :cats: MEOW! Happy April 1st. :cats: :cats: :cats: \n\r\
The real world is falling apart (*purrrr*), and so instead of simulating some type of digital apocalypse like we normally do around here :cat:, this year we will celebrate our quarantine by curling up :cat2: and watching a movie together.\n\r\
Please just go about your normal activities, and break out the :popcorn:! You have nothing to fur -- I mean fear.");

        user_settings['CATFRAME'] = 0
        save_settings();
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
        }
    });
}

function incrementGifIndex() {
    user_settings['CATFRAME']++;
    save_settings();
}

function createGif(userId, message) {
    try {
        var frame = user_settings['CATFRAME'];
        var rawPath = 'raw_gifs/' + frame + ".gif";
        var newPath = 'labeled_gifs/' + frame + ".gif";
        var user = getUser(userId);
        var userName = user.profile.display_name;
        var cleanMessage = wrapText(cleanCharacters(message));
        if(message == "") return "";
        var cleanUserName = cleanCharacters(userName) + " said: "
        var addUserNameCommand = "convert " + rawPath + " -font '/Library/Fonts/Arial Bold.ttf' -pointsize 32 -draw \"gravity north\
        fill black text -2,0 '" + cleanUserName + "'\
        fill black text 2,0 '" + cleanUserName + "'\
        fill black text 0,-2 '" + cleanUserName + "'\
        fill black text 0,2 '" + cleanUserName + "'\
        fill white text 0,0 '" + cleanUserName + "'\" " + newPath;
        runCommand(addUserNameCommand);
        var addMessageCommand = "convert " + newPath + " -font '/Library/Fonts/Arial Bold.ttf' -pointsize 18 -gravity South -fill black\
        -annotate +0+2 '" + cleanMessage + "'\
        -annotate +2+0 '" + cleanMessage + "'\
        -annotate +4+2 '" + cleanMessage + "'\
        -annotate +2+4 '" + cleanMessage + "'\
        -fill white\
        -annotate +2+2 '" + cleanMessage + "' " + newPath;
        runCommand(addMessageCommand);
        return newPath;
    } catch (e) {
        console.log(e)
        return "";
    }
}

function runCommand(command) {
    execSync(command)
}

function getUser(userId) {
    return userDict[userId];
}

function wrapText(text) {
    return wrap(text,{
        width: 38,
        indent: '',
    })
}

function cleanCharacters(text) {
    return text
        .replace(/[']/g,"")
        .replace(/http\:([^\s])*/g, "");
}

function multiline(text) {

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

function should_process_this_message(message) {
    return message.type == "message"
        && !message.hidden
        && !message.bot_id
        && !message.upload
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

function postGifToGeneral(gifPath) {
    var fileStream = fs.createReadStream(gifPath)

    request.post({
        url:'https://slack.com/api/files.upload',
        formData: {
            "token": admin_settings.token,
            "channels": general_channel,
            "file": fileStream,
            "filetype": 'gif',
            "filename": 'cats.gif',
            "title": "CATS!"
        }
    }, () => unlock())
}

cat_mutex = false
failsafe = null
function lock() {
    cat_mutex = true;
    failsafe = setTimeout(unlock, 60000) // after a minute we NEED CATS AGAIN
}

function unlock() {
    cat_mutex = false;
    clearTimeout(failsafe)
}

///////////////////////////
// Process every message on slack
bot.on('message', function(message) {
    if(should_process_this_message(message)) {
        // if(should_promote_cats(message)) {
        //     send_message(message.channel, "`<" + userDict[message.user].profile.display_name + ">` " + humanMessage);
        // }

        prepUserState(message.user);
        var messageCount = user_settings[message.user].message_count;

        // Generate cats gif
        if(rate_limiter <=2
        && !cat_mutex) {
            lock();
            rate_limiter++;
            var gifPath = createGif(message.user, message.text)
            if(gifPath) {
                postGifToGeneral(gifPath);
                incrementGifIndex();
            }
        }
    }
});


// Set the stage
set_stage();
loadUsers();

// Load settings
load_settings();

// reset rate limit every 10 seconds
function resetRateLimit() {
    rate_limiter = 0;
}
setInterval(resetRateLimit, 10000);