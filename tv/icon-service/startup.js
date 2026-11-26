'use strict';
// No elevation: this attempt uses only permissions granted to this service.
module.exports=function(service){
 var busy=false;
 function call(uri,payload,cb){var done=false,t=setTimeout(function(){finish({returnValue:false,errorText:'A TV não respondeu.'});},8000);function finish(r){if(done)return;done=true;clearTimeout(t);cb(r||{});}try{service.call(uri,payload,function(m){finish(m.payload);});}catch(e){finish({returnValue:false,errorText:e.message});}}
 service.register('startupNoRoot',function(msg){
  if(msg.payload.enabled!==false)return msg.respond({returnValue:false,errorText:'Abertura automática suspensa nesta versão de recuperação. O menu original da LG será preservado.'});
  if(busy)return msg.respond({returnValue:false,errorText:'Aguarde a tentativa atual.'});
  busy=true;
  var id=msg.payload.enabled===false?'com.webos.app.home':'com.twbstudio.tvthemes';
  call('luna://com.webos.applicationManager/setDefaultApp',{category:'home',appId:id},function(r){
   if(r.returnValue!==true){busy=false;return msg.respond({returnValue:false,unsupported:true,errorText:'A TV não permitiu definir a tela inicial sem root. O retorno pelo Home pode continuar ativo durante a sessão.'});}
   call('luna://com.webos.service.settings/getSystemSettings',{category:'general',keys:['defaultApps','homeAutoLaunch']},function(check){
    busy=false;
    var settings=check.settings||{},confirmed=check.returnValue===true&&settings.defaultApps&&settings.defaultApps.home===id;
    msg.respond({returnValue:!!confirmed,bootVerified:false,message:confirmed?(id==='com.webos.app.home'?'Seleção sem root restaurada para LG.':'A TV aceitou o tema como Home. Desligue e ligue para testar. A abertura ao ligar ainda não foi confirmada; depende da configuração de inicialização da LG.'):'A solicitação foi enviada, mas a TV não permitiu confirmar a configuração. A abertura ao ligar não está confirmada.'});
   });
  });
 });
};
