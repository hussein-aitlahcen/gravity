var Ship = function (type, color) {

    this.speed = 200;
    this.movement = new cc.math.Vec2(0, 0);

    this.sprite = new cc.Sprite(Resources.assets.game.ship["type_" + type][color]);
    this.sprite.setAnchorPoint(new cc.Point(0.5, 0.5));

    this.getPosition = function () {
        return this.sprite.getPosition();
    };

    this.setPosition = function (newPosition) {
        this.sprite.setPosition(newPosition);
    };

    var that = this;
    this.movementListener = {
        event: cc.EventListener.KEYBOARD,
        onKeyPressed: function (keyCode, event) {
            switch (keyCode) {
                case cc.KEY.up: that.movement.y = 1; break;
                case cc.KEY.down: that.movement.y = -1; break;
                case cc.KEY.left: that.movement.x = -1; break;
                case cc.KEY.right: that.movement.x = 1; break;
            }
        },
        onKeyReleased: function (keyCode, event) {
            switch (keyCode) {
                case cc.KEY.up:
                case cc.KEY.down: that.movement.y = 0; break;
                case cc.KEY.left:
                case cc.KEY.right: that.movement.x = 0; break;
            }
        }
    };

    cc.eventManager.addListener(cc.EventListener.create({
        event: cc.EventListener.CUSTOM,
        eventName: EVENT_GAME,
        callback: function (event) {
            var gravityEvent = event.getUserData();
            var gameCanvas = gravityEvent.data;
            switch (gravityEvent.type) {
                case GameEventType.START:
                    cc.eventManager.addListener(that.movementListener, gameCanvas);
                    break;
                case GameEventType.STOP:
                    cc.eventManager.removeListener(that.movementListener);
                    break;
            }
        }
    }), 1);

    this.update = function (dt) {
        if (this.movement.x != 0 || this.movement.y != 0) {
            var currentPosition = this.getPosition();
            var nextPosition = new cc.Point(
                currentPosition.x + this.movement.x * this.speed * dt,
                currentPosition.y + this.movement.y * this.speed * dt
            );
            this.setPosition(nextPosition);
        }
    };
};