var helpers = require('../helpers.js');

/**
 * Returns the base / empty state for user settings
 */
var prepare_settings = function(settings) {
    if(!("threadcoin" in settings))
        settings["threadcoin"] = 0;
    if(!("timecoin" in settings))
        settings["timecoin"] = 0;
    if(!("cult" in settings))
        settings["cult"] = '';
    return settings;
}

/**
 * Takes the old settings and parameters, updates settings and returns the new value
 * It also is responsible for calling the Slack API to make any slack-side changes
 */
var invoke_module = function(user, settings, parameters, ignore_cost) {
    prepare_settings(settings);
    var message = '';
    settings["threadcoin"] = settings["threadcoin"] + 5;

    if(settings["timecoin"] > 0) {
        settings["timecoin"] -= 1;
        settings["threadcoin"] += 5;
        message = "<@" + user + "> has converted a timecoin into 5 threadcoin. They now have " + settings["threadcoin"] + " threadcoin.";
    } else if (settings["cult"] != "antithread") {
        message = "<@" + user + "> does not know about timecoin.";
    } else {
        message = "<@" + user + "> does not have any timecoin.";
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
        currency: "timecoin",
        transactional: false
    }
}

module.exports = {
    "invoke_module": invoke_module,
    "get_cost": get_cost
}