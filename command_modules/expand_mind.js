var helpers = require('../helpers.js');

/**
 * Returns the base / empty state for user settings
 */
var prepare_settings = function(settings) {
    if(!("expanded" in settings))
        settings["expanded"] = false;

    return settings;
}

/**
 * Takes the old settings and parameters, updates settings and returns the new value
 * It also is responsible for calling the Slack API to make any slack-side changes
 */
var invoke_module = function(user, settings, parameters, paid) {
    prepare_settings(settings);
    var message = '';
    if(parameters.length > 0) {
        if(paid) {
            if(settings["expanded"] == true
            && parameters[0] == false) {
                settings["expanded"] = parameters[0];
                message = "<@" + user + "> has forgotten.";
            } else if (settings["expanded"] == false
            && parameters[0] == true) {
                settings["expanded"] = true;
                message = "<@" + user + "> has found a world outside of the thread.";
            }
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