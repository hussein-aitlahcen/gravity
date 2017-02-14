var HelloWorldLayer = cc.Layer.extend({
    sprite: null,
    ctor: function () {
        this._super();

        var size = cc.winSize;

        var ufo = new cc.Sprite(res.assets.game.ship.ufo.yellow);
        ufo.setScale(0.5, 0.5);
        ufo.setPosition(new cc.Point(size.width / 2, size.height / 2));

        this.addChild(ufo, 5);

        return true;
    }
});

var HelloWorldScene = cc.Scene.extend({
    onEnter: function () {
        this._super();
        var layer = new HelloWorldLayer();
        this.addChild(layer);
    }
});