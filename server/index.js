var _ = require("underscore");
var express = require("express");
var app = express();
var server = require("http").createServer(app);
var io = require("socket.io")(server);
var common = require("../common/message");

server.listen(8000, function () {
    console.log("Server listening.");
});

app.use(express.static("../client"));
app.use(express.static("../common"));

var Account = function (id, username, password, banned, connected, experience, level) {
    this.id = id;
    this.username = username;
    this.password = password;
    this.banned = banned;
    this.experience = experience;
    this.level = level;
    this.connected = connected;
    this.toNetwork = function () {
        return new common.AccountInfo(this.id, this.experience, this.level);
    };
};

var Accounts = [new Account(0, "smarken", "test", false, 0, 1)];

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
    var result = undefined;
    if (account !== undefined && account.password == message.password) {
        if (!account.connected) {
            // switch state to connected
            account.connected = true;
            AccountManager.save(account);
            socket.account = account;
            result = new common.IdentificationResult(common.IdentificationResultEnum.SUCCESS, account.toNetwork());
        }
        else {
            // player is already connected
            result = new common.IdentificationResult(common.IdentificationResultEnum.ALREADY_CONNECTED);
        }
    }
    else {
        // wrong credentials
        result = new common.IdentificationResult(common.IdentificationResultEnum.WRONG_CREDENTIALS);
    }
    socket.emit("message", result);
};

var MessageHandlers = {};
MessageHandlers[common.MessageId.CMSG_IDENTIFICATION_REQ] = HandleIdentification;


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