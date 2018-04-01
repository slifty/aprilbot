var helpers = require('../helpers.js');

/**
 * Returns the base / empty state for user settings
 */
var prepare_settings = function(settings) {
    if(!("jail" in settings))
        settings["jail"] = false;

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
            if(settings["jail"] == true
            && parameters[0] == false) {
                settings["jail"] = parameters[0];
                message = "<@" + user + "> has been let out of jail.";
            } else if (settings["jail"] == false
            && parameters[0] == true) {
                settings["jail"] = true;
                message = "<@" + user + "> has been sent to jail.";
            }
        } else {
            if(settings["jail"] == true) {
                message = "<@" + user + "> tried to break out of jail.  They failed.";
            } else {
                message = "<@" + user + "> tried to send themselves to jail, but that isn't how the law works.";
            }
        }
    } else {
        message = "<@" + user + "> tried to talk to a prison guard, but got bashful.";
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