
// Heartbeat to the service: every 4 s on screen and, hidden (preloaded behind another app), every 15 s — the TV can
// kill the service to free memory, and a call starts it again, so the Home watcher and the preload come back.
(function(){var last=0;function beat(){var now=Date.now();if(document.hidden&&now-last<15000)return;last=now;var B=window.webOSServiceBridge||window.PalmServiceBridge;if(!B)return;try{var b=new B();window.freedomHealth=b;b.onservicecallback=function(){};b.call('luna://com.twbstudio.tvthemes.icons/homeHeartbeat',JSON.stringify({hidden:document.hidden}));}catch(e){}}window.addEventListener('load',function(){beat();setInterval(beat,4000);});})();
