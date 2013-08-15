var connectHandlers, connect;

var https = Npm.require('https');
var qs = Npm.require('querystring');

if (typeof(Npm) == "undefined") {
    connect = __meteor_bootstrap__.require("connect");
} else {
    connect = Npm.require("connect");
}

if (typeof __meteor_bootstrap__.app !== 'undefined') {
    connectHandlers = __meteor_bootstrap__.app;
} else {
    connectHandlers = WebApp.connectHandlers;
}


var PaypalIpn = function () {


    this._config = {
        test_ipn:true,
        onSuccess:null,
        onError:null,
        SANDBOX_URL:'www.sandbox.paypal.com',
        REGULAR_URL:'www.paypal.com',
        _started:false
    };


    this._started = false;
};


PaypalIpn.prototype.configure = function (config) {


    this._config.test_ipn = config.test_ipn;
    this._config.onSuccess = config.onSuccess;

    this._start();

};

PaypalIpn.prototype.verify = function (params, callback) {

    var self = this;
    if (typeof params === "undefined") {
        return callback(true, 'No params were passed to ipn.verify');
    }

    params.body = params.body + '&cmd=_notify-validate';

    var body = params;

    //Set up the request to paypal
    var req_options = {
        host:(self._config.test_ipn) ? self._config.SANDBOX_URL : self._config.REGULAR_URL,
        method:'POST',
        path:'/cgi-bin/webscr',
        headers:{'Content-Length':body.length}
    }


    var req = https.request(req_options, function (res) {
        res.on('data', function paypal_response(d) {
            var response = d.toString();

            //Check if IPN is valid
            callback(response != 'VERIFIED', response);
        });
    });

    //Add the post parameters to the request body
    req.write(body);

    req.end();

    //Request error
    req.on('error', function request_error(e) {
        callback(true, e);
    });
};


PaypalIpn.prototype._start = function () {
    var self = this;

    if (this._started) {
        throw new Error("PaypalIpn has already been started");
    }

    this._started = true;

    connectHandlers
        .use(connect.query())// <- XXX: we can probably assume accounts did this

        .use(function (req, res, next) {
            // need to wrap in a fiber in case they do something async
            // (e.g. in the database)
            if (typeof(Fiber) == "undefined") Fiber = Npm.require('fibers');

            Fiber(function () {
                var path = req._parsedUrl;
//

                if (path.pathname == "/ipn") {
                    //


                    var buf = '';
                    req.setEncoding('utf8');
                    req.on('data', function (chunk) {
                        buf += chunk
                    });
                    req.on('end', function () {

                        console.log("buf", buf);

                        res.writeHead(200, {
                            'Content-Type':'text/plain'
                        });

                        res.end();

                        self.verify(buf, function callback(err, msg) {


                            console.log("msg", msg);

                            if (!err) {
                                self._config.onSuccess(buf);
                            }

                        });

                    });


                }


                else {
                    //console.log("angularLoader next!!");
                    next();
                }

            }).run();
        });

};

Meteor.PaypalIpn = new PaypalIpn();

