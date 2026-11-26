var Service=require('webos-service');
var service=new Service('com.twbstudio.tvthemes.icons');
var home=require('./home')('127.0.0.1');
service.register('catalog',function(msg){
  home.catalog(function(err,apps){msg.respond(err?{returnValue:false,errorText:err.message}:{returnValue:true,apps:apps});});
});
service.register('getIcon',function(msg){
  home.icon(msg.payload.id,function(err,image){msg.respond(err?{returnValue:false,errorText:err.message}:{returnValue:true,image:image});});
});
var redirect=require('./redirect')(service);
require('./quickmenu')(service,'127.0.0.1');

require('./root-setup')(service,redirect);
