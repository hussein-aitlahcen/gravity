var express = require("express");
var app = express();
global.server = require("http").createServer(app);
var game = require("./game");

server.listen(8000, function () {
    console.log("Server listening.");
});

app.use(express.static("../client"));
app.use(express.static("../common"));

new game.Game().start();