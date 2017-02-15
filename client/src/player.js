var PlayerConstants = {
    COLOR_ALLY: "green",
    COLOR_ENNEMY: "red"
}

var ACCOUNT_LOCAL = null;

var Player = function (info) {
    this.local = info.id === ACCOUNT_LOCAL.id;
    this.info = info;
};