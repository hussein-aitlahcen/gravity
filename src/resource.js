if (!String.format) {
    String.format = function (format) {
        var args = Array.prototype.slice.call(arguments, 1);
        return format.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined' ?
                args[number] :
                match;
        });
    };
}

var res = {
    assets: {
        background: {
            black: "res/assets/background/black.png",
            blue: "res/assets/background/blue.png",
            dark_purple: "res/assets/background/darkPurple.png",
            purple: "res/assets/background/purple.png",
        },
        game: {
            ship: {
                type_0: {
                    blue: "res/assets/game/ship/00.png",
                    green: "res/assets/game/ship/10.png",
                    orange: "res/assets/game/ship/20.png",
                    red: "res/assets/game/ship/30.png"
                },
                type_1: {
                    blue: "res/assets/game/ship/01.png",
                    green: "res/assets/game/ship/11.png",
                    orange: "res/assets/game/ship/21.png",
                    red: "res/assets/game/ship/31.png"
                },
                type_2: {
                    blue: "res/assets/game/ship/02.png",
                    green: "res/assets/game/ship/12.png",
                    orange: "res/assets/game/ship/22.png",
                    red: "res/assets/game/ship/32.png"
                },
                ufo: {
                    blue: "res/assets/game/ship/40.png",
                    green: "res/assets/game/ship/41.png",
                    red: "res/assets/game/ship/42.png",
                    yellow: "res/assets/game/ship/43.png"
                }
            }
        }
    }
};

var g_resources = [
    res.assets.background.black,
    res.assets.background.blue,
    res.assets.background.dark_purple,
    res.assets.background.purple
];