var helpers = require('../helpers.js');

/**
 * Returns the base / empty state for user settings
 */
var get_blank_settings = function() {
	return {};
}

/**
 * Takes the old settings and parameters, updates settings and returns the new value
 */
var update_settings = function(old_settings, parameters) {
	return {};
}

/**
 * Takes a message and settings, updates the message
 */
var modify_message = function(message, settings) {
	return message;
}

module.exports = {
	"get_blank_settings": get_blank_settings,
	"update_settings": update_settings,
	"modify_message": modify_message
}