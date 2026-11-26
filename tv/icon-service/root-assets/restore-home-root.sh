#!/bin/sh
set -eu
[ "$(id -u)" = 0 ] || exit 41

mkdir -p /var/lib/tvstudio
echo "disabled" > /var/lib/tvstudio/root-home-disabled
rm -f /var/lib/tvstudio/root-home-enabled
if [ -f /var/lib/tvstudio/home-profile.js ]; then
  /usr/bin/node /var/lib/tvstudio/home-profile.js restore
fi

rm -f /var/lib/tvstudio/root-home-enabled /var/lib/webosbrew/init.d/90-tvstudio-home

if [ -f /tmp/tvstudio-home-power.pid ]; then
  kill $(cat /tmp/tvstudio-home-power.pid) 2>/dev/null || true
  rm -f /tmp/tvstudio-home-power.pid
fi
if [ -f /tmp/tvstudio-home-fg.pid ]; then
  kill $(cat /tmp/tvstudio-home-fg.pid) 2>/dev/null || true
  rm -f /tmp/tvstudio-home-fg.pid
fi

luna-send -n 1 luna://com.webos.applicationManager/setDefaultApp '{"category":"home","appId":"com.webos.app.home"}' >/dev/null 2>&1 || true
luna-send -n 1 luna://com.webos.service.applicationmanager/setDefaultApp '{"category":"home","appId":"com.webos.app.home"}' >/dev/null 2>&1 || true
luna-send -n 1 luna://com.webos.applicationManager/launch '{"id":"com.webos.app.home"}' >/dev/null 2>&1 || true
