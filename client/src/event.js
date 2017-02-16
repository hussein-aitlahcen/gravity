var GRAVITY_EVENT = "gravity.event";

var GameEventType = {
    START: "game.event.start",
    STOP: "game.event.stop"
}

var EVENT_NETWORK = "network.event";
var NetworkEventType = {
    CONNECTING: "network.event.connecting",
    CONNECTED: "network.event.connected",
    DISCONNECTED: "network.event.disconnected",
    INCOMMING_MESSAGE: "network.event.message.incomming",
    OUTGOING_MESSAGE: "network.event.message.outgoing"
}

var GravityEvent = {
    fire: function (type, data) {
        var event = new cc.EventCustom(GRAVITY_EVENT);
        event.setUserData({
            type: type,
            data: data
        });
        cc.eventManager.dispatchEvent(event);
    }
};