var helpers = require('../helpers.js');

/**
 * Returns the base / empty state for user settings
 */
var get_blank_settings = function(user) {
	return {
		"pairs": []
	};
}

/**
 * Takes the old settings and parameters, updates settings and returns the new value
 */
var update_settings = function(old_settings, command_pieces) {
    var user = command_pieces.user;
    var command = command_pieces.command;
    var parameters = command_pieces.parameters;

	var settings = old_settings;

	// Detect a regular expression
	var parameter_string = parameters.join(" ");
	var check_results = parameter_string.match(/(\/.*\/)\s(.*)/);
	if(check_results) {
		old_settings["pairs"].push({
			"type": "regex",
			"value": {
				"source": check_results[1].slice(1,-1),
				"replacement": check_results[2],
			}
		});
	} else if (parameters.length > 2) {
		var term = helpers.get_parameter(parameters, 0);
		var replacement = helpers.combine_parameters(parameters,1);
		old_settings["pairs"].push({
			"type": "basic",
			"value": {
				"source": check_results[1],
				"replacement": check_results[2],
			}
		});
	}

	return old_settings;
}

/**
 * Takes a message and settings, updates the message
 */
var modify_message = function(message, settings) {
	for(var x in settings["pairs"]) {
		var pair = settings["pairs"][x];
		switch(pair["type"]) {
			case "regex":
				var expression = RegExp(pair["value"]["source"], "gi");
				message.text = message.text.replace(expression, pair["value"]["replacement"]);
				break;
			case "basic":
				message.text = message.text.replace(pair["value"]["source"], pair["value"]["replacement"]);
				break;
		}
	}
	return message;
}

module.exports = {
	"get_blank_settings": get_blank_settings,
	"update_settings": update_settings,
	"modify_message": modify_message
}