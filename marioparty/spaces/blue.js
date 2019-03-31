var gameState;

function Space(gameState) {
    this.coins = 0;
    this.gameState = gameState;

    // Are coins going to randomly appear?
    if(Math.random() * 100 < 50) {
        this.coins = Math.ceil(Math.random() * 3);
    }

    /**
     * What should the space's icon be?
     * NOTE: omit the wrapping :'s (so 'tinkfase' rather than ':tinkfase:')
     */
    this.getIcon = function() {
        if(this.coins > 0)
            return 'coin';
        return 'large_blue_circle';
    }

    /**
     * What happens when a player lands on this space
     *
     * Returns a message to be rendered
     */
    this.landEffect = function(message) {
        var user = message.user;
        this.gameState.addCoins(user, 3);
        var playerState = this.gameState.getPlayerState(user);
        return '{user} landed on a blue space and got 3 coins! (' + playerState.coins + ' total)';
    }

    /**
     * What happens when a player passes this space
     *
     * Returns a message to be rendered
     */
    this.passEffect = function(message) {
        if(this.coins > 0) {
            this.gameState.addCoins(user, coins);
            var playerState = this.gameState.getPlayerState(user);
            return '{user} picked up ' + this.coins + ' coin' + (this.coins==1?'':'s') + ' along the way (' + playerState.coins + ' total)';
            this.coins = 0;
        }
        return '';
    }
    
}


/**
 * Weight of this space appearing (1 = low, can go as high as you want!)
 */

function getWeight() {
    return 1;
}
Space.prototype.getWeight = getWeight;

module.exports = {
    "Space": Space,
    "weight": getWeight()
};
