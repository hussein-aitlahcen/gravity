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

    handle(socket, message) {
        if (this.handlers.hasOwnProperty(message.id)) {
            this.handlers[message.id].call(this, socket, message);
        } else {
            console.log("unhandled message");
            console.log(message);
        }
    }

    handleIdentification(socket, message) {
        let account = this.game.accountManager.getAccount(message.username);
        if (account !== undefined && account.password == message.password) {
            if (!account.connected) {
                // switch state to connected
                account.connected = true;
                this.game.accountManager.saveAccount(account);
                socket.account = account;
                socket.emit("message", new common.IdentificationResult(common.IdentificationResultEnum.SUCCESS, account.toNetwork()));
                this.game.playerJoin(socket);
            } else {
                // player is already connected
                socket.emit("message", new common.IdentificationResult(common.IdentificationResultEnum.ALREADY_CONNECTED));
            }
        } else {
            // wrong credentials
            socket.emit("message", new common.IdentificationResult(common.IdentificationResultEnum.WRONG_CREDENTIALS));
        }
    }

    handleMovementRequest(socket, message) {

    }
}

class Player {
    constructor(socket, team) {
        this.socket = socket;
        this.team = team;
    }

    toNetwork() {
        return new common.PlayerInfo(
            this.socket.account.id,
            this.socket.account.username,
            this.socket.account.level
        );
    }
}

class Ship extends common.AbstractEntity {
    constructor(info) {
        super(info)
    }

    update(dt) {
        super.update(dt);
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
        this.teams = [
            new Team(0),
            new Team(1)
        ];
        this.syncAccumulator = 0;
        this.syncInterval = 2;
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
            socket.on("message", function (message) {
                console.log("Client message: ");
                console.log(message);
                handler.handle(socket, message);
            });
            socket.on("disconnect", function () {
                console.log("Client disconnected.");
                if (socket.account !== undefined) {
                    socket.account.connected = false;
                    accountManager.saveAccount(socket.account);
                }
            });
        });
    }

    goToGameState(newState) {
        this.state = newState;
        this.broadcast(new common.GameStateUpdate(newState));
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

    playerJoin(socket) {
        let nextTeam = this.getNextTeam();
        let player = new Player(socket, nextTeam);
        socket.player = player;
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
        this.syncAccumulator = 0;
        this.syncInterval = 2;
        this.state = common.GameStateId.WAITING_PLAYERS;
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
                player.ship = new Ship(new common.ShipInfo(player.info.id, i, new common.Point(250, 100), new common.Vec2(0, 0), i));
                this.broadcast(new common.EntitySpawn(common.EntityTypeId.SHIP, player.ship.info));
            }, this);
        }
    }

    onWaitingPlayersReady(dt) {

    }

    onPlaying(dt) {

    }

    onDone(dt) {

    }
}

exports.Game = Game;