var MessageId = {
    CMSG_IDENTIFICATION_REQ: 0,
    SMSG_IDENTIFICATION_RES: 1
};

var IdentificationResultEnum = {
    SUCCESS: 0,
    WRONG_CREDENTIALS: 1,
    BANNED: 2,
    ALREADY_CONNECTED: 3
};

var IdentificationRequest = function (username, password) {
    this.id = MessageId.CMSG_IDENTIFICATION_REQ;
    this.username = username;
    this.password = password;
};

var IdentificationResult = function (code, info) {
    this.id = MessageId.SMSG_IDENTIFICATION_RES;
    this.code = code;
    this.info = info;
};

var PlayerInfo = function (id, team, level, shipType) {
    this.id = id;
    this.team = team;
    this.level = level;
    this.shipType = shipType;
};

var AccountInfo = function (id, experience, level) {
    this.id = id;
    this.experience = experience;
    this.level = level;
};

exports.PlayerInfo = PlayerInfo;
exports.AccountInfo = AccountInfo;
exports.MessageId = MessageId;
exports.IdentificationResultEnum = IdentificationResultEnum;
exports.IdentificationRequest = IdentificationRequest;
exports.IdentificationResult = IdentificationResult;