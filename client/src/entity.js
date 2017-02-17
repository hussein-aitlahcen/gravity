const ShipColor = {
    COLOR_TEAM_ZERO: "green",
    COLOR_TEAM_ONE: "red"
}

class AbstractSpriteEntity extends AbstractEntity {

    static SpriteColor(team) {
        return team == 0 ? ShipColor.COLOR_TEAM_ONE : ShipColor.COLOR_TEAM_ZERO;
    }

    static SpriteResource(type, team) {
        return Resources.assets.game.ship["type_" + type][Ship.SpriteColor(team)];
    }

    constructor(info, image) {
        super(info);
        this.image = image;
        this.sprite = new cc.Sprite(image);
        this.sprite.setAnchorPoint(new cc.Point(0.5, 0.5));
        this.sprite.setPosition(info.position);
    }

    setPosition(position) {
        this.sprite.position = position;
        super.setPosition(position);
    }

    update(dt) {
        super.update(dt);
        this.sprite.setPosition(this.getPosition());
    }
}

class Projectile extends AbstractSpriteEntity {

    static ProjectileResource(type) {
        return Resources.assets.game.laser.blue;
    }

    constructor(info) {
        super(info, Projectile.ProjectileResource(info.projectileType));
    }
}

class Ship extends AbstractSpriteEntity {

    static SpriteColor(team) {
        return team == 0 ? ShipColor.COLOR_TEAM_ONE : ShipColor.COLOR_TEAM_ZERO;
    }

    static SpriteResource(type, team) {
        return Resources.assets.game.ship["type_" + type][Ship.SpriteColor(team)];
    }

    constructor(info) {
        super(info, Ship.SpriteResource(info.shipType, info.team));
        this.currentDirection = new Vec2(0, 0);
        this.shooting = false;
    }

    setDirection(newDirection) {
        let currentDirection = this.currentDirection;
        // avoid sending duplicate
        if (newDirection.x != currentDirection.x || newDirection.y != currentDirection.y) {
            this.currentDirection = newDirection;
            GravityEvent.fire(NetworkEventType.OUTGOING_MESSAGE, new MovementRequest(newDirection));
        }
        // instantly change the velocity, user experience will be smoother
        let currentVelocity = this.getVelocity();
        let newVelocity = new Vec2(
            newDirection.x * Math.abs(currentVelocity.x),
            newDirection.y * Math.abs(currentVelocity.y)
        );
        super.setVelocity(newVelocity);
    }

    setDirectionX(x) {
        this.setDirection(new Vec2(x, this.currentDirection.y));
    }

    setDirectionY(y) {
        this.setDirection(new Vec2(this.currentDirection.x, y));
    }

    setShooting(value) {
        // avoiding sending duplicate
        if (this.shooting != value) {
            this.shooting = value;
            GravityEvent.fire(NetworkEventType.OUTGOING_MESSAGE, new ShootRequest(this.shooting));
        }
    }
}