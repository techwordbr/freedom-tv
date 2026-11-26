#!/bin/sh
set -eu
[ "$(id -u)" = 0 ] || exit 41

APP_ID="com.twbstudio.tvthemes"
APP_DIR="/media/developer/apps/usr/palm/applications/$APP_ID"
[ -f "$APP_DIR/appinfo.json" ] || exit 42

mkdir -p /var/lib/tvstudio /var/lib/webosbrew/init.d /var/luna/preferences/devmode_enabled
rm -f /var/lib/tvstudio/root-home-disabled
echo "enabled" > /var/lib/tvstudio/root-home-enabled
for component in home-guard.js restore-home-root.sh; do
 source_file="$(dirname "$0")/$component"
 [ -f "$source_file" ] || exit 44
 if [ "$source_file" != "/var/lib/tvstudio/$component" ]; then cp "$source_file" "/var/lib/tvstudio/$component"; fi
done
PROFILE_SOURCE="$(dirname "$0")/home-profile.js"
if [ -f "$PROFILE_SOURCE" ] && [ "$PROFILE_SOURCE" != /var/lib/tvstudio/home-profile.js ]; then cp "$PROFILE_SOURCE" /var/lib/tvstudio/home-profile.js; fi

if [ -x /media/developer/apps/usr/palm/services/org.webosbrew.hbchannel.service/elevate-service ]; then
  /media/developer/apps/usr/palm/services/org.webosbrew.hbchannel.service/elevate-service com.twbstudio.tvthemes.icons >/dev/null 2>&1 || true
fi

cat << 'EOF' > /var/lib/webosbrew/init.d/90-tvstudio-home
#!/bin/sh
APP_ID="com.twbstudio.tvthemes"
APP_DIR="/media/developer/apps/usr/palm/applications/$APP_ID"
STATE_FILE="/var/lib/tvstudio/root-home-enabled"
if [ ! -f /var/lib/tvstudio/home-guard.js ]; then
 /bin/sh /var/lib/tvstudio/restore-home-root.sh
 exit 44
fi
if [ -f /tmp/tvstudio-home-guard.pid ]; then kill "$(cat /tmp/tvstudio-home-guard.pid)" 2>/dev/null || true; fi
/usr/bin/node /var/lib/tvstudio/home-guard.js >> /tmp/tvstudio-home-guard.log 2>&1 &
echo $! > /tmp/tvstudio-home-guard.pid
if [ -f /var/lib/tvstudio/home-profile.js ]; then
  /usr/bin/node /var/lib/tvstudio/home-profile.js >> /tmp/tvstudio-home-profile.log 2>&1 || exit 43
fi

if [ ! -f "$APP_DIR/appinfo.json" ] || [ ! -f "$STATE_FILE" ]; then
  luna-send -n 1 luna://com.webos.applicationManager/setDefaultApp '{"category":"home","appId":"com.webos.app.home"}' >/dev/null 2>&1 || true
  luna-send -n 1 luna://com.webos.service.applicationmanager/setDefaultApp '{"category":"home","appId":"com.webos.app.home"}' >/dev/null 2>&1 || true
  exit 0
fi

if [ -x /media/developer/apps/usr/palm/services/org.webosbrew.hbchannel.service/elevate-service ]; then
  /media/developer/apps/usr/palm/services/org.webosbrew.hbchannel.service/elevate-service com.twbstudio.tvthemes.icons >/dev/null 2>&1 || true
fi

luna-send -n 1 luna://com.webos.applicationManager/setDefaultApp '{"category":"home","appId":"com.twbstudio.tvthemes"}' >/dev/null 2>&1 || true
luna-send -n 1 luna://com.webos.service.applicationmanager/setDefaultApp '{"category":"home","appId":"com.webos.app.home"}' >/dev/null 2>&1 || true
luna-send -n 1 luna://com.webos.service.applicationmanager/setDefaultApp '{"category":"home","appId":"com.twbstudio.tvthemes"}' >/dev/null 2>&1 || true

luna-send -n 1 luna://com.webos.applicationManager/launch '{"id":"com.twbstudio.tvthemes"}' >/dev/null 2>&1 || true
luna-send -n 1 luna://com.webos.applicationManager/closeByAppId '{"id":"com.webos.app.home"}' >/dev/null 2>&1 || true

if [ -f /tmp/tvstudio-home-power.pid ]; then
  kill $(cat /tmp/tvstudio-home-power.pid) 2>/dev/null || true
fi
if [ -f /tmp/tvstudio-home-fg.pid ]; then
  kill $(cat /tmp/tvstudio-home-fg.pid) 2>/dev/null || true
fi

(
  last_state=""
  luna-send -i luna://com.webos.service.tvpower/power/getPowerState '{"subscribe":true}' 2>/dev/null | while read -r line; do
    [ -f "$STATE_FILE" ] || break
    case "$line" in
      *'"state":"Active"'*)
        case "$line" in
          *'"processing":'*) ;;
          *)
            if [ "$last_state" != "Active" ]; then
              last_state="Active"
              luna-send -n 1 luna://com.webos.applicationManager/launch '{"id":"com.twbstudio.tvthemes"}' >/dev/null 2>&1 &
              luna-send -n 1 luna://com.webos.applicationManager/closeByAppId '{"id":"com.webos.app.home"}' >/dev/null 2>&1 &
            fi
          ;;
        esac
      ;;
      *'"state":'*)
        last_state="Other"
      ;;
    esac
  done
) >/dev/null 2>&1 &
echo $! > /tmp/tvstudio-home-power.pid

(
  luna-send -i luna://com.webos.applicationManager/getForegroundAppInfo '{"subscribe":true}' 2>/dev/null | while read -r line; do
    [ -f "$STATE_FILE" ] || break
    case "$line" in
      *'"appId":"com.webos.app.home"'*)
        luna-send -n 1 luna://com.webos.applicationManager/launch '{"id":"com.twbstudio.tvthemes"}' >/dev/null 2>&1 &
        luna-send -n 1 luna://com.webos.applicationManager/closeByAppId '{"id":"com.webos.app.home"}' >/dev/null 2>&1 &
      ;;
    esac
  done
) >/dev/null 2>&1 &
echo $! > /tmp/tvstudio-home-fg.pid
EOF

/usr/bin/node "$(dirname "$0")/tune-home-boot.js"
chmod 755 /var/lib/webosbrew/init.d/90-tvstudio-home
/var/lib/webosbrew/init.d/90-tvstudio-home

