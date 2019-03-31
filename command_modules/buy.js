var helpers = require('../helpers.js');

/**
 * Returns the base / empty state for user settings
 */
var prepare_settings = function(settings) {
    if(!("purchases" in settings))
        settings["purchases"] = {};
    if(!("threadcoin" in settings))
        settings["threadcoin"] = [];
    return settings;
}

/**
 * Takes the old settings and parameters, updates settings and returns the new value
 * It also is responsible for calling the Slack API to make any slack-side changes
 */
var invoke_module = function(user, settings, parameters, ignore_cost) {
    prepare_settings(settings);
    var message = '';
    var item = "";
    var amount = 0;
    if(parameters.length > 0) {
        // You can only buy single words
        item = parameters[0].replace(/\W/g, '');
        item = item.toLowerCase();
    }

    if(parameters.length > 1) {
        var parsedAmount = parameters[1]
        if(!isNaN(parsedAmount)) {
            amount = parseInt(parameters[1], 10);
        }
    }

    if(amount > 0) {
        if(!(item in settings["purchases"])) {
            settings["purchases"][item] = 0;
        }
        if(settings["threadcoin"] >= amount) {
            settings["threadcoin"] -= amount;
            settings["purchases"][item] += amount;
            message = "<@" + user + "> has invested " + amount + " threadcoin into :" + item + ":. (" + settings["purchases"][item] + " total)";
        } else {
            message = "<@" + user + "> only has " + settings["threadcoin"] + " threadcoin.";
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
        amount: 0,
        currency: "threadcoin",
        transactional: false
    }
}

module.exports = {
    "invoke_module": invoke_module,
    "get_cost": get_cost
}