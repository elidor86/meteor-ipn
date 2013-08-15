Package.describe({
  summary: "handle paypal ipn massages"
});

Npm.depends({
  'connect': '2.7.10'
});


Package.on_use(function (api, where) {
   api.use('webapp', 'server');
 api.export('PaypalIpn');
 api.add_files('ipn.js', 'server');


});