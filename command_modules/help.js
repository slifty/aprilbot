var helpers = require('../helpers.js');

/**
 * Returns the base / empty state for user settings
 */
var prepare_settings = function(settings) {
    return settings;
}

/**
 * Takes the old settings and parameters, updates settings and returns the new value
 * It also is responsible for calling the Slack API to make any slack-side changes
 */
var invoke_module = function(user, settings, parameters, ignore_cost) {
    prepare_settings(settings);
    var message = '<@' + user + '> Asked for help!\n\r\
One threadcoin is granted per minute, randomly to a user who contributed in the thread block.  Posts to the block are hashed and THE MOST RECENT PERSON TO POST A GIVEN HASH OWNS THAT HASH. This means you can steal other users chances at a threadcoin by typing waht they type.\n\r\
`!change_name` changes your name.\n\r\
`!pray` offers a prayer to the gods.\n\r\
`!convert_timecoin` converts timecoin to threadcoin.\n\r\
`!buy {emoji} {amount}` buys rights to emoji\n\r\
`!count` tells you what you have\n\r\
`!listemoji` shows who owns what emoji\n\r\
`!leaderboard` shows the leaderboard\n\r\
Once you have 11 threadcoin you can talk outside of the thread.\n\r\
If someone violates your emoji rights, they have to pay you a threadcoin.';

    return {
        "settings": settings,
        "message": message
    };
}

/**
 * Takes a message and settings, updates the message
 */
var get_cost = function() {
    return {
        amount: 0,
        currency: "threadcoin",
        transactional: false // Do you deduct the currency
    }
}

module.exports = {
    "invoke_module": invoke_module,
    "get_cost": get_cost
}