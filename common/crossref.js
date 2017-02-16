"use strict";

const GameStateId = {
    INITALIZING: 0,
    WAITING_PLAYERS: 1,
    WAITING_READY: 2,
    PLAYING: 3,
    DONE: 4
}
exports.GameStateId = GameStateId;

const MessageId = {
    CS_IDENTIFICATION_REQ: 0,
    CS_MOVEMENT_REQ: 1,

    SC_IDENTIFICATION_RES: 100,
    SC_PLAYER_JOIN: 101,
    SC_ENTITY_SPAWN: 102,
    SC_ENTITY_DESTROY: 103,
    SC_GAME_STATE_UPDATE: 104,
    SC_ENTITY_UPDATE: 105,
    SC_ENTITY_SYNC: 106
}
exports.MessageId = MessageId;

const IdentificationResultEnum = {
    SUCCESS: 0,
    WRONG_CREDENTIALS: 1,
    BANNED: 2,
    ALREADY_CONNECTED: 3
}
exports.IdentificationResultEnum = IdentificationResultEnum;

const EntityTypeId = {
    SHIP: 0,
    PROJECTILE: 1,
    ROCK: 2,
    BONUS: 3
}
exports.EntityTypeId = EntityTypeId;

class AbstractNetworkMessage {
    constructor(id) {
        this.id = id;
    }
    getId() {
        return this.id;
    }
}
exports.AbstractNetworkMessage = AbstractNetworkMessage;

class IdentificationRequest extends AbstractNetworkMessage {
    constructor(username, password) {
        super(MessageId.CS_IDENTIFICATION_REQ);
        this.username = username;
        this.password = password;
    }
}
exports.IdentificationRequest = IdentificationRequest;

class MovementRequest extends AbstractNetworkMessage {
    constructor(x, y) {
        super(MessageId.CS_MOVEMENT_REQ);
        this.x = x;
        this.y = y;
    }
}
exports.MovementRequest = MovementRequest;

class IdentificationResult extends AbstractNetworkMessage {
    constructor(code, accountInfo) {
        super(MessageId.SC_IDENTIFICATION_RES);
        this.code = code;
        this.accountInfo = accountInfo;
    }
}
exports.IdentificationResult = IdentificationResult;

class PlayerJoin extends AbstractNetworkMessage {
    constructor(playerInfo) {
        super(MessageId.SC_PLAYER_JOIN);
        this.playerInfo = playerInfo;
    }
}
exports.PlayerJoin = PlayerJoin;

class EntitySpawn extends AbstractNetworkMessage {
    constructor(entityType, entityInfo) {
        super(MessageId.SC_ENTITY_SPAWN);
        this.entityType = entityType;
        this.entityInfo = entityInfo;
    }
}
exports.EntitySpawn = EntitySpawn;

class EntityDestroy extends AbstractNetworkMessage {
    constructor(entityId) {
        super(MessageId.SC_ENTITY_DESTROY);
        this.entityId = entityId;
    }
}
exports.EntityDestroy = EntityDestroy;

class GameStateUpdate extends AbstractNetworkMessage {
    constructor(gameState) {
        super(MessageId.SC_GAME_STATE_UPDATE);
        this.gameState = gameState;
    }
}
exports.GameStateUpdate = GameStateUpdate;

class EntitySync extends AbstractNetworkMessage {
    constructor(entityId, position, velocity, rotation) {
        super(MessageId.SC_ENTITY_SYNC);
        this.entityId = entityId;
        this.position = position;
        this.velocity = velocity;
        this.rotation = rotation;
    }
}
exports.EntitySync = EntitySync;

class AbstractCoordinate {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
exports.AbstractCoordinate = AbstractCoordinate;

class Vec2 extends AbstractCoordinate {
    constructor(x, y) {
        super(x, y);
    }

    translate(x, y) {
        return new Vec2(this.x + x, this.y + y);
    }

    mul(factor) {
        return new Vec2(this.x * factor, this.y * factor);
    }

    add(vec) {
        return translate(vec.x, vec.y);
    }

    normalized() {
        var factor = 1.0 / this.length();
        return this.mul(factor);
    }

    length() {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    }
}
exports.Vec2 = Vec2;

class Point extends AbstractCoordinate {
    constructor(x, y) {
        super(x, y);
    }
}
exports.Point = Point;

class PlayerInfo {
    constructor(id, name, level) {
        this.id = id;
        this.name = name;
        this.level = level;
    }
}
exports.PlayerInfo = PlayerInfo;

class AccountInfo extends PlayerInfo {
    constructor(id, name, level, experience) {
        super(id, name, level);
        this.experience = experience;
    }
}
exports.AccountInfo = AccountInfo;

class AbstractEntityInfo {
    constructor(type, id, team, position, velocity) {
        this.type = type;
        this.id = id;
        this.team = team;
        this.position = position;
        this.velocity = velocity;
    }
}
exports.AbstractEntityInfo = AbstractEntityInfo;

class ShipInfo extends AbstractEntityInfo {
    constructor(id, team, position, velocity, shipType) {
        super(EntityTypeId.SHIP, id, team, position, velocity);
        this.shipType;
    }
}
exports.ShipInfo = ShipInfo;

class ProjectileInfo extends AbstractEntityInfo {
    constructor(id, team, position, velocity, projectileType) {
        super(EntityTypeId.PROJECTILE, id, team, position, velocity);
        this.projectileType = projectileType;
    }
}
exports.ProjectileInfo = ProjectileInfo;

class BonusInfo extends AbstractEntityInfo {
    constructor(id, team, position, velocity, bonusType) {
        super(EntityTypeId.BONUS, id, team, position, velocity);
        this.bonusType = bonusType;
    }
}
exports.BonusInfo = BonusInfo;

class RockInfo extends AbstractEntityInfo {
    constructor(id, team, position, velocity, rockType) {
        super(EntityTypeId.ROCK, id, team, position, velocity);
        this.rockType = rockType;
    }
}
exports.RockInfo = RockInfo;

class AbstractEntity {
    constructor(info) {
        this.info = info;
    }

    updateInfo(info) {
        this.info = info;
    }

    getType() {
        return this.info.type;
    }

    getId() {
        return this.info.id;
    }

    getTeam() {
        return this.info.team;
    }

    getPosition() {
        return info.position;
    }

    setPosition(newPosition) {
        this.info.position = newPosition;
    }

    getVelocity() {
        return this.info.velocity;
    }

    setVelocity(newVelocity) {
        this.info.velocity = newVelocity;
    }

    update(dt) {
        var velocity = this.getVelocity();
        if (velocity.x != 0 || velocity.y != 0) {
            var currentPosition = this.getPosition();
            var nextPosition = new Point(
                currentPosition.x + velocity.x * dt,
                currentPosition.y + velocity.y * dt
            );
            this.setPosition(nextPosition);
        }
    }
}
exports.AbstractEntity = AbstractEntity;