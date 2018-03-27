/**
 * Anything this space needs to initialize
 */
var init = function(gamestate) {
    return;
}

/**
 * Odds of this space appearing (.01 = 1%; can go down to tenths of a percent e.g. .001)
 */
var get_probability = function() {
    return 0;
}

/**
 * What should the space's icon be?
 * NOTE: omit the wrapping :'s (so 'tinkfase' rather than ':tinkfase:')
 */
var get_icon = function() {
    return 'marioparty3';
}

/**
 * What happens when a player lands on this space
 *
 * Returns updated game state
 */
var land_effect = function(message, gamestate) {
    return gamestate;
}

/**
 * What happens when a player passes this space
 *
 * Returns updated game state
 */
var pass_effect = function(message, gamestate) {
    return gamestate;
}

module.exports = {
    "init": init,
    "get_probability": get_probability,
    "get_icon": get_icon,
    "land_effect": land_effect,
    "pass_effect": pass_effect
}