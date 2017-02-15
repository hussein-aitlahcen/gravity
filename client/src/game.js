var GameLayer = NetLayer.extend({
    ctor: function (account) {
        this._super();

        this.gameState = {
            account: account,
            players: []
        };

        var size = cc.winSize;

        this.addChild(Background.create(Resources.assets.background.blue, size), 0);

        this.addPlayer(new Player(new PlayerInfo(0, 0, 10, 0, true)));

        this.scheduleUpdate();

        GravityEvent.fire(GameEventType.START, this);

        return true;
    },
    addPlayer: function (player) {
        this.gameState.players.push(player);
        //this.addChild(player.ship.sprite);
    },
    update: function (dt) {
        for (var i = 0; i < this.state.players.length; i++) {
            this.state.players[i].ship.update(dt);
        }
    },
    onIncommingMessage: function (message) {

    },
    onOutgoingMessage: function (message) {

    }
});

var GameScene = cc.Scene.extend({
    onEnter: function () {
        this._super();
        var layer = new GameLayer();
        this.addChild(layer);
    }
});