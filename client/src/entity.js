const ShipColor = {
    COLOR_TEAM_ZERO: 0,
    COLOR_TEAM_ONE: 3
}

class AbstractSpriteEntity extends AbstractEntity {

    constructor(info, image) {
        super(info);
        this.image = image;
        this.isLocal = false;
        this.sprite = new cc.Sprite(image);
        this.sprite.setAnchorPoint(new cc.Point(0.5, 0.5));

        this.setPosition(info.position);
        this.setRotation(info.rotation);
    }

    setLocal(value) {
        this.isLocal = value;
    }

    getSprite() {
        return this.sprite;
    }

    setPosition(position) {
        super.setPosition(position);
        this.sprite.setPosition(position);
    }

    setRotation(angle) {
        super.setRotation(angle);
    }

    setSpriteRotation(angle) {
        this.sprite.setRotation(this.getSpriteNormalizedRotation(angle));
    }

    getSpriteNormalizedRotation(angle) {
        let normalAngle = 90;
        return normalAngle - angle;
    }

    update(dt) {
        super.update(dt);
        this.sprite.setPosition(this.getPosition());
    }
}

class Projectile extends AbstractSpriteEntity {

    static ProjectileResource(power, thickness) {
        return Resources.assets.game.laser + power + "_" + thickness + ".png";
    }

    constructor(info) {
        super(info, Projectile.ProjectileResource(info.power, info.thickness));
    }

    setRotation(angle) {
        super.setRotation(angle);
        super.setSpriteRotation(angle);
    }
}

class Ship extends AbstractSpriteEntity {

    static SpriteColor(team) {
        return team == 0 ? ShipColor.COLOR_TEAM_ONE : ShipColor.COLOR_TEAM_ZERO;
    }

    static SpriteResource(type, team) {
        return Resources.assets.game.ship + type + "_" + Ship.SpriteColor(team) + ".png";
    }

    constructor(info) {
        super(info, Ship.SpriteResource(info.shipType, info.team));
        this.currentDirection = new Vec2(0, 0);
        this.shooting = false;
    }

    setRotation(angle) {
        super.setRotation(angle);
        let normalizedAngle = this.getSpriteNormalizedRotation(angle);
        if (this.isLocal) {
            this.sprite.setRotation(normalizedAngle);
        } else {
            // smoothly rotate to desired angle
            this.getSprite().runAction(cc.RotateTo.create(0.08, normalizedAngle));
        }
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