const ShipColor = {
    COLOR_TEAM_ZERO: "green",
    COLOR_TEAM_ONE: "red"
}

class Ship extends AbstractEntity {
    constructor(info) {
        super(info);
        let shipColor = info.team == 0 ? ShipColor.COLOR_TEAM_ONE : ShipColor.COLOR_TEAM_ZERO;
        this.sprite = new cc.Sprite(Resources.assets.game.ship["type_" + this.info.shipType][shipColor]);
        this.sprite.setAnchorPoint(new cc.Point(0.5, 0.5));
    }

    update(dt) {
        super.update(dt);
        this.sprite.setPosition(this.getPosition());
    }

    setVelocityLocal(vec) {
        let velocity = this.getVelocity();
        if (vec.x != velocity.x || vec.y != velocity.y) {
            GravityEvent.fire(NetworkEventType.OUTGOING_MESSAGE, new MovementRequest(vec.x, vec.y));
        }
        this.setVelocity(vec);
    }

    setVelocityLocalX(x) {
        this.setVelocityLocal(new Vec2(x, this.getVelocity().y));
    }

    setVelocityLocalY(y) {
        this.setVelocityLocal(new Vec2(this.getVelocity().x, y));
    }
}