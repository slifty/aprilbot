var Bot = require('slackbots');
var jsonfile = require('jsonfile')
var command_modules = require('./command_modules');
// var marioparty = require('./marioparty');
var sha1 = require('sha1');
var fs = require('fs');

var the_thread = '1488917437.000402';
// var general_channel = 'C02JZTC78'; // #general
//var general_channel = 'G99E4G58X'; // test room
var general_channel = 'C9Z3QHTEG' // #threadcoin

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
            update_reality();
            impose_reality();
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

        // Change everyone's name to wandering_soul
        get_users().then(function(data) {
            var users = data.members;
            for(var x in users) {
                var user = users[x];
                invoke_command(user.id, "change_name", ['an_innocent'], true);
            }
            save_settings();
        })

        // Give the introductory message
        send_message(general_channel, "WELCOME TO THE FUTURE OF THE GPF\n\r\
All conversation going forward must take place in The Thread. https://thegpf.slack.com/archives/C04C4MK6T/p1488917437000402\n\r\
Thank you for your attention!");
    }
}

///////////////////////////
// Save normality
var normality_file = 'normality.json'
function get_users() {
    var promise = admin_bot._api('users.list', {
        "token": admin_settings.token,
    });
    return promise;
}

function save_normality() {
    // Only save normality once, lest normality become abnormal
    if(!fs.existsSync(normality_file)) {
        get_users().then(function(data) {
           jsonfile.writeFile(normality_file, data, {spaces: 2}, function(err) {
               if(err) {
                   console.error(err);
               }
           }); 
        });
    }
}

function load_normality() {
    if(fs.existsSync(normality_file)) {
        jsonfile.readFile(normality_file, function(err, obj) {
            if(!err) {
                for(var x in obj.members) {
                    var user = obj.members[x];
                    if(get_name(user.id) == "an_innocent") {
                        invoke_command(user.id, "change_name", [user.name], true, true);
                        console.log(user.id);
                    } else {
                        console.log(user.id);
                        console.log(get_name(user.id));
                    }
                }
                update_reality();
                impose_reality();
            } else {
                console.log(err);
            }
        });
    }
}

function leaderboard() {
    var message = '';
    var users = [];
    for(var user in user_settings) {
        var count = get_threadcoin(user);
        if(count == 0)
            continue;

        users.push({
            id: user,
            count: count
        })
    }

    users.sort(function(a,b) {
        var comparison = 0;
        if (a.count < b.count) {
            comparison = 1;
        } else if (b.count < a.count) {
            comparison = -1;
        }
        return comparison;
    });
    for(var x in users) {
        message += "`" + get_name(users[x].id) + "` :: " + users[x].count + "\n\r";
    }

    return message;
}

function listemoji() {
    var message = '';
    var users = {}
    for(term in term_market) {
        message += ":" + term + ": - " + term_market[term].amount + " (" + get_name(term_market[term].user) + ") \n\r";
    }
    return message;
}



///////////////////////////
// Set things up to grant threadcoin
var currentBlock = {}
function process_block() { 
    var keys = Object.keys(currentBlock)
    
    // If nobody contributed, nobody gets a coin
    if(keys.length == 0) return;

    // Randomly give a coin to someone
    var hash = currentBlock[keys[ keys.length * Math.random() << 0]];
    var user = hash.user;
    var message = hash.message;
    var stripped_message = hash.message.replace(/\W/g, '');
    // if(stripped_message in term_market) {
    //     send_message(general_channel, invoke_command(user, "grant_threadcoin", [term_market[stripped_message].amount], true) + hash.message);
    // } else {
    if(is_cultist(user, "thread")) {
        send_message(general_channel, invoke_command(user, "grant_threadcoin", ["2"], true) + " -- `" + hash.message + "`");
    } else {
        send_message(general_channel, invoke_command(user, "grant_threadcoin", ["1"], true) + " -- `" + hash.message + "`");
    }
    //}
    reset_block();
}

function add_to_block(message, user) {
    var hash = sha1(message);
    currentBlock[hash] = {
        user: user,
        message: message
    };
}

function reset_block() {
    currentBlock = {};
}

function award_threadcoin(user) {
    if(is_cultist(user, "thread")) {
        send_message(general_channel, invoke_command(user, "grant_threadcoin", ["2"], true));
    } else {
        send_message(general_channel, invoke_command(user, "grant_threadcoin", ["1"], true));
    }
    reset_block();
}

