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
        this.localVelocity = new Vec2(0, 0);
    }

    update(dt) {
        super.update(dt);
        this.sprite.setPosition(this.getPosition());
    }

    setVelocityLocal(vec) {
        cc.log("controller velocity changed");
        cc.log(vec);
        let velocity = this.localVelocity;
        if (vec.x != velocity.x || vec.y != velocity.y) {
            this.localVelocity = vec;
            GravityEvent.fire(NetworkEventType.OUTGOING_MESSAGE, new MovementRequest(vec));
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