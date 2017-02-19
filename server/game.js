"use strict";

let io = require("socket.io")(server);
let common = require("../common/crossref");
let createGame = require("gameloop");
let turf = require("@turf/turf");

const GameConstants = {
    MAP_MIN_X: -20,
    MAP_MIN_Y: -20,
    MAP_MAX_X: 600,
    MAP_MAX_Y: 800,
    SCALE: 0.5
}

class Account {
    constructor(id, username, password, banned, connected, experience, level, shipType) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.banned = banned;
        this.experience = experience;
        this.level = level;
        this.shipType = shipType;
        this.connected = connected;
    }

    toNetwork() {
        return new common.AccountInfo(this.id, this.experience, this.level);
    }
}

class AccountManager {
    constructor() {
        this.accounts = [
            new Account(0, "smarken", "test", false, false, 0, 1, common.ShipTypeId.BATTLE_CRUISER),
            new Account(1, "test", "test", false, false, 0, 1, common.ShipTypeId.FRIGATE)
        ];
    }

    getAccount(username) {
        return this.accounts.find(account => account.username === username);
    }

    saveAccount(account) {

    }
}

class GameHandler {
    constructor(game) {
        this.game = game;
        this.handlers = {};
        this.addHandler(common.MessageId.CS_IDENTIFICATION_REQ, this.handleIdentification);
        this.addHandler(common.MessageId.CS_MOVEMENT_REQ, this.handleMovementRequest);
        this.addHandler(common.MessageId.CS_SHOOT_REQ, this.handleShootRequest);
        this.addHandler(common.MessageId.CS_ROTATION_REQ, this.handleRotationRequest);
        this.addHandler(common.MessageId.CS_READY, this.handleReady);
    }

    addHandler(id, callback) {
        this.handlers[id] = callback;
    }

    handle(player, message) {
        if (this.handlers.hasOwnProperty(message.id)) {
            this.handlers[message.id].call(this, player, message);
        } else {
            console.log("unhandled message");
            console.log(message);
        }
    }

    handleIdentification(player, message) {
        let account = this.game.accountManager.getAccount(message.username);
        if (account !== undefined && account.password == message.password) {
            if (!account.connected) {
                // switch state to connected
                account.connected = true;
                this.game.accountManager.saveAccount(account);
                player.setAccount(account);
                player.send(new common.IdentificationResult(common.IdentificationResultEnum.SUCCESS, account.toNetwork()));
                this.game.playerJoin(player);
            } else {
                // player is already connected
                player.send(new common.IdentificationResult(common.IdentificationResultEnum.ALREADY_CONNECTED));
            }
        } else {
            // wrong credentials
            player.send(new common.IdentificationResult(common.IdentificationResultEnum.WRONG_CREDENTIALS));
        }
    }

    handleMovementRequest(player, message) {
        let ship = player.getShip();
        let direction = new common.Vec2(message.direction.x, message.direction.y);
        let newVelocity = direction.normalized().mul(ship.getSpeed());
        ship.setVelocity(newVelocity);
        this.game.broadcastSync(ship);
    }

    handleShootRequest(player, message) {
        let ship = player.getShip();
        ship.setShooting(message.value);
    }

    handleRotationRequest(player, message) {
        let ship = player.getShip();
        ship.setRotation(message.angle);
        this.game.broadcastSync(ship);
    }

    handleReady(player, message) {
        player.setReady(true);
    }
}

class Player {
    constructor(socket) {
        this.socket = socket;
        this.ship = null;
        this.account = null;
        this.team = null;
        this.ready = false;
    }

    isReady() {
        return this.ready;
    }

    setReady(value) {
        this.ready = value;
    }

    getTeam() {
        return this.team;
    }

    setTeam(teamId) {
        this.team = teamId;
    }

    getAccount() {
        return this.account;
    }

    setAccount(account) {
        this.account = account;
    }

    getId() {
        return this.account.id;
    }

