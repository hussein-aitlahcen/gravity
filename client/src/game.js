var GameLayer = NetLayer.extend({
    ctor: function (account) {
        this._super();

        this.account = account;
        this.players = [];
        this.entities = [];

        this.addChild(Background.create(Resources.assets.background.black, cc.winSize), 0);

        this.scheduleUpdate();

        return true;
    },
    update: function (dt) {
        this.entities.forEach(entity => entity.update(dt));
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
        if (entity.sprite) {
            this.addChild(entity.sprite);
        } else {
            cc.log("entity added withouth sprite");
        }
    },
    removeEntity: function (entityId) {
        let entity = this.getEntity(entityId);
        if (entity) {
            this.entities = this.entities.filter(entity => entity.info.id !== entityId);
            if (entity.sprite) {
                this.removeChild(entity.sprite);
            } else {
                cc.log("entity removed withouth sprite");
            }
        }
    },
    getEntity: function (entityId) {
        return this.entities.find(entity => entity.info.id === entityId);
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
                    case EntityTypeId.PROJECTILE:
                        this.addEntity(new Projectile(message.entityInfo));
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
                let entity = this.getEntity(message.entityId);
                let newVelocity = new Vec2(message.velocity.x, message.velocity.y);
                let newPosition = new Point(message.position.x, message.position.y);
                let currentPosition = entity.getPosition();
                let distanceError = currentPosition.vectorToPoint(newPosition).length();
                const epsilon = 20;
                if (distanceError > epsilon) {
                    // TODO: correct interpolation, smoother than teleport...
                    let segment = 1;
                    let interpolation = currentPosition.interpolate(newPosition, segment);
                    entity.setPosition(interpolation);
                }
                entity.setVelocity(newVelocity);
                if (!this.isLocalId(message.entityId)) {
                    entity.setRotation(message.rotation);
                }
                break;

            case MessageId.SC_ENTITY_DESTROY:
                cc.log("entity destroy");
                this.removeEntity(this.getEntity(message.entityId));
                break;
        }
    },
    onOutgoingMessage: function (message) {

    },
    onDisconnected: function (data) {

    },
    isLocalId: function (entityId) {
        return entityId === this.account.id;
    },
    initLocalShip: function (ship) {
        this.mouseListener = {
            event: cc.EventListener.MOUSE,
            onMouseDown: function (event) {
                switch (event.getButton()) {
                    case cc.EventMouse.BUTTON_LEFT:
                        ship.setShooting(true);
                        break;
                }
            },
            onMouseUp: function (event) {
                switch (event.getButton()) {
                    case cc.EventMouse.BUTTON_LEFT:
                        ship.setShooting(false);
                        break;
                }
            },
            onMouseScroll: function (event) { },
            onMouseMove: function (event) {
                let x = event.getLocationX();
                let y = event.getLocationY();
                ship.setLookingDirection(new Point(x, y));
            }
        }
        this.keyboardListener = {
            event: cc.EventListener.KEYBOARD,
            onKeyPressed: function (keyCode, event) {
                switch (keyCode) {
                    case cc.KEY.up:
                        ship.setDirectionY(1);
                        break;
                    case cc.KEY.down:
                        ship.setDirectionY(-1);
                        break;
                    case cc.KEY.left:
                        ship.setDirectionX(-1);
                        break;
                    case cc.KEY.right:
                        ship.setDirectionX(1);
                        break;
                }
            },
            onKeyReleased: function (keyCode, event) {
                switch (keyCode) {
                    case cc.KEY.up:
                    case cc.KEY.down:
                        ship.setDirectionY(0);
                        break;
                    case cc.KEY.left:
                    case cc.KEY.right:
                        ship.setDirectionX(0);
                        break;
                }
            }
        };
        cc.eventManager.addListener(this.mouseListener, this);
        cc.eventManager.addListener(this.keyboardListener, this);
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