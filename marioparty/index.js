var GameState = require('./gameState').GameState;
var gameState = new GameState('game_state.json');

function rollDice() {
    return Math.ceil(Math.random() * 10);
}

function getGameState() {
    return gameState;
}

var requireDirectory = require('require-directory');
module.exports = {
    rollDice: rollDice,
}


module.exports = {
    "rollDice": rollDice,
    "getGameState": getGameState
};
