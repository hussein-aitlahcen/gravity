var NetMsg = {
    Enum: {
        IdentificationResultEnum: {
            SUCCESS: 0,
            WRONG_CREDENTIALS: 1,
            BANNED: 2,
            ALREADY_CONNECTED: 3
        }
    },
    Client: {
        IdentificationRequest: {
            ID: 0,
            create: function (username, password) {
                return {
                    id: NetMsg.Client.IdentificationRequest.ID,
                    username: username,
                    password: password
                }
            }
        },
        MovementRequest: {
            ID: 1,
            create: function (vec) {
                return {
                    id: NetMsg.Client.MovementRequest.ID,
                    vector: vec
                }
            }
        }
    },
    Server: {
        IdentificationResult: {
            ID: 100,
            create: function (code, info) {
                return {
                    id: NetMsg.Server.IdentificationResult.ID,
                    code: code,
                    info: info
                }
            }
        },
        PlayerSpawn: {
            ID: 101,
            create: function (infos) {
                return {
                    id: NetMsg.Server.PlayerSpawn.ID,
                    infos: infos
                }
            }
        },
        GameStart: {
            ID: 102,
            create: function () {
                return {
                    id: NetMsg.Server.GameStart.ID
                }
            }
        },
        PlayerUpdate: {
            ID: 103,
            create: function (playerId, movement, speed) {
                return {
                    id: NetMsg.Server.PlayerUpdate.ID,
                    playerId: playerId,
                    movement: movement,
                    speed: speed
                }
            }
        }
    }
}

var NetType = {
    PlayerInfo: function (id, team, level, shipType) {
        this.id = id;
        this.team = team;
        this.level = level;
        this.shipType = shipType;
    },
    AccountInfo: function (id, experience, level) {
        this.id = id;
        this.experience = experience;
        this.level = level;
    }
}

exports.NetType = NetType;
exports.NetMsg = NetMsg;