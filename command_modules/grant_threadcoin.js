var helpers = require('../helpers.js');

/**
 * Returns the base / empty state for user settings
 */
var prepare_settings = function(settings) {
    if(!("threadcoin" in settings))
        settings["threadcoin"] = 0;
    if(!("godcoin" in settings))
        settings["godcoin"] = 0;
    return settings;
}

/**
 * Takes the old settings and parameters, updates settings and returns the new value
 * It also is responsible for calling the Slack API to make any slack-side changes
 */
var invoke_module = function(user, settings, parameters, paid) {
    prepare_settings(settings);
    var message = '';
    var amount = 0;
    if(paid || settings["godcoin"] > 0) {
        if(parameters.length > 0) {
            var parsedAmount = parameters[0]
            if(!isNaN(parsedAmount)) {
                amount = parseInt(parameters[0], 10);
            }
        }
        settings["threadcoin"] = settings["threadcoin"] + amount;
        settings["threadcoin"] = Math.max(0, settings["threadcoin"]);

        if(amount > 0) {
            message = "<@" + user + "> has been granted " + amount + " threadcoin. They now have " + settings["threadcoin"];
        } else if(amount < 0) {
            message = "<@" + user + "> has lost " + Math.abs(amount) + " threadcoin. They now have " + settings["threadcoin"];
        }
    } else {
        message = "<@" + user + "> tried to grant themselves threadcoin. You have to earn threadcoin by posting in the thread.";
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
        amount: 1,
        currency: "godcoin",
        transactional: false
    }
}

module.exports = {
    "invoke_module": invoke_module,
    "get_cost": get_cost
}