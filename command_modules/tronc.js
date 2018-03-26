var helpers = require('../helpers.js');

/**
 * Returns the base / empty state for user settings
 */
var get_blank_settings = function() {
	return {
		"letters": ""
	};
}

/**
 * Takes the old settings and parameters, updates settings and returns the new value
 */
var update_settings = function(old_settings, command_pieces) {
    var user = command_pieces.user;
    var command = command_pieces.command;
    var parameters = command_pieces.parameters;

    var letters = "";
	if(helpers.get_parameter(parameters,0) == "all") {
		letters = "abcdefghijklmnopqrstuvwxyz";
	} else {
		letters = parameters.join("").split('').filter(function(item, i, ar){ return ar.indexOf(item) === i; }).join("");
	}

	old_settings["letters"] = letters;
	return old_settings;
}

/**
 * Takes a message and settings, updates the message
 */
var modify_message = function(message, settings) {
	var tronc_text = [];
	var text = message.text;

	for(var i = 0; i < text.length; i++) {
		if(settings["letters"].indexOf(text[i].toLowerCase()) != -1) {
			tronc_text.push(":tronc_" + text[i] + ":");
		} else {
			tronc_text.push(text[i]);
		}
	}
	message.text = tronc_text.join("");
	return message;	
}

module.exports = {
	"get_blank_settings": get_blank_settings,
	"update_settings": update_settings,
	"modify_message": modify_message
}