    getShip() {
        return this.ship;
    }

    setShip(ship) {
        this.ship = ship;
    }

    getShipType() {
        return this.account.shipType;
    }

    getUsername() {
        return this.account.username;
    }

    getLevel() {
        return this.account.level;
    }

    send(message) {
        this.socket.emit("message", message);
    }

    toNetwork() {
        return new common.PlayerInfo(
            this.getId(),
            this.getUsername(),
            this.getLevel()
        );
    }
}

class Rectangle {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    getBounds(angle) {
        let hw = this.width / 2;
        let hh = this.height / 2;
        angle = 0;
        return {
            bottomLeft: this.rotatePoint({
                x: -hw,
                y: -hh
            }, angle),
            bottomRight: this.rotatePoint({
                x: hw,
                y: -hh
            }, angle),
            topRight: this.rotatePoint({
                x: hw,
                y: hh
            }, angle),
            topLeft: this.rotatePoint({
                x: -hw,
                y: hh
            }, angle)
        };
    }

    rotatePoint(point, angle) {
        let pivot = {
            x: this.x,
            y: this.y
        };
        let cos = Math.cos(angle);
        let sin = Math.sin(angle);
        let rotatedX = cos * (point.x - pivot.x) - sin * (point.y - pivot.y)
        let rotatedY = sin * (point.x - pivot.x) + cos * (point.y - pivot.y);
        return {
            x: rotatedX - pivot.x,
            y: rotatedY - pivot.y
        };
    }
}

class AbstractNetworkEntity extends common.AbstractEntity {
    constructor(info, width, height) {
        super(info);
        this.width = width * GameConstants.SCALE;
        this.height = height * GameConstants.SCALE;
        this.updateRect();
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    setPosition(newPosition) {
        super.setPosition(newPosition);
        this.updateRect();
    }

    setRotation(newRotation) {
        super.setRotation(newRotation);
        this.updateRect();
    }

    updateRect() {
        let pos = this.getPosition();
        this.rect = new Rectangle(
            pos.x,
            pos.y,
            this.getWidth(),
            this.getHeight()
        );
    }

    getPolygon() {
        let bounds = this.rect.getBounds(this.getRotation());
        let polygon = turf.polygon([
            [
                [
                    bounds.bottomLeft.x, bounds.bottomLeft.y
                ],
                [
                    bounds.bottomRight.x, bounds.bottomRight.y
                ],
                [
                    bounds.topRight.x, bounds.topRight.y
                ],
                [
                    bounds.topLeft.x, bounds.topLeft.y
                ],
                [
                    bounds.bottomLeft.x, bounds.bottomLeft.y
                ]
            ]
        ]);
        return polygon;
    }

    collideWith(entity) {
        let intersection = turf.intersect(this.getPolygon(), entity.getPolygon());
        return intersection !== undefined;
    }

    toNetwork() {
        return this.info;
    }
}

class Ship extends AbstractNetworkEntity {
    constructor(info, hasGun, speed, shootSpeed, powerFactor, projectileSpeed, width, height) {
        super(info, width, height);
        this.hasGun = hasGun;
        this.speed = speed;
        this.shootSpeed = shootSpeed;
        this.powerFactor = powerFactor;
        this.projectileSpeed = projectileSpeed;
        this.shooting = false;
        this.lastShootAccumulator = 0;
    }

    getProjectileSpeed() {
        return this.projectileSpeed;
    }

    setProjectileSpeed(speed) {
        this.projectileSpeed = speed;
    }

