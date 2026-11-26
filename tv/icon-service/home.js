var WebSocket = require('./ws');
var https = require('https');
var fs = require('fs');
var url = require('url');
var os = require('os');
var path = require('path');
module.exports = function(home) {
  var items = {}, images = {}, waiting = null, timestamp = 0, key = '';
  var keyPath = require('./pairing-store')('tvstudio-icons-client-key');
  try { key = fs.readFileSync(keyPath, 'utf8'); } catch (_) {}
  function catalog(callback) {
    if (Date.now()-timestamp < 60000) return callback(null, Object.keys(items).map(function(id){return items[id].app;}));
    if (waiting) {waiting.push(callback); return;}
    waiting = [callback];
    var socket = new WebSocket('wss://'+home+':3001',{rejectUnauthorized:false,handshakeTimeout:5000});
    var done = false;
    function finish(err) {
      if(done) return;
      done=true; clearTimeout(timer); socket.terminate();
      var pending=waiting;waiting=null;
      pending.forEach(function(cb){cb(err,Object.keys(items).map(function(id){return items[id].app;}));});
    }
    var timer=setTimeout(function(){finish(new Error('Aceite a conexão do TV Studio na LG.'));},45000);
    socket.on('error',finish);
    socket.on('close',function(){finish(new Error('Conexão encerrada pela TV.'));});
    socket.on('open',function(){
      var payload={pairingType:'PROMPT',manifest:{manifestVersion:1,appVersion:'1.0',permissions:['READ_INSTALLED_APPS']}};
      if(key)payload['client-key']=key;
      socket.send(JSON.stringify({type:'register',id:'pair',payload:payload}));
    });
    socket.on('message',function(raw){
      try {
        var m=JSON.parse(raw);
        if(m.type==='registered'){
          key=m.payload['client-key']||'';
          if(key)try{fs.writeFileSync(keyPath,key,{mode:384});}catch(_){}
          socket.send(JSON.stringify({id:'icons',type:'request',uri:'ssap://com.webos.applicationManager/listLaunchPoints'}));
        }else if(m.type==='error'){finish(new Error(m.error));}
        else if(m.id==='icons' && Array.isArray(m.payload.launchPoints)){
          var next=Object.create(null);
          m.payload.launchPoints.forEach(function(p){
            if(!p.id||!p.title||p.visible===false||p.id==='com.twbstudio.tvthemes')return;
            next[p.id]={app:{id:p.id,nome:p.title,cor:/^#[0-9a-f]{6}$/i.test(p.iconColor)?p.iconColor:'#284657',icones:[]},urls:[p.largeIcon,p.icon].filter(Boolean)};
          });
          items=next;images={};timestamp=Date.now();finish(null);
        }
      }catch(e){finish(e);}
    });
  }
  function icon(id,callback){
    if(images[id])return callback(null,images[id]);
    var urls=items[id]?items[id].urls.slice():[];
    function attempt(){
      if(!urls.length)return callback(new Error('Imagem indisponível'));
      var uri=url.parse(urls.shift());
      if(!/^\/resources\//.test(uri.pathname||''))return attempt();
      var req=https.get({hostname:home,port:3001,path:uri.path,rejectUnauthorized:false},function(res){
        if(res.statusCode!==200){res.resume();return attempt();}
        var chunks=[],size=0;
        res.on('error',callback);
        res.on('data',function(chunk){size+=chunk.length;if(size<=300000)chunks.push(chunk);});
        res.on('end',function(){
          var b=Buffer.concat(chunks);
          if(size>300000||b.slice(0,8).toString('hex')!=='89504e470d0a1a0a')return attempt();
          images[id]='data:image/png;base64,'+b.toString('base64');callback(null,images[id]);
        });
      });
      req.setTimeout(5000,function(){req.destroy(new Error('Tempo esgotado'));});
      req.on('error',attempt);
    }
    attempt();
  }
  return {catalog:catalog,icon:icon};
};
