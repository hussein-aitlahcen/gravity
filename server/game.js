"use strict";

var io = require("socket.io")(server);
var common = require("../common/crossref");
var createGame = require("gameloop");

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
        let vec = new common.Vec2(message.direction.x, message.direction.y);
        let newVelocity = vec.normalized().mul(ship.getSpeed());
        console.log(newVelocity);
        ship.setVelocity(newVelocity);
        this.game.broadcast(
            new common.EntitySync(
                ship.getId(),
                ship.getPosition(),
                newVelocity,
                new common.Vec2(0, 0)
            )
        );
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

class Ship extends common.AbstractEntity {
    constructor(info) {
        super(info)
        this.speed = 200;
    }

    getSpeed() {
        return this.speed;
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    update(dt) {
        super.update(dt);
    }

    toNetwork() {
        return this.info;
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
                if (player.getAccount() !== undefined) {
                    player.getAccount().connected = false;
                    accountManager.saveAccount(player.getAccount());
                }
            });
        });
    }

    goToGameState(newState) {
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

    getEntity(entityId) {
        this.entities.find(entity => entity.getId() === entityId);
    }

    broadcast(message) {
        io.sockets.emit("message", message);
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
        console.log("game state init");
        this.teams = [
            new Team(0),
            new Team(1)
        ];
        this.entities = [];
        this.syncAccumulator = 0;
        this.syncInterval = 2;
        this.goToGameState(common.GameStateId.WAITING_PLAYERS);
    }

    onWaitingPlayers(dt) {

        // each team should have at least one player
        if (this.teams.some(team => team.players.length == 0)) {
            return;
        }

        console.log("game state ready");
        this.goToGameState(common.GameStateId.WAITING_READY);

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
                        i
                    )
                ));
                this.addEntity(player.getShip());
            }, this);
        }
    }

    onWaitingPlayersReady(dt) {
        this.goToGameState(common.GameStateId.PLAYING);
    }

    onPlaying(dt) {
        this.entities.forEach(entity => entity.update(dt));
    }

    onDone(dt) {

    }
}

exports.Game = Game;