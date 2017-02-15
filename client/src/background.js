var Background = {
    create: function (image, size) {
        var bg = new cc.Sprite();
        var tex = cc.textureCache.addImage(image);
        if (!tex.isLoaded()) {
            tex.addLoadedEventListener(function () {
                bg.setTexture(tex);
                bg.setTextureRect(new cc.Rect(0, 0, size.width, size.height));
                bg.getTexture().setTexParameters(cc.LINEAR, cc.LINEAR, cc.REPEAT, cc.REPEAT);
            });
        }
        bg.setPosition(new cc.Point(size.width / 2, size.height / 2));
        return bg;
    }
};