    getSpeed() {
        return this.speed;
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    getPowerFactor() {
        return this.powerFactor;
    }

    setPowerFactor(power) {
        this.powerFactor = power;
    }

    setShooting(value) {
        this.shooting = value;
    }

    canShoot() {
        return this.hasGun && this.shooting && this.lastShootAccumulator <= 0;
    }

    resetShootAccumulator() {
        this.lastShootAccumulator = this.shootSpeed;
    }

    getShootSpeed() {
        return this.shootSpeed;
    }

    setShootSpeed(value) {
        this.shootSpeed = value;
    }

    update(dt) {
        super.update(dt);
        this.lastShootAccumulator -= dt;
        let position = this.getPosition();
        if (this.position.x >= GameConstants.MAP_MAX_X || this.position.x <= GameConstants.MIN_MAP_X) {

        }
    }
}

class Hunter extends Ship {
    constructor(info) {
        super(info, true, 400, 0.6, 0, 500, 99, 75);
    }
}

class Frigate extends Ship {
    constructor(info) {
        super(info, true, 320, 0.4, 1, 450, 112, 75);
    }
}

class BattleCruiser extends Ship {
    constructor(info) {
        super(info, true, 250, 0.3, 2, 400, 98, 75);
    }
}

class UFO extends Ship {
    constructor(info) {
        super(info, false, 450, 0, 0, 0, 91, 91);
    }
}

class Projectile extends AbstractNetworkEntity {
    constructor(info, width, height) {
        super(info, width, height);
    }
}

class ThickLaser extends Projectile {
    constructor(id, team, position, velocity, rotation, power) {
        super(
            new common.ProjectileInfo(
                id,
                team,
                position,
                velocity,
                rotation,
                power,
                1
            ),
            13,
            37
        );
    }
}

class ThinLaser extends Projectile {
    constructor(id, team, position, velocity, rotation, power) {
        super(
            new common.ProjectileInfo(
                id,
                team,
                position,
                velocity,
                rotation,
                power,
                0
            ),
            9,
            37
        );
    }
}

class Team {
    constructor(id) {
        this.id = id;
        this.players = [];
    }

    addPlayer(player) {
        this.players.push(player);
    }

    ready() {
        return this.players.every(player => player.isReady());
    }

    getPlayers(callback) {
        return this.players.filter(callback);
    }

    broadcast(message) {
        this.players.forEach(player => player.send(message));
    }

    clear() {
        this.players.clear();
    }
}

class ShipFactory {
    static Create(info) {
        switch (info.shipType) {
            case common.ShipTypeId.HUNTER:
                return new Hunter(info);
            case common.ShipTypeId.FRIGATE:
                return new Frigate(info);
            case common.ShipTypeId.BATTLE_CRUISER:
                return new BattleCruiser(info);
            case common.ShipTypeId.UFO:
                return new UFO(info);
        }
        console.log("unknow ship type: " + info.shipType);
    }
}

class Game {
    constructor() {
        this.teams = [
            new Team(0),
            new Team(1)
        ];
        this.entitiesToRemove = [];
        this.entities = [];
        this.state = common.GameStateId.INITALIZING;
        this.core = createGame();
        this.handler = new GameHandler(this);
        this.accountManager = new AccountManager();
    }

    start() {
        let that = this;
        this.core.on("update", (dt) => that.update(dt));
        this.core.start();

        var handler = this.handler;
        var accountManager = this.accountManager;
        io.on("connection", function (socket) {
            console.log("Client connected.");
            let player = new Player(socket);
            socket.on("message", function (message) {
                handler.handle(player, message);
            });
            socket.on("disconnect", function () {
                console.log("Client disconnected.");
                if (player.getAccount() !== null) {
                    player.getAccount().connected = false;
                    accountManager.saveAccount(player.getAccount());
                }
            });
        });
    }

    goToGameState(newState) {
        console.log("game state changed: " + newState);
        this.state = newState;
        this.broadcast(new common.GameStateUpdate(newState));
    }

    addEntity(entity) {
        this.entities.push(entity);
        this.broadcast(
            new common.EntitySpawn(
                entity.getType(),
                entity.toNetwork()
            )
        );
    }

