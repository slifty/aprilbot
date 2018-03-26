var Bot = require('slackbots');
var jsonfile = require('jsonfile')
var command_modules = require('./command_modules');


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

///////////////////////////
// Process every message on slack
bot.on('message', function(message) {
    if(should_process_this_message(message)) {

        // First, delete the original message
        delete_message(message);

        // Check if a command was issued
        if(is_command(message.text)) {
            process_command(message);
        }

        // Look up the user by name
        bot._api('users.info', {
            "token": admin_settings.token,
            "user": message.user
        }).done(function(data) {
            var user = data.user.name;
            var final_message = message;
            final_message.user = user;

            // We don't run special processes on commands
            if(!is_command(message.text)) {
                
                // Run all relevant commands
                if(user in user_settings) {
                    for(command in user_settings[user]) {
                        if(command in command_modules) {
                            final_message = command_modules[command].modify_message(final_message, user_settings[user][command]);
                        }
                    }
                }
            }

            // Send the message
            var user = final_message.user;
            var text = final_message.text;
            var channel = final_message.channel;
            text = "<" + user + "> " + text;
            bot._api('chat.postMessage', {
                "token": bot_settings.token,
                "channel": channel,
                "text": text
            });
        });
    }
});
