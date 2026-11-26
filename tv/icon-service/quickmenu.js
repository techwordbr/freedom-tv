// Opens LG's floating quick settings (the remote's gear button) by pressing it through the TV's own
// remote-control channel (SSAP pointer socket). webOS 10 has no com.webos.app.quicksettings app to launch.
// The first time, the TV asks once to allow "Freedom TV" to control it; the key is then kept.
var WebSocket = require('./ws');
var fs = require('fs');
var PERMISSIONS = ['LAUNCH', 'CONTROL_INPUT_JOYSTICK', 'CONTROL_MOUSE_AND_KEYBOARD', 'READ_INSTALLED_APPS'];
module.exports = function(service, host) {
  var keyPath = require('./pairing-store')('tvstudio-input-client-key');
  function press(button, callback) {
    var key = '';
    try { key = fs.readFileSync(keyPath, 'utf8'); } catch (_) {}
    var done = false, socket = null, pointer = null;
    function finish(err) {
      if (done) return;
      done = true; clearTimeout(timer);
      setTimeout(function() {
        try { if (pointer) pointer.close(); } catch (_) {}
        try { if (socket) socket.terminate(); } catch (_) {}
      }, 300);
      callback(err);
    }
    var timer = setTimeout(function() { finish(new Error('Aceite o controle do Freedom TV na LG.')); }, 45000);
    socket = new WebSocket('wss://' + host + ':3001', {rejectUnauthorized: false, handshakeTimeout: 5000});
    socket.on('error', finish);
    socket.on('close', function() { finish(new Error('Conexão encerrada pela TV.')); });
    socket.on('open', function() {
      var payload = {pairingType: 'PROMPT', manifest: {manifestVersion: 1, appVersion: '1.0', permissions: PERMISSIONS}};
      if (key) payload['client-key'] = key;
      socket.send(JSON.stringify({type: 'register', id: 'pair', payload: payload}));
    });
    socket.on('message', function(raw) {
      try {
        var m = JSON.parse(raw);
        if (m.type === 'registered') {
          var fresh = m.payload && m.payload['client-key'];
          if (fresh && fresh !== key) try { fs.writeFileSync(keyPath, fresh, {mode: 384}); } catch (_) {}
          socket.send(JSON.stringify({type: 'request', id: 'pointer', uri: 'ssap://com.webos.service.networkinput/getPointerInputSocket'}));
        } else if (m.type === 'error') {
          finish(new Error(m.error || 'A TV recusou'));
        } else if (m.id === 'pointer') {
          var address = m.payload && m.payload.socketPath;
          if (!address) return finish(new Error('Controle indisponível'));
          pointer = new WebSocket(address, {rejectUnauthorized: false, handshakeTimeout: 5000});
          pointer.on('error', finish);
          pointer.on('open', function() { pointer.send('type:button\nname:' + button + '\n\n'); finish(null); });
        }
      } catch (e) { finish(e); }
    });
  }
  service.register('quickMenu', function(msg) {
    press('QMENU', function(err) { msg.respond(err ? {returnValue: false, errorText: err.message} : {returnValue: true}); });
  });
};