    spawnEntities() {
        this.entities.forEach(
            entity =>
            this.broadcast(
                new common.EntitySpawn(
                    entity.getType(),
                    entity.toNetwork()
                )
            ),
            this
        );
    }

    removeEntity(entity) {
        let index = this.entities.indexOf(entity);
        if (index != -1) {
            this.entities.splice(index, 1);
        }
        this.broadcast(new common.EntityDestroy(entity.getId()));
    }

    getEntity(entityId) {
        this.entities.find(entity => entity.getId() === entityId);
    }

    broadcast(message) {
        io.sockets.emit("message", message);
    }

    broadcastSync(entity) {
        this.broadcast(
            new common.EntitySync(
                entity.getId(),
                entity.getPosition(),
                entity.getVelocity(),
                entity.getRotation()
            )
        );
    }

    getNextProjectileId() {
        return this.nextProjectileId--;
    }

    getNextTeam() {
        var minPlayer = 10000000;
        var nextTeam = null;
        for (var i = 0; i < this.teams.length; i++) {
            var currentTeam = this.teams[i];
            if (currentTeam.players.length <= minPlayer) {
                nextTeam = currentTeam;
                minPlayer = currentTeam.players.length;
            }
        }
        return nextTeam;
    }

    playerJoin(player) {
        let nextTeam = this.getNextTeam();
        player.setTeam(nextTeam);
        nextTeam.addPlayer(player);
        this.broadcast(new common.PlayerJoin(player.toNetwork()));
    }

    isSyncRequired() {
        return this.syncAccumulator >= this.syncInterval;
    }

    updateSyncAccumulator(dt) {
        this.syncAccumulator += dt;
    }

    resetSyncAccumulator() {
        this.syncAccumulator = 0;
    }

    update(dt) {
        switch (this.state) {
            case common.GameStateId.INITALIZING:
                this.onInit(dt);
                break;
            case common.GameStateId.WAITING_PLAYERS:
                this.onWaitingPlayers(dt);
                break;
            case common.GameStateId.WAITING_READY:
                this.onWaitingPlayersReady(dt);
                break;
            case common.GameStateId.PLAYING:
                this.onPlaying(dt);
                break;
            case common.GameStateId.DONE:
                this.onDone(dt);
                break;
        }
    }

    onInit(dt) {
        this.teams.forEach(team => team.clear());
        this.entities.clear();
        this.syncAccumulator = 0;
        this.syncInterval = 2;
        this.nextProjectileId = -1;
        this.entitiesToRemove.clear();

        this.goToGameState(common.GameStateId.WAITING_PLAYERS);
    }

    onWaitingPlayers(dt) {
        // each team should have at least one player
        if (this.teams.some(team => team.players.length == 0)) {
            return;
        }

        // spawn ship for each player
        for (var i = 0; i < this.teams.length; i++) {
            console.log("game spawning ships for team: " + i);
            var currentTeam = this.teams[i];
            currentTeam.players.forEach(player => {
                player.setShip(
                    ShipFactory.Create(
                        new common.ShipInfo(
                            player.getId(),
                            i,
                            new common.Point(250, 100),
                            new common.Vec2(0, 0),
                            0,
                            player.getShipType()
                        )
                    )
                );
                this.addEntity(player.getShip());
            }, this);
        }

        this.goToGameState(common.GameStateId.WAITING_READY);
    }

    onWaitingPlayersReady(dt) {
        if (this.teams.some(team => !team.ready())) {
            this.spawnEntities();
        } else {
            this.goToGameState(common.GameStateId.PLAYING);
        }
    }

    onPlaying(dt) {

        // updating entities
        this.onUpdateEntities(dt);

        // checking collisions
        this.onCheckCollisions(dt);

        // cleanup
        this.onPostPlayingUpdate();
    }

    onDone(dt) {

    }

