var NetLayer = cc.Layer.extend({
    ctor: function () {
        this._super();

        var that = this;
        cc.eventManager.addListener(cc.EventListener.create({
            event: cc.EventListener.CUSTOM,
            eventName: GRAVITY_EVENT,
            callback: function (event) {
                var gravityEvent = event.getUserData();
                var gameCanvas = gravityEvent.data;
                switch (gravityEvent.type) {
                    case NetworkEventType.INCOMMING_MESSAGE:
                        that.onIncommingMessage(gravityEvent.data);
                        break;
                    case NetworkEventType.OUTGOING_MESSAGE:
                        that.onOutgoingMessage(gravityEvent.data);
                        break;
                    case NetworkEventType.DISCONNECTED:
                        that.onDisconnected(gravityEvent.data);
                        break;
                }
            }
        }), 1);

        return true;
    },
    sendMessage: function (message) {
        GravityEvent.fire(NetworkEventType.OUTGOING_MESSAGE, message);
    }
});