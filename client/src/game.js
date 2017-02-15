var GameLayer = cc.Layer.extend({
    state: {
        players: []
    },
    ctor: function () {
        this._super();

        var size = cc.winSize;

        this.addChild(Background.create(Resources.assets.background.blue, size), 0);

        this.addPlayer(new Player(new PlayerInfo(true, 0, 0, 10, 0)));

        this.scheduleUpdate();

        GravityEvent.fire(GameEventType.start, this);

        return true;
    },
    addPlayer: function (player) {
        this.state.players.push(player);
        this.addChild(player.ship.sprite);
    },
    update: function (dt) {
        for (var i = 0; i < this.state.players.length; i++) {
            this.state.players[i].ship.update(dt);
        }
    }
});

var GameScene = cc.Scene.extend({
    onEnter: function () {
        this._super();
        var layer = new GameLayer();
        this.addChild(layer);
    }
});