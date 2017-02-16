"use strict";

var LoginLayer = NetLayer.extend({
    ctor: function () {
        this._super();

        let size = cc.winSize;

        this.addChild(Background.create(Resources.assets.background.dark_purple, size), -10);

        let txtUserNameSprite = new cc.Sprite(Resources.ui.button.blue);
        txtUserNameSprite.setPosition(new cc.Point(size.width / 2, (size.height / 2) + 30));
        let txtUserName = new ccui.TextField("Username", "Helvetica", 30);
        txtUserName.setTextColor(cc.color.BLACK);
        txtUserName.setPosition(new cc.Point(size.width / 2, (size.height / 2) + 30));
        this.addChild(txtUserNameSprite);
        this.addChild(txtUserName);

        let txtPasswordSprite = new cc.Sprite(Resources.ui.button.blue);
        txtPasswordSprite.setPosition(new cc.Point(size.width / 2, (size.height / 2) - 10));
        let txtPassword = new ccui.TextField("Password", "Helvetica", 30);
        txtPassword.setPasswordEnabled(true);
        txtPassword.setPasswordStyleText("*");
        txtPassword.setTextColor(cc.color.BLACK);
        txtPassword.setPosition(new cc.Point(size.width / 2, (size.height / 2) - 10));
        this.addChild(txtPasswordSprite);
        this.addChild(txtPassword);

        let btnLogin = new ccui.Button(Resources.ui.button.green, Resources.ui.button.red);
        btnLogin.setTitleText("Login");
        btnLogin.setTitleColor(cc.color.BLACK);
        btnLogin.setTitleFontSize(25);
        btnLogin.getTitleRenderer().setLocalZOrder(1);
        btnLogin.setPosition(new cc.Point(size.width / 2, (size.height / 2) - 60));
        this.addChild(btnLogin);

        let that = this;
        btnLogin.addTouchEventListener(function (sender, type) {
            switch (type) {
                case ccui.Widget.TOUCH_ENDED:
                    cc.log("logging in as " + txtUserName.getString());
                    that.sendMessage(new IdentificationRequest(txtUserName.getString(), txtPassword.getString()));
                    break;
            }
        }, this);

        return true;
    },
    onIncommingMessage: function (message) {
        if (message.id == MessageId.SC_IDENTIFICATION_RES) {
            if (message.code == IdentificationResultEnum.SUCCESS) {
                cc.log("login successfully, switching to game scene");
                cc.director.runScene(new GameScene(message.accountInfo));
            }
        }
    },
    onOutgoingMessage: function (message) {
    },
    onDisconnected: function (data) {
    }
});

var LoginScene = cc.Scene.extend({
    onEnter: function () {
        this._super();
        this.addChild(new LoginLayer);
    }
});