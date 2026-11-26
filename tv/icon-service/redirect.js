// Home without root (Augusto, 25/11): when LG's own Home comes to the front (Home button, or the TV turning on),
// the chosen theme is opened at once and LG's Home is closed — the same thing the root boot script does, but through
// the TV's remote-control channel (SSAP), which needs no root. LG's Home can show for an instant before the theme.
// It starts by itself whenever the theme is on screen (homeHeartbeat) and, where the TV allows it, after a full
// power-up (a persistent activity). With root Home active, the root script does the job and this stays quiet.
var WebSocket = require('./ws');
var fs = require('fs');
var keyFile = require('./pairing-store')('tvstudio-home-pair');
var flagFile = require('./pairing-store')('tvstudio-home-redirect');   // 'off' = the person chose LG's own menu
var THEME = 'com.twbstudio.tvthemes', LG_HOME = 'com.webos.app.home';
var socket = null, active = false, keepAlive = null, retry = null, lastLaunch = 0, waiting = [], frontApp = '', relaunchTimer = null;
function enabled() { try { return fs.readFileSync(flagFile, 'utf8').trim() !== 'off'; } catch (_) { return true; } }
// Root state: this service runs in the developer jail, which hides /var/lib/webosbrew, so it asks the Homebrew
// Channel (root) instead and keeps the answer: root.available (Homebrew answers) and root.home (root Home on).
var root = { available: false, home: false, at: 0 };
function rootHome() { return root.home || fs.existsSync('/var/lib/webosbrew/init.d/90-tvstudio-home'); }   // root Home on: its boot script does the job
function note(text) { try { fs.appendFileSync('/tmp/tvstudio-redirect.log', new Date().toISOString() + ' ' + text + '\n'); } catch (_) {} }
module.exports = function (service) {
  function release() { if (!keepAlive) return; var a = keepAlive; keepAlive = null; service.activityManager.complete(a, function () {}); }
  function hold() {
    if (keepAlive) return;
    service.activityManager.create('tvstudio-home-monitor', function (activity) { if (activity) { if (active) keepAlive = activity; else service.activityManager.complete(activity, function () {}); } });
  }
  function answer(ok, text) { var w = waiting; waiting = []; w.forEach(function (cb) { cb(ok, text); }); }
  function stop() {
    active = false; clearTimeout(retry); retry = null; release();
    if (socket) { var s = socket; socket = null; try { s.terminate(); } catch (_) {} }
  }
  function start(cb) {
    if (cb) waiting.push(cb);
    if (!enabled()) return answer(false, 'Você escolheu o menu original da LG.');
    if (rootHome()) return answer(true, 'O Home já abre o tema pelo modo root.');
    if (active) return answer(true, 'Retorno pelo Home ativo.');
    if (socket) return;   // connecting
    var ws = socket = new WebSocket('wss://127.0.0.1:3001', { rejectUnauthorized: false, handshakeTimeout: 5000 });
    var pairing = setTimeout(function () { if (!active) { answer(false, 'Aceite na TV o pedido do Freedom TV.'); ws.terminate(); } }, 60000);
    function again() {   // the TV dropped the link (standby, restart of its service): reconnect quietly
      clearTimeout(pairing);
      if (socket === ws) socket = null;
      var was = active; active = false;
      if (!was) { release(); return answer(false, 'Não foi possível falar com a LG.'); }
      if (enabled() && !rootHome()) { clearTimeout(retry); retry = setTimeout(function () { start(); }, 250); /* back fast after standby */ } else release();
    }
    ws.on('error', function (e) { note('erro ' + e.message); });
    ws.on('close', again);
    ws.on('open', function () {
      var payload = { pairingType: 'PROMPT', manifest: { manifestVersion: 1, appVersion: '1.0', permissions: ['READ_RUNNING_APPS', 'LAUNCH', 'READ_POWER_STATE'] } };
      try { payload['client-key'] = fs.readFileSync(keyFile, 'utf8'); } catch (_) {}
      ws.send(JSON.stringify({ type: 'register', id: 'register', payload: payload }));
    });
    ws.on('message', function (raw) {
      var m; try { m = JSON.parse(raw); } catch (_) { return; }
      var p = m.payload || {};
      if (m.type === 'registered') {
        clearTimeout(pairing);
        if (p['client-key']) try { fs.writeFileSync(keyFile, p['client-key'], { mode: 384 }); } catch (_) {}
        active = true; hold(); note('ativo'); watchFast();
        ws.send(JSON.stringify({ type: 'subscribe', id: 'front', uri: 'ssap://com.webos.applicationManager/getForegroundAppInfo' }));
        // Waking from standby: the TV says 'Prepare Resume' before LG's Home is built — start the theme right then.
        ws.send(JSON.stringify({ type: 'subscribe', id: 'power', uri: 'ssap://com.webos.service.tvpower/power/getPowerState' }));
        answer(true, 'Retorno pelo Home ativo.');
      } else if (m.type === 'error' && m.id === 'register') {
        clearTimeout(pairing); answer(false, m.error || 'A LG recusou.'); ws.terminate();
      }
      if (m.id === 'front' && p.appId !== undefined) frontApp = p.appId;
      if (m.id === 'front' && p.appId !== undefined && p.appId !== LG_HOME) {
        warm(p.appId);   // another app (or nothing) in front: keep the theme loaded, hidden
      }
      if ((m.id === 'front' || m.id === 'now') && (p.appId === LG_HOME || (m.id === 'now' && p.returnValue && !p.appId))) {
        if (!enabled() || rootHome()) return;
        launchNow('ssap frente');   // one launch per Home press (whichever signal comes first)
      } else if (m.id === 'power') {
        if (p.returnValue === false) { note('energia recusada: ' + (p.errorText || '')); return; }
        if (p.processing === 'Prepare Resume' && enabled() && !rootHome()) launchNow('acordando');
      } else if (m.id === 'open' && p.returnValue) {
        ws.send(JSON.stringify({ type: 'request', id: 'close', uri: 'ssap://system.launcher/close', payload: { id: LG_HOME } }));
      }
    });
  }
  // Faster path (Augusto: "tá demorando muito"): listen to the TV's own app events, where it lets a developer
  // service, and react when LG's Home *starts* opening, launching the theme directly (no SSAP round trip).
  var fast = { life: null, front: null, ok: false };
  function launchNow(why) {
    var now = Date.now();
    if (why !== 'acordando') {   // the early wake launch must not block the one when LG's Home shows
      if (now - lastLaunch < 1500) {
        // Back closing the theme (Augusto 26/11): the theme opened, then LG's Home finished loading and came in
        // front again within this window, and was ignored — the TV stayed on LG. Look again once the window is over.
        clearTimeout(relaunchTimer);
        relaunchTimer = setTimeout(function () {
          if (frontApp === LG_HOME && enabled() && !rootHome()) launchNow(why + ' (de novo)');
        }, 1500 - (now - lastLaunch) + 100);
        return;
      }
      lastLaunch = now;
    }
    var t0 = Date.now();
    service.call('luna://com.webos.applicationManager/launch', { id: THEME }, function (m) {
      var p = m.payload || {};
      note(why + ' → launch direto ' + (p.returnValue ? 'ok' : 'recusado') + ' em ' + (Date.now() - t0) + 'ms');
      if (!p.returnValue && socket && active) socket.send(JSON.stringify({ type: 'request', id: 'open', uri: 'ssap://system.launcher/launch', payload: { id: THEME } }));
      else if (p.returnValue) service.call('luna://com.webos.applicationManager/closeByAppId', { id: LG_HOME }, function () {});
    });
  }
  function watchFast() {
    if (fast.life) return;
    // Waking from standby (Quick Start+): open the theme the moment the TV says it is on again.
    var lastPower = 'Active';
    fast.power = service.subscribe('luna://com.webos.service.tvpower/power/getPowerState', { subscribe: true });
    fast.power.on('response', function (m) {
      var p = m.payload || {};
      if (p.returnValue === false) { note('getPowerState recusado: ' + (p.errorText || '')); return; }
      var st = p.state || ''; if (!st) return;
      if (st === 'Active' && !p.processing && lastPower !== 'Active' && enabled() && !rootHome()) launchNow('acordou');
      lastPower = (st === 'Active' && !p.processing) ? 'Active' : st;
    });
    fast.life = service.subscribe('luna://com.webos.applicationManager/getAppLifeEvents', { subscribe: true });
    fast.life.on('response', function (m) {
      var p = m.payload || {};
      if (p.returnValue === false) { if (!fast.ok) note('getAppLifeEvents recusado: ' + (p.errorText || '')); return; }
      fast.ok = true;
      if (p.appId === LG_HOME && /splash|preload|launch|foreground/.test(p.event || '') && enabled() && !rootHome()) launchNow('evento ' + p.event);
    });
    fast.front = service.subscribe('luna://com.webos.applicationManager/getForegroundAppInfo', { subscribe: true });
    fast.front.on('response', function (m) {
      var p = m.payload || {};
      if (p.returnValue === false) { note('getForegroundAppInfo direto recusado: ' + (p.errorText || '')); return; }
      if (p.appId === LG_HOME && enabled() && !rootHome()) launchNow('frente');
    });
  }
  // Keep the theme loaded while another app is in front (Augusto 25/11: "lerdo quando volta pro home"). The TV
  // closes the theme to free memory (YouTube & co.), and opening it cold takes 4–7 s; preloaded and hidden it comes
  // back in ~0.2 s. 'preload: partial' loads it without showing it, and does nothing if it is still loaded.
  var warmTimer = null, warmFirst = true;
  function preload() {
    if (!enabled()) return;   // (also with root Home: the root script opens it, preloaded it opens fast)
    service.call('luna://com.webos.applicationManager/launch', { id: THEME, preload: 'partial' }, function (m) {
      var p = m.payload || {};
      if (warmFirst || !p.returnValue) { warmFirst = false; note('pré-carregar escondido: ' + (p.returnValue ? 'ok' : 'recusado ' + (p.errorText || ''))); }
    });
  }
  function warm(appId) {
    clearTimeout(warmTimer); warmTimer = null;
    if (!appId || appId === THEME || !enabled()) return;   // theme in front, or TV going to standby
    (function tick(delay) { warmTimer = setTimeout(function () { preload(); tick(120000); }, delay); })(12000);
  }
  // After a full power-up the TV restarts nothing of a developer app; this persistent activity asks the TV to call
  // bootKick once it is up, where it lets us. (On a TV that refuses, the Home button still works once the theme opens.)
  var armed = false;
  function armBoot() {
    if (armed) return; armed = true;   // once per service start (it used to be re-armed, and so called, again and again)
    service.call('luna://com.webos.service.activitymanager/create', {
      activity: { name: 'tvstudio-boot-kick', description: 'Freedom TV: abrir o tema ao ligar', type: { foreground: true, persist: true },
        callback: { method: 'luna://com.twbstudio.tvthemes.icons/bootKick', params: {} } },
      start: true, replace: true, subscribe: false
    }, function (m) { note('boot-kick ' + JSON.stringify(m.payload || {}).slice(0, 160)); });
  }
  service.register('bootKick', function (msg) {
    note('bootKick');
    // Open the theme right away only when the TV has just been powered up; otherwise (the activity is also called
    // when it is armed) only if LG's Home or nothing is in front — never over an app the person is using.
    if (enabled() && !rootHome() && require('os').uptime() < 180) launchNow('ligou');
    start(function (ok) {
      if (ok && socket && active && !rootHome()) socket.send(JSON.stringify({ type: 'request', id: 'now', uri: 'ssap://com.webos.applicationManager/getForegroundAppInfo' }));
    });
    msg.respond({ returnValue: true });
  });
  service.register('homeRedirect', function (msg) {
    if (msg.payload.enabled === false) {
      try { fs.writeFileSync(flagFile, 'off'); } catch (_) {}
      stop();
      service.call('luna://com.webos.service.activitymanager/cancel', { activityName: 'tvstudio-boot-kick' }, function () {});
      armed = false;
      return msg.respond({ returnValue: true, message: 'Retorno pelo Home desligado. A TV volta ao menu original da LG.' });
    }
    if (msg.payload.enabled === true) { try { fs.writeFileSync(flagFile, 'on'); } catch (_) {} }
    if (!enabled()) return msg.respond({ returnValue: false, errorText: 'Você escolheu o menu original da LG.' });
    armBoot();
    start(function (ok, text) { msg.respond({ returnValue: ok, message: text, errorText: ok ? undefined : text }); });
  });
  service.register('note', function (msg) { note('tema: ' + String(msg.payload.text || '').slice(0, 200)); msg.respond({ returnValue: true }); });
  function checkRoot(cb) {
    var done = false, t = setTimeout(function () { finish({}); }, 4000);
    function finish(p) {
      if (done) return; done = true; clearTimeout(t);
      var out = String(p.stdoutString || '');
      root.available = p.returnValue === true && out.indexOf('TVS_ROOT') >= 0;
      root.home = root.available && out.indexOf('TVS_HOME_ON') >= 0;
      root.at = Date.now(); if (cb) cb();
    }
    try {
      service.call('luna://org.webosbrew.hbchannel.service/exec',
        { command: 'echo TVS_ROOT; [ -f /var/lib/webosbrew/init.d/90-tvstudio-home ] && echo TVS_HOME_ON; true' },
        function (m) { finish(m.payload || {}); });
    } catch (_) { finish({}); }
  }
  note('serviço iniciou');
  // Whatever started the service (an update, the TV, a call), the Home watcher comes back on by itself — it used to
  // wait for the theme to be on screen, so after an update LG's Home stayed (Augusto 26/11).
  checkRoot(function () { if (enabled() && !rootHome() && !active && !socket) { armBoot(); start(); } });
  setInterval(checkRoot, 10000);   // keeps the watcher quiet while root Home is on
  service.register('homeRedirectStatus', function (msg) {
    checkRoot(function () { msg.respond({ returnValue: true, enabled: enabled(), active: active, rootHome: rootHome(), rootAvailable: root.available }); });
  });
  return { ensure: function () { if (enabled() && !rootHome() && !active && !socket) { armBoot(); start(); } } };
};
