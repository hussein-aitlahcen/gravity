var socket = io();
var socketGravityListener = cc.EventListener.create({
    event: cc.EventListener.CUSTOM,
    eventName: GRAVITY_EVENT,
    callback: function (event) {
        var gravityEvent = event.getUserData();
        switch (gravityEvent.type) {
            case NetworkEventType.OUTGOING_MESSAGE:
                socket.emit("message", gravityEvent.data);
                break;
        }
    }
});

GravityEvent.fire(NetworkEventType.connecting);

socket.on("connect", function () {
    cc.log("network: connected");
    GravityEvent.fire(NetworkEventType.CONNECTED);
    cc.eventManager.addListener(socketGravityListener, 1);
});
socket.on("message", function (message) {
    cc.log(message);
    GravityEvent.fire(NetworkEventType.INCOMMING_MESSAGE, message);
});
socket.on("disconnect", function () {
    cc.log("network: disconnected");
    cc.eventManager.removeListener(socketGravityListener);
});