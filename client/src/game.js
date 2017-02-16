var GameLayer = NetLayer.extend({
    ctor: function (account) {
        this._super();

        this.account = account;
        this.players = [];
        this.entities = [];

        this.addChild(Background.create(Resources.assets.background.blue, cc.winSize), 0);

        this.scheduleUpdate();

        return true;
    },
    update: function (dt) {
        for (var i = 0; i < this.players.length; i++) {
            let currentPlayer = this.players[i];
            this.players[i].update(dt);
        }
    },
    getPlayer: function (playerId) {
        return this.players.find(player => player.info.id === playerId);
    },
    addPlayer: function (player) {
        this.players.push(player);
    },
    removePlayer: function (playerId) {
        this.players = this.players.filter(player => player.id !== playerId);
    },
    addEntity: function (entity) {
        this.entities.push(entity);
    },
    removeEntity: function (entityId) {
        this.entities = this.entities.filter(entity => entity.info.id !== entityId);
    },
    getEntity: function (entityId) {
        return this.entity.find(entity => entity.info.id === entityId);
    },
    onIncommingMessage: function (message) {
        switch (message.id) {
            case MessageId.SC_PLAYER_JOIN:
                cc.log("player join");
                this.addPlayer(new Player(message.playerInfo));
                break;

            case MessageId.SC_ENTITY_SPAWN:
                cc.log("entity spawn");
                switch (message.entityType) {
                    case EntityTypeId.SHIP:
                        let ship = new Ship(message.entityInfo);
                        let isLocal = ship.info.id === this.account.id;
                        if (isLocal) {
                            cc.log("local ship loaded");
                            this.initLocalShip(ship);
                        }
                        this.addEntity(ship);
                        break;
                }
                break;

            case MessageId.SC_GAME_STATE_UPDATE:
                cc.log("game state changed");
                switch (message.gameState) {
                    case GameStateId.PLAYING:
                        GravityEvent.fire(GameEventType.START);
                        break;
                    case GameStateId.DONE:
                        GravityEvent.fire(GameEventType.STOP);
                        break;
                }
                break;

            case MessageId.SC_ENTITY_SYNC:
                cc.log("entity sync");
                break;

            case MessageId.SC_ENTITY_DESTROY:
                cc.log("entity destroy");
                break;
        }
    },
    onOutgoingMessage: function (message) {

    },
    onDisconnected: function (data) {

    },
    isLocalShip: function (ship) {
        return ship.info.id === this.account.id;
    },
    initLocalPlayer: function (ship) {
        this.movementListener = {
            event: cc.EventListener.KEYBOARD,
            onKeyPressed: function (keyCode, event) {
                switch (keyCode) {
                    case cc.KEY.up:
                        ship.setMovementLocalY(1);
                        break;
                    case cc.KEY.down:
                        ship.setMovementLocalY(-1);
                        break;
                    case cc.KEY.left:
                        ship.setMovementLocalX(-1);
                        break;
                    case cc.KEY.right:
                        ship.setMovementLocalX(1);
                        break;
                }
            },
            onKeyReleased: function (keyCode, event) {
                switch (keyCode) {
                    case cc.KEY.up:
                    case cc.KEY.down:
                        ship.setMovementLocalY(0);
                        break;
                    case cc.KEY.left:
                    case cc.KEY.right:
                        ship.setMovementLocalX(0);
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