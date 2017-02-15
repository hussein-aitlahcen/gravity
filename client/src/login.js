var LoginLayer = NetLayer.extend({
    ctor: function () {
        this._super();

        var size = cc.winSize;

        this.addChild(Background.create(Resources.assets.background.dark_purple, size), -10);

        var txtUserName = new ccui.TextField("Username", "Helvetica", 30);
        txtUserName.setPosition(new cc.Point(size.width / 2, (size.height / 2) + 30));
        this.addChild(txtUserName);

        var txtPassword = new ccui.TextField("Password", "Helvetica", 30);
        txtPassword.setPasswordEnabled(true);
        txtPassword.setPasswordStyleText("*");
        txtPassword.setPosition(new cc.Point(size.width / 2, (size.height / 2) - 10));
        this.addChild(txtPassword);

        var btnLogin = new ccui.Button(Resources.ui.button.green, Resources.ui.button.red);
        btnLogin.setTitleText("Login");
        btnLogin.setTitleColor(cc.color.BLACK);
        btnLogin.setTitleFontSize(25);
        btnLogin.getTitleRenderer().setLocalZOrder(1);
        btnLogin.setPosition(new cc.Point(size.width / 2, (size.height / 2) - 60));
        this.addChild(btnLogin);

        var that = this;
        btnLogin.addTouchEventListener(function (sender, type) {
            switch (type) {
                case ccui.Widget.TOUCH_ENDED:
                    that.sendMessage(new IdentificationRequest(txtUserName.getString(), txtPassword.getString()));
                    break;
            }
        }, this);

        return true;
    },
    onIncommingMessage: function (message) {
    },
    onOutgoingMessage: function (message) {
    }
});

var LoginScene = cc.Scene.extend({
    onEnter: function () {
        this._super();
        var layer = new LoginLayer();
        this.addChild(layer);
    }
});