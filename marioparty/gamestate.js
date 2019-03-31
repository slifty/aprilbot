var spaces = require('./spaces');
var jsonfile = require('jsonfile')
var path = require('path');
var appDir = path.dirname(require.main.filename);

function GameState(statefile) {
    this.gameState = {
        players: {}
    }

    this.spaces = [];
    this.activeSpace = 0;

    this.generateSpace = function() {
        var newSpace = new spaces.blue.Space();
        this.spaces.push(newSpace);
        this.saveState();
        return newSpace;
    }

    this.saveState = function() {
        jsonfile.writeFile(statefile, this.gameState, {spaces: 2}, function(err) {
            if(err) {
                console.error(err);
            }
        });    
    }

    // A new challenger approaches
    this.addPlayer = function(player, name) {
        var playerState = {
            coins: 0,
            stars: 0,
            name: name
        };
        this.setPlayerState(player, playerState);
    }

    this.getPlayerState = function(player) {
        if(!(player in this.gameState.players))
            this.addPlayer(player);
        return this.gameState.players[player];
    }

    this.setPlayerState = function(player, playerState) {
        this.gameState.players[player] = playerState;
        this.saveState();
    }

    // Adjust the number of coins a player has
    this.modCoins = function(player, amount) {
        var state = this.getPlayerstate(player);
        state.coins += amount;
        this.setPlayerState(player, state);
    }

    // Adjust the number of stars a player has
    this.modStars = function(player, amount) {
        var state = this.getPlayerstate(player);
        state.stars += amount;
        this.setPlayerState(player, state);
    }

    // Adjust the space
    this.modActiveSpace = function(amount) {
        this.activeSpace += amount;
        this.activeSpace = Math.max(this.activeSpace, 0);
        this.saveState();
    }

    // Return a list of generated spaces
    this.getSpaces = function() {
        return this.spaces;
    }

    try {
        obj = jsonfile.readFileSync(appDir + "/" + statefile);
        console.log(obj);
        if(obj != {}) {
            this.gameState = obj;
            console.log(this.gameState);
        }
    } catch (e) {
        console.log(e);
    }
}

module.exports.GameState = GameState