///////////////////////////
// Set things up to grant timecoin
function award_timecoins() {
    for(var user in user_settings) {
        if(is_cultist(user, 'antithread')) {
            send_message(general_channel, invoke_command(user, "grant_timecoin", [], true));
        }
    }
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
    var valid_triggers = ["!", "⸘", "‼︎"];
    return valid_triggers.indexOf(text.charAt(0)) > -1;
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
        // Check to see if the invoker can pay the cost
        
        // Deduct the cost
        
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

function is_cultist(user, value) {
    return (user in user_settings
    && "cult" in user_settings[user]
    && user_settings[user]["cult"] == value);
}

function is_prisoner(user) {
    return (user in user_settings
    && "jail" in user_settings[user]
    && user_settings[user]["jail"] == true);
}

function is_expanded(user) {
    return (user in user_settings
    && "expanded" in user_settings[user]
    && user_settings[user]["expanded"] == true) ||
    (get_threadcoin(user) > 100
    && is_cultist(user, 'thread'));
}

function get_purchases(user) {
    if(user in user_settings
    && "purchases" in user_settings[user]) {
        return user_settings[user]["purchases"];
    }

    return {};
}

function get_name(user) {
    if(user in user_settings
    && "name" in user_settings[user]) {
        return user_settings[user]["name"];
    }
    return user;

}

function get_threadcoin(user) {
    if(user in user_settings
    && "threadcoin" in user_settings[user]) {
        return user_settings[user]["threadcoin"];
    }
    return 0;
}

var term_market = {};

function update_reality() {
    // Check thread pledges
    for(var user in user_settings) {
        if(get_threadcoin(user) > 10
        && !is_expanded(user)) {
            send_message(general_channel, invoke_command(user, "expand_mind", [true], true, true));
        }

        if(get_threadcoin(user) <= 10
        && is_expanded(user)) {
            send_message(general_channel, invoke_command(user, "expand_mind", [false], true, true));
        }

        if(is_cultist(user, "thread")) {
            // Change name based on thread
            var coins = get_threadcoin(user);
            if(coins <= 10) {
                if(get_name(user) != "thread_scum")
                    send_message(general_channel, invoke_command(user, "change_name", ["thread_scum"], true, true));
            } else if(coins < 25) {
                if(get_name(user) != "thread_peon")
                    send_message(general_channel, invoke_command(user, "change_name", ["thread_peon"], true, true));
            } else if(coins < 50) {
                if(get_name(user) != "thread_minion")
                    send_message(general_channel, invoke_command(user, "change_name", ["thread_minion"], true, true));
            } else if(coins < 75) {
                if(get_name(user) != "thread_soldier")
                    send_message(general_channel, invoke_command(user, "change_name", ["thread_soldier"], true, true));
            } else if(coins < 100) {
                if(get_name(user) != "thread_warrior")
                    send_message(general_channel, invoke_command(user, "change_name", ["thread_warrior"], true, true));
            } else if(coins < 150) {
                if(get_name(user) != "thread_strategist")
                    send_message(general_channel, invoke_command(user, "change_name", ["thread_strategist"], true, true));
            } else if(coins < 200) {
                if(get_name(user) != "thread_spy")
                    send_message(general_channel, invoke_command(user, "change_name", ["thread_spy"], true, true));
            } else if(coins < 250) {
                if(get_name(user) != "thread_emojimancer")
                    send_message(general_channel, invoke_command(user, "change_name", ["thread_emojimancer"], true, true));
            } else if(coins < 300) {
                if(get_name(user) != "thread_minter")
                    send_message(general_channel, invoke_command(user, "change_name", ["thread_minter"], true, true));
            } else if(coins < 500) {
                if(get_name(user) != "thread_president")
                    send_message(general_channel, invoke_command(user, "change_name", ["thread_president"], true, true));
            } else if(coins < 1000) {
                if(get_name(user) != "thread_god")
                    send_message(general_channel, invoke_command(user, "change_name", ["thread_god"], true, true));
            } 
        } else {
            // If you are pledged to the thread, you give up all material posessions
            var user_purchases = get_purchases(user);
            for(var term in user_purchases) {
                if(!(term in term_market)
                || term_market[term].amount < user_purchases[term]) {
                    term_market[term] = {
                        user: user,
                        amount: user_purchases[term]
                    };
                }
            }
        }
    }
}

function impose_reality() {
    // Update everybody's name
    for(var user in user_settings) {
        if(user in user_settings
        && "name" in user_settings[user]
        && user_settings[user]["name"] != '') {
            change_alias(user, user_settings[user]["name"])
        }
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
    if(text != "") {
        bot._api('chat.postMessage', {
            "token": bot_settings.token,
            "channel": channel,
            "text": text
        });
    }
}

function change_alias(user, alias) {
    if(alias != "") {
        try {
            admin_bot._api('users.profile.set', {
                "token": admin_settings.token,
                "user": user,
                "name": "display_name",
                "value": alias
            });
        } catch (e) {
            console.log(e);
        }
    }
}

function is_the_thread(message) {
    return ('thread_ts' in message
      && message.thread_ts == the_thread);
}

function is_marioparty_channel(message) {
    return (message.type == 'message'
         && message.channel == general_channel)
}

///////////////////////////
// Jail
function check_emojiright_violation(message) {
    for(var term in term_market) {
        var user = term_market[term].user;
        term = ":" + term + ":";
        if(message.text.toLowerCase().indexOf(term) !== -1
        && message.user != user) {
            send_message(message.channel, "<@" + message.user + "> just violated <@" + user + ">'s emojiright (" + term + ").");
            if(get_threadcoin(message.user) > 0) {
                send_message(message.channel, invoke_command(user, "grant_threadcoin", ["1"], true));
                send_message(message.channel, invoke_command(message.user, "grant_threadcoin", ["-1"], true));
            } else {
                send_message(message.channel, "> <@" + message.user + "> can't pay, and is being sent to jail.");
                send_message(message.channel, invoke_command(message.user, "change_name", ['thief'], true));
                send_message(message.channel, invoke_command(message.user, "jail", [true], true));
            }
            return true;
        }
    }

    return false;
}

function check_cult_violation(message) {
    if(is_cultist(message.user, "thread")
    && !is_the_thread(message)) {
        send_message(message.channel, "<@" + message.user + "> has devoted themself to The Thread, they may not speak outside of it.");
        return true;
    }

    if(is_cultist(message.user, "antithread")
    && is_the_thread(message)) {
        send_message(message.channel, "<@" + message.user + "> has turned their back on The Thread but tried to post in it. Shame.");
        invoke_command(message.user, "change_name", ['heathen'], true)
        return true;
    }
}

function jailbreak() {
    var announcement = false;
    for(var user in user_settings) {
        if(is_prisoner(user)) {
            if(announcement == false) {
                send_message(general_channel, "JAILBREAK!!!! (if you were in jail, you are free)");
                announcement = true;
            }
            send_message(general_channel, invoke_command(user, "jail", [false], true));
        }
    }
}

///////////////////////////
// MARIO PARTY!
// function marioparty_turn(message) {
//     var roll = marioparty.rollDice();
// }

// function start_marioparty() {
//     for(var x=0; x<10; x++) {
//         marioparty.getGameState().generateSpace();
//     }
//     var spaces = marioparty.getGameState().getSpaces();
//     var message = '';
//     for(var x in spaces) {
//         message = message + ':' + spaces[x].getIcon() + ':';
//     }
//     send_message(marioparty_channel, message);
// }

///////////////////////////
// Process every message on slack
bot.on('message', function(message) {
    if(should_process_this_message(message)) {
        // Is the person in jail?
        if(is_prisoner(message.user)) {
            send_message(message.channel, "<@" + message.user + "> tried to talk, but they are in jail for violating emojiright. (You have to wait a minute)");
            delete_message(message);
            return;
        }

        // Is the message violating thread followership?
        if(check_cult_violation(message)) {
            delete_message(message);
            return;
        }

        // Is the message outside of the thread, and from someone who is not awake?
        if(!is_expanded(message.user)
        && !is_the_thread(message)
        && !is_cultist(message.user, "antithread")) {
            // delete_message(message);
            // send_message(message.channel, "<@" + message.user + "> tried to talk in a place they do not know.  (post in The Thread -- https://thegpf.slack.com/archives/C04C4MK6T/p1488917437000402).");
            return;
        }

        // Check if a command was issued
        if(is_command(message.text)) {
            process_command(message);
        } else {
            // Did the message violate emojiright?
            if(check_emojiright_violation(message)) {
                // delete_message(message);
                return;
            }
        }

        if(is_the_thread(message)
        && !is_cultist(message.user, "antithread")) {
            add_to_block(message.text, message.user);
        }

        // Is the user playing mario party?
        // if(is_marioparty_channel(message)) {
        //     // marioparty_turn(message);
        // }

    }
});

// Make sure we have saved before destroying the world
save_normality();

// Set the satage
set_stage();

// Load settings
load_settings();

// Grant a block every minute
setInterval(process_block, 60000);

// Save reality every minute
setInterval(save_settings, 60000);

// Grant a timecoin every 40 minutes
setInterval(award_timecoins, 2400000);

// Free from jail every minute
setInterval(jailbreak, 6000);

// Impose reality every 10 minutes
setInterval(impose_reality, 600000);
impose_reality();

// load_normality();