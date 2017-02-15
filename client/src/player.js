var PlayerConstants = {
    COLOR_ALLY: "green",
    COLOR_ENNEMY: "red"
}

var Player = function (info) {
    this.info = info;
    this.speed = 200;
    this.movement = new cc.math.Vec2(0, 0);

    var shipColor = info.team == 0 ? "green" : "red";
    this.sprite = new cc.Sprite(Resources.assets.game.ship["type_" + this.info.shipType][shipColor]);
    this.sprite.setAnchorPoint(new cc.Point(0.5, 0.5));

    this.setSpeed = function (speed) {
        speed = speed;
    };

    this.getSpeed = function () {
        return speed;
    };

    this.getMovement = function () {
        return this.movement;
    };

    this.setMovement = function (vec) {
        this.movement = vec;
    };

    this.setMovementLocal = function (vec) {
        if (vec.x != this.movement.x || vec.y != this.movement.y) {
            GravityEvent.fire(NetworkEventType.OUTGOING_MESSAGE, NetMsg.Client.MovementRequest.create(vec));
        }
        this.setMovement(vec);
    };

    this.setMovementLocalX = function (x) {
        this.setMovementLocal(new cc.math.Vec2(x, this.movement.y));
    };

    this.setMovementLocalY = function (y) {
        this.setMovementLocal(new cc.math.Vec2(this.movement.x, y));
    }

    this.getPosition = function () {
        return this.sprite.getPosition();
    };

    this.setPosition = function (newPosition) {
        this.sprite.setPosition(newPosition);
    };

    this.setPosition(new cc.Point(100, 100));

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