    onUpdateEntities(dt) {

        // update sync timer
        this.updateSyncAccumulator(dt);
        // whenever a position sync is required, every ~ 2sec
        var syncRequired = this.isSyncRequired();
        if (syncRequired) {
            this.resetSyncAccumulator();
        }

        // updating
        for (var i = 0; i < this.entities.length; i++) {
            let entity = this.entities[i];
            // update entity and sub objects
            entity.update(dt);

            switch (entity.getType()) {
                case common.EntityTypeId.SHIP:
                    // sync ship position/velocity/rot
                    if (syncRequired) {
                        this.broadcast(
                            new common.EntitySync(
                                entity.getId(),
                                entity.getPosition(),
                                entity.getVelocity(),
                                entity.getRotation()
                            )
                        );
                    }
                    // projectile creation while shooting
                    if (entity.canShoot()) {
                        entity.resetShootAccumulator();
                        let angle = entity.getRotation();
                        let position = entity.getPosition();
                        let radAngle = angle * Math.PI / 180;
                        let projectileDirection = new common.Vec2(Math.cos(radAngle), Math.sin(radAngle));
                        let projectileVelocity = projectileDirection.mul(entity.getProjectileSpeed());
                        // either big or small one ;D ?
                        if (entity.getPowerFactor() > 2) {
                            this.addEntity(
                                new ThickLaser(
                                    this.getNextProjectileId(),
                                    entity.getTeam(),
                                    entity.getPosition(),
                                    projectileVelocity,
                                    entity.getRotation(),
                                    entity.getPowerFactor()
                                )
                            );
                        } else {
                            this.addEntity(
                                new ThinLaser(
                                    this.getNextProjectileId(),
                                    entity.getTeam(),
                                    entity.getPosition(),
                                    projectileVelocity,
                                    entity.getRotation(),
                                    entity.getPowerFactor()
                                )
                            );
                        }
                    }
                    break;

                case common.EntityTypeId.PROJECTILE:
                    let position = entity.getPosition();
                    if (position.x >= GameConstants.MAP_MAX_X ||
                        position.x <= GameConstants.MAP_MIN_X ||
                        position.y >= GameConstants.MAP_MAX_Y ||
                        position.y <= GameConstants.MAP_MIN_Y) {
                        this.entitiesToRemove.push(entity);
                    }
                    break;
            }
        }
    }

    onCheckCollisions(dt) {
        for (var i = 0; i < this.entities.length; i++) {
            for (var j = i; j < this.entities.length; j++) {
                let a = this.entities[i];
                let b = this.entities[j];

                if (a.getId() == b.getId())
                    continue;

                if (a.getTeam() == b.getTeam())
                    continue;

                if (this.entitiesToRemove.indexOf(a) != -1 ||
                    this.entitiesToRemove.indexOf(b) != -1)
                    continue;

                if (a.collideWith(b)) {
                    if ((a.getType() == common.EntityTypeId.SHIP &&
                            b.getType() == common.EntityTypeId.PROJECTILE) ||
                        (b.getType() == common.EntityTypeId.SHIP &&
                            a.getType() == common.EntityTypeId.PROJECTILE)) {
                        if (a.getType() == common.EntityTypeId.SHIP) {
                            this.onCollision(a, b);
                        } else {
                            this.onCollision(b, a);
                        }
                    } else if (a.getType() == common.EntityTypeId.PROJECTILE && b.getType() && common.EntityTypeId.PROJECTILE) {
                        this.entitiesToRemove.push(a);
                        this.entitiesToRemove.push(b);
                        this.broadcast(new common.EntityHit(a.getId(), a.getPosition(), 0));
                    }
                }
            }
        }
    }

    onCollision(ship, projectile) {
        this.entitiesToRemove.push(projectile);
        this.broadcast(new common.EntityHit(ship.getId(), projectile.getPosition(), 0));
    }

    onPostPlayingUpdate() {
        this.entitiesToRemove.forEach(entity => this.removeEntity(entity), this);
        this.entitiesToRemove.clear();
    }
}

exports.Game = Game;