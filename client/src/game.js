var GameLayer = NetLayer.extend({
    ctor: function (account) {
        this._super();

        this.account = account;
        this.players = [];

        var size = cc.winSize;

        this.addChild(Background.create(Resources.assets.background.blue, size), 0);

        this.scheduleUpdate();

        return true;
    },
    update: function (dt) {
        for (var i = 0; i < this.players.length; i++) {
            var currentPlayer = this.players[i];
            this.players[i].update(dt);
        }
    },
    getPlayer: function (playerId) {
        for (var i = 0; i < this.players.length; i++) {
            var player = this.players[i];
            if (player.info.id === playerId) {
                return player;
            }
        }
        return null;
    },
    addPlayer: function (player) {
        this.players.push(player);
        this.addChild(player.sprite);
    },
    onIncommingMessage: function (message) {
        switch (message.id) {
            case NetMsg.Server.PlayerSpawn.ID:
                cc.log("spawning players");
                for (var i = 0; i < message.infos.length; i++) {
                    var currentPlayerInfo = message.infos[i];
                    var player = new Player(currentPlayerInfo);
                    var isLocal = currentPlayerInfo.id == this.account.id;
                    if (isLocal) {
                        cc.log("local player loaded");
                        this.initLocalPlayer(player);
                    }
                    this.addPlayer(player);
                }
                break;

            case NetMsg.Server.GameStart.ID:
                cc.log("game started");
                GravityEvent.fire(GameEventType.START);
                break;

            case NetMsg.Server.PlayerUpdate.ID:
                cc.log("update player");
                var player = this.getPlayer(message.playerId);
                if (player != null) {
                    player.setMovement(message.movement);
                    player.setSpeed(message.speed);
                } else {
                    cc.log("unknow playerid");
                }
                break;
        }
    },
    onOutgoingMessage: function (message) {

    },
    isLocalPlayer: function (player) {
        return player.info.id == this.account.id;
    },
    initLocalPlayer: function (player) {
        this.movementListener = {
            event: cc.EventListener.KEYBOARD,
            onKeyPressed: function (keyCode, event) {
                switch (keyCode) {
                    case cc.KEY.up:
                        player.setMovementLocalY(1);
                        break;
                    case cc.KEY.down:
                        player.setMovementLocalY(-1);
                        break;
                    case cc.KEY.left:
                        player.setMovementLocalX(-1);
                        break;
                    case cc.KEY.right:
                        player.setMovementLocalX(1);
                        break;
                }
            },
            onKeyReleased: function (keyCode, event) {
                switch (keyCode) {
                    case cc.KEY.up:
                    case cc.KEY.down:
                        player.setMovementLocalY(0);
                        break;
                    case cc.KEY.left:
                    case cc.KEY.right:
                        player.setMovementLocalX(0);
                        break;
                }
            }
        };
        cc.eventManager.addListener(this.movementListener, this);
    }
});

var GameScene = cc.Scene.extend({
    ctor: function (account) {
        this._super();
        this.account = account;
    },
    onEnter: function () {
        this._super();
        var layer = new GameLayer(this.account);
        this.addChild(layer);
    }
});