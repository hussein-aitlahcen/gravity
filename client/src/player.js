var PlayerConstants = {
    COLOR_ALLY: "green",
    COLOR_ENNEMY: "red"
}

var Player = function (info, local) {
    this.info = info;
    // local player ?
    this.local = local;
};