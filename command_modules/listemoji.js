var helpers = require('../helpers.js');

/**
 * Returns the base / empty state for user settings
 */
var prepare_settings = function(settings) {
    if(!("threadcoin" in settings))
        settings["threadcoin"] = 0;
    return settings;
}

/**
 * Takes the old settings and parameters, updates settings and returns the new value
 * It also is responsible for calling the Slack API to make any slack-side changes
 */
var invoke_module = function(user, settings, parameters, ignore_cost) {
    prepare_settings(settings);
    var message = '';
    message = "<@" + user + "> asked for the emoji market.";
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