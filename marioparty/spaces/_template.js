var gameState;

/**
 * Anything this space needs to initialize
 */
var init = function(_gameState) {
    gameState = _gameState;
    return;
}
/**
 * Weight of this space appearing (1 = low, can go as high as you want!)
 */
var get_weight = function() {
    return 1;
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
 * Returns a message to be rendered
 */
var land_effect = function(message) {
    return '';
}

/**
 * What happens when a player passes this space
 *
 * Returns a message to be rendered
 */
var pass_effect = function(message) {
    return '';
}

module.exports = {
    "init": init,
    "get_weight": get_weight,
    "get_icon": get_icon,
    "land_effect": land_effect,
    "pass_effect": pass_effect
}