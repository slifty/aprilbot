var helpers = require('../helpers.js');

/**
 * Returns the base / empty state for user settings
 */
var prepare_settings = function(settings) {
    if(!("name" in settings))
        settings["name"] = '';
    if(!("threadcoin" in settings))
        settings["threadcoin"] = 0;

    return settings;
}

/**
 * Takes the old settings and parameters, updates settings and returns the new value
 * It also is responsible for calling the Slack API to make any slack-side changes
 */
var invoke_module = function(user, settings, parameters, paid) {
    prepare_settings(settings);
    var message = '';

    if(parameters.length == 0) {
        message = "<@" + user + "> tried to change their name, but didn't specify a new name.";
    } else {
        if(!paid) {
            if(settings["threadcoin"] >= 10) {
                settings["threadcoin"] -= 10;
                if(parameters.length > 0) {
                    settings["name"] = parameters[0];
                }
                message = "<@" + user + "> has a new name (`" + settings["name"] + "`). They now have " + settings["threadcoin"] + " threadcoin.";
            } else {
                message = "<@" + user + "> tried to change their name, but couldn't pay the fee (10 threadcoin).";
            }
        } else {
            if(parameters.length > 0) {
                settings["name"] = parameters[0];
            }
            message = "<@" + user + "> has a new name (`" + settings["name"] + "`).";
        }
    }
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
        amount: 10,
        currency: "threadcoin",
        transactional: false
    }
}

module.exports = {
    "invoke_module": invoke_module,
    "get_cost": get_cost
}