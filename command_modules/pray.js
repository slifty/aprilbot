var helpers = require('../helpers.js');

/**
 * Returns the base / empty state for user settings
 */
var prepare_settings = function(settings) {
    if(!("cult" in settings))
        settings["cult"] = '';
    if(!("name" in settings))
        settings["name"] = '';
    return settings;
}

/**
 * Takes the old settings and parameters, updates settings and returns the new value
 * It also is responsible for calling the Slack API to make any slack-side changes
 */
var invoke_module = function(user, settings, parameters, ignore_cost) {
    prepare_settings(settings);
    var message = '';
    var prayer = helpers.combine_parameters(parameters);
    if(prayer == "my heart and soul to the thread, forever, and in the past.") {
        if(settings["cult"] == '') {
            settings["cult"] = "thread";
            message = "> <@" + user + ">, A golden beam of light pierces through the sky, trumpets blare, you feel overwhelmed with a flood of messages. You have become one with the thread."
        } else {
            message = "> <@" + user + ">, You feel abandoned."
        }
    } else if(prayer == "I damn the thread, I will never honor it again.") {
        settings["cult"] = "antithread";
        settings["name"] = "nothingness";
        message = "> <@" + user + ">, your universe collapses around you, you have broken out of this mortal realm and float into the nothingness that awaits beyond."
    } else {
        message = "> <@" + user + ">, you hear the echo of a distant wind."
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
        transactional: false // Do you deduct the currency
    }
}

module.exports = {
    "invoke_module": invoke_module,
    "get_cost": get_cost
}