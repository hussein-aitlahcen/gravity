"use strict";

class EntityHitSprite {
    static create(info) {
        let sprite = new cc.Sprite(Resources.assets.game.laser + "hit1.png");
        sprite.setAnchorPoint(new cc.Point(0.5, 0.5));
        sprite.setPosition(info.position);
        sprite.runAction(
            new cc.Sequence(
                new cc.DelayTime(0.6),
                new cc.RemoveSelf(false)
            )
        );
        return sprite;
    }
}