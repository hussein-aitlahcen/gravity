var _ = require("underscore");
var io = require("socket.io")(server);
var common = require("../common/crossref");
var createGame = require("gameloop");
var netmsg = common.NetMsg.Server;
var netenum = common.NetMsg.Enum;
var nettype = common.NetType;

var Account = function (id, username, password, banned, connected, experience, level, shipType) {
    this.id = id;
    this.username = username;
    this.password = password;
    this.banned = banned;
    this.experience = experience;
    this.level = level;
    this.shipType = shipType;
    this.connected = connected;
    this.toNetwork = function () {
        return new common.NetType.AccountInfo(this.id, this.experience, this.level);
    };
};

var Accounts = [
    new Account(0, "smarken", "test", false, false, 0, 1, 0),
    new Account(1, "test", "test", false, false, 0, 1, 1)
];

var AccountManager = {
    get: function (username) {
        return _.find(Accounts, function (account) {
            return account.username == username;
        });
    },
    save: function (account) {

    }
};

var HandleIdentification = function (socket, message) {
    var account = AccountManager.get(message.username);
    if (account !== undefined && account.password == message.password) {
        if (!account.connected) {
            // switch state to connected
            account.connected = true;
            AccountManager.save(account);
            socket.account = account;
            socket.emit("message", netmsg.IdentificationResult.create(netenum.IdentificationResultEnum.SUCCESS, account.toNetwork()));
            Game.playerJoin(socket);
        } else {
            // player is already connected
            socket.emit("message", netmsg.IdentificationResult.create(netenum.IdentificationResultEnum.ALREADY_CONNECTED));
        }
    } else {
        // wrong credentials
        socket.emit("message", netmsg.IdentificationResult.create(netenum.IdentificationResultEnum.WRONG_CREDENTIALS));
    }
};

var HandleMovementRequest = function (socket, message) {
    io.sockets.emit("message", netmsg.PlayerUpdate.create(socket.account.id, message.vector, 200));
};

var Player = function (socket, team) {
    this.socket = socket;
    this.team = team;
    this.toNetwork = function () {
        return new nettype.PlayerInfo(this.socket.account.id, this.team.id, this.socket.account.level, this.socket.account.shipType);
    }
};

var Team = function (id) {
    this.id = id;
    this.players = [];
    this.addPlayer = function (player) {
        this.players.push(player);
    }
};

var GameState = {
    INIT: 0,
    WAITING_PLAYERS: 1,
    WAITING_READY: 2,
    PLAYING: 3,
    DONE: 4
};

var Game = {
    state: GameState.INIT,
    core: createGame(),
    start: function () {
        this.core.on("update", this.loop());
        this.core.start();
    },
    loop: function () {
        var that = this;
        return function (dt) {
            switch (that.state) {
                case GameState.INIT:
                    that.onInit();
                    break;
                case GameState.WAITING_PLAYERS:
                    that.onWaitingPlayers();
                    break;
                case GameState.WAITING_READY:
                    that.onWaitingPlayersReady();
                    break;
                case GameState.DONE:
                    that.onDone();
                    break;
            }
        };
    },
    getNextTeam: function () {
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
    },
    playerJoin: function (socket) {
        var nextTeam = this.getNextTeam();
        var player = new Player(socket, nextTeam);
        nextTeam.addPlayer(player);
    },
    onInit: function () {
        console.log("game state init");
        this.teams = [
            new Team(0),
            new Team(1)
        ];
        this.state = GameState.WAITING_PLAYERS;
    },
    onWaitingPlayers: function () {
        if (_.all(this.teams, function (team) {
                return team.players.length > 0;
            })) {
            console.log("game state ready");
            this.state = GameState.WAITING_READY;
            for (var i = 0; i < this.teams.length; i++) {
                console.log("game spawning unit for team: " + i);
                var currentTeam = this.teams[i];
                io.sockets.emit("message", netmsg.PlayerSpawn.create(_.map(currentTeam.players, function (player) {
                    return player.toNetwork();
                })));
            }
            io.sockets.emit("message", netmsg.GameStart.create());
        }
    },
    onWaitingPlayersReady: function () {
        console.log("game state playing");
        this.state = GameState.PLAYING;
    },
    onPlaying: function () {

    },
    onDone: function () {

    }
};

var MessageHandlers = {};
MessageHandlers[common.NetMsg.Client.IdentificationRequest.ID] = HandleIdentification;
MessageHandlers[common.NetMsg.Client.MovementRequest.ID] = HandleMovementRequest;

io.on("connection", function (socket) {
    console.log("Client connected.");
    socket.on("message", function (message) {
        console.log("Client message: ");
        console.log(message);
        MessageHandlers[message.id](socket, message);
    });
    socket.on("disconnect", function () {
        console.log("Client disconnected.");
        if (socket.account !== undefined) {
            socket.account.connected = false;
            AccountManager.save(socket.account);
        }
    });
});

exports.Game = Game;