var helpers = require('../helpers.js');

/**
 * Returns the base / empty state for user settings
 */
var prepare_settings = function(settings) {
    if(!("timecoin" in settings))
        settings["timecoin"] = 0;
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
    
    if(paid || settings["godcoin"] > 0) {
        if(settings["timecoin"] == 0) {
            settings["timecoin"] = 1;
            message = "<@" + user + "> has been granted a timecoin. Spend it wisely.";
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
        amount: 0,
        currency: "threadcoin",
        transactional: false
    }
}

module.exports = {
    "invoke_module": invoke_module,
    "get_cost": get_cost
}