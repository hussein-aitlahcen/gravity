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
            new Account(0, "smarken", "test", false, false, 0, 1, 0),
            new Account(1, "test", "test", false, false, 0, 1, 1)
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
        this.game.broadcast(
            new common.EntitySync(
                ship.getId(),
                ship.getPosition(),
                newVelocity,
                ship.getRotation()
            )
        );
    }

    handleShootRequest(player, message) {
        let ship = player.getShip();
        ship.setShooting(message.value);
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
    constructor(info) {
        super(info);
    }

    toNetwork() {
        return this.info;
    }
}

class Ship extends AbstractNetworkEntity {
    constructor(info) {
        super(info)
        this.speed = 200;
        this.shootSpeed = 0.2;
        this.projectileSpeed = 350;
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

    setShooting(value) {
        this.shooting = value;
    }

    canShoot() {
        return this.shooting && this.lastShootAccumulator <= 0;
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

class Projectile extends AbstractNetworkEntity {
    constructor(info) {
        super(info);
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
                player.setShip(new Ship(
                    new common.ShipInfo(
                        player.getId(),
                        i,
                        new common.Point(250, 100),
                        new common.Vec2(0, 0),
                        0,
                        player.getShipType()
                    )
                ));
                this.addEntity(player.getShip());
            }, this);

            this.goToGameState(common.GameStateId.WAITING_READY);
        }
    }

    onWaitingPlayersReady(dt) {
        this.goToGameState(common.GameStateId.PLAYING);
    }

    onPlaying(dt) {
        // update sync timer
        this.updateSyncAccumulator(dt);
        // whenever a position sync is required, every ~ 2sec
        var syncRequired = this.isSyncRequired();
        if (syncRequired) {
            this.resetSyncAccumulator();
        }

        let toRemove = [];

        this.entities.forEach(entity => {
            // update entity and sub objetcs
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
                        let projVelocity = new common.Vec2(0, entity.getProjectileSpeed());
                        let projectile = new Projectile(
                            new common.ProjectileInfo(
                                this.getNextProjectileId(),
                                entity.getTeam(),
                                entity.getPosition(),
                                projVelocity,
                                0,
                                1
                            )
                        );
                        this.addEntity(projectile);
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
        }, this);

        toRemove.forEach(entity => this.removeEntity(entity), this);
    }

    onDone(dt) {

    }
}

exports.Game = Game;