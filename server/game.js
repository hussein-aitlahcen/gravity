"use strict";

var io = require("socket.io")(server);
var common = require("../common/crossref");
var createGame = require("gameloop");

const GameConstants = {
    MAP_MIN_X: -20,
    MAP_MIN_Y: -20,
    MAP_MAX_X: 600,
    MAP_MAX_Y: 800
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
        this.handlers = {};
        this.game = game;
        this.addHandler(common.MessageId.CS_IDENTIFICATION_REQ, this.handleIdentification);
        this.addHandler(common.MessageId.CS_MOVEMENT_REQ, this.handleMovementRequest);
        this.addHandler(common.MessageId.CS_SHOOT_REQ, this.handleShootRequest);
        this.addHandler(common.MessageId.CS_ROTATION_REQ, this.handleRotationRequest);
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
}

class Player {
    constructor(socket) {
        this.socket = socket;
        this.ship = null;
        this.account = null;
        this.team = null;
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

class AbstractNetworkEntity extends common.AbstractEntity {
    constructor(info, width, height) {
        super(info);
        this.width = width;
        this.height = height;
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    getBounds() {
        let pos = this.getPosition();
        let w = this.getWidth();
        let h = this.getHeight();
        let hw = w / 2;
        let hh = h / 2;
        return {
            minx: pos.x - hw,
            miny: pos.y - hh,
            maxx: pos.x + hw,
            maxy: pos.y + hh
        };
    }

    collideWith(entity) {
        let localBounds = this.getBounds();
        let remoteBounds = entity.getBounds();
        return !(remoteBounds.minx > localBounds.maxx ||
            remoteBounds.maxx < localBounds.minx ||
            remoteBounds.maxy > localBounds.miny ||
            remoteBounds.miny < localBounds.maxy);
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

    broadcast(message) {
        this.players.forEach(player => player.send(message));
    }
}

class ShipFactory {
    static Create(info) {
        switch (info.shipType) {
            case common.ShipTypeId.HUNTER: return new Hunter(info);
            case common.ShipTypeId.FRIGATE: return new Frigate(info);
            case common.ShipTypeId.BATTLE_CRUISER: return new BattleCruiser(info);
            case common.ShipTypeId.UFO: return new UFO(info);
        }
        console.log("unknow ship type: " + info.shipType);
    }
}

class Game {
    constructor() {
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
                console.log("Client message: ");
                console.log(message);
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
        this.teams = [
            new Team(0),
            new Team(1)
        ];
        this.entities = [];
        this.syncAccumulator = 0;
        this.syncInterval = 2;
        this.nextProjectileId = -1;
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

            this.goToGameState(common.GameStateId.WAITING_READY);
        }
    }

    onWaitingPlayersReady(dt) {
        this.goToGameState(common.GameStateId.PLAYING);
    }

    onPlaying(dt) {
        // updating entities
        this.onUpdateEntities(dt);

        // checking collisions
        this.onCheckCollisions(dt);
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

        let toRemove = [];

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
                        toRemove.push(entity);
                    }
                    break;
            }
        }

        toRemove.forEach(entity => this.removeEntity(entity), this);
    }

    onCheckCollisions(dt) {
        let toRemove = [];

        for (var i = 0; i < this.entities.length; i++) {
            for (var j = i; j < this.entities.length; j++) {
                let a = this.entities[i];
                let b = this.entities[j];
                // ignore same team
                if (a.getTeam() === b.getTeam())
                    continue;

                // ignore entities that are going to be destroyed
                if (toRemove.indexOf(a) != -1 || toRemove.indexOf(b) != -1)
                    continue;


            }
        }

        toRemove.forEach(entity => this.removeEntity(entity), this);
    }
}

exports.Game = Game;