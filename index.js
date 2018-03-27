var Bot = require('slackbots');
var jsonfile = require('jsonfile')
var command_modules = require('./command_modules');
var marioparty = require('./marioparty');
var sha1 = require('sha1');

var the_thread = '1488917437.000402';
// var marioparty_channel = 'C02JZTC78'; // #general
var marioparty_channel = 'G99E4G58X';

///////////////////////////
// Set things up to save settings
var user_settings_file = 'user_settings.json'
var user_settings = {};
jsonfile.readFile(user_settings_file, function(err, obj) {
    if(!err) {
        user_settings = obj;
    }
})

function save_settings() {
    jsonfile.writeFile(user_settings_file, user_settings, {spaces: 2}, function(err) {
        if(err) {
            console.error(err);
        }
    });
}

///////////////////////////
// Set things up to save threadcoin
var threadcoins_file = 'threadcoins.json'
var threadcoins = {};
jsonfile.readFile(threadcoins_file, function(err, obj) {
    if(!err) {
        threadcoins = obj;
    }
})

function save_threadcoins() {
    jsonfile.writeFile(threadcoins_file, threadcoins, {spaces: 2}, function(err) {
        if(err) {
            console.error(err);
        }
    });
}


///////////////////////////
// Set things up to grant threadcoin
var currentBlock = {}
function process_block() { 
    console.log("processing block");
    var keys = Object.keys(currentBlock)
    
    // If nobody contributed, nobody gets a coin
    if(keys.length == 0) return;

    // Randomly give a coin to someone
    var user = currentBlock[keys[ keys.length * Math.random() << 0]];
    award_threadcoin(user);
}

function add_to_block(message, user) {
    var hash = sha1(message);
    currentBlock[hash] = user;
}

function reset_block() {
    currentBlock = {};
}

function award_threadcoin(user) {
    console.log("awarding threadcoin to... " + user)
    if(user in threadcoins) {
        threadcoins[user] += 1;
    } else {
        threadcoins[user] = 1;
    }
    reset_block();
    save_threadcoins();
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
    var user = (message_pieces.length > 1)?message_pieces[1]:"";
    var parameters = message_pieces.slice(2);

    return {
        "command": command,
        "user": user,
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
    var user = command_pieces.user;
    var command = command_pieces.command;
    var parameters = command_pieces.parameters;

    // Check if this is a registered command
    if(command in command_modules) {

        // Make sure the user has an entry
        if(!(user in user_settings))
            user_settings[user] = {};

        // If the user / command combo has an entry
        if(!(command in user_settings[user])) {
            user_settings[user][command] = command_modules[command].get_blank_settings(user);
        }

        // Run the command
        user_settings[user][command] = command_modules[command].update_settings(user_settings[user][command], command_pieces);

        // If the first parameter is "clear" then reset the command
        if(parameters.length > 0 && parameters[0] == "clear") {
            user_settings[user][command] = command_modules[command].get_blank_settings(user);
        }

        // Save the settings
        save_settings();
    } else {
        send_message(message.channel, "Sorry, " + command_pieces.command + " is not a valid command.");
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
    });
}

function send_message(channel, text) {
    bot._api('chat.postMessage', {
        "token": bot_settings.token,
        "channel": channel,
        "text": text
    });
}

function is_the_thread(message) {
    return ('thread_ts' in message
      && message.thread_ts == the_thread);
}

function is_marioparty_channel(message) {
    return (message.type == 'message'
         && message.channel == marioparty_channel)
}

///////////////////////////
// Jail
function is_illegal_message(message) {
    return false;
}

function punish_them(message) {

}


///////////////////////////
// MARIO PARTY!

function marioparty_turn(message) {
    var roll = marioparty.rollDice();
}

function start_marioparty() {
    for(var x=0; x<10; x++) {
        marioparty.getGameState().generateSpace();
    }
    var spaces = marioparty.getGameState().getSpaces();
    var message = '';
    for(var x in spaces) {
        message = message + ':' + spaces[x].getIcon() + ':';
    }
    send_message(marioparty_channel, message);
}

///////////////////////////
// Process every message on slack
bot.on('message', function(message) {

    console.log(message);

    if(should_process_this_message(message)) {
        
        // Did the message violate laws?
        if(is_illegal_message(message)) {
            delete_message(message);
            punish_them(message);
        }

        if(is_the_thread(message)) {
            add_to_block(message.text, message.user);
        }

        // Is the user playing mario party?
        if(is_marioparty_channel(message)) {
            marioparty_turn(message);
        }

        // Check if a command was issued
        if(is_command(message.text)) {
            marioparty_ability(message);
        }
    }
});

start_marioparty();



// Grant a block every 5 minutes
setInterval(process_block, 30000);