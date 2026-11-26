#!/bin/sh
# Freedom TV wrapper for SlopBro (AGPL-3.0-or-later).
set -eu
[ "$(id -u)" = 0 ] || exit 41
umask 077
base=/var/lib/tvstudio/recovery
mkdir -p "$base"
snapshot="$base/pre-root-$(date +%Y%m%d-%H%M%S)"
mkdir "$snapshot"
id > "$snapshot/identity.txt"
for item in /etc/palm/bootd.json /var/luna/preferences/devmode_enabled; do
 if [ -f "$item" ]; then cp -p "$item" "$snapshot/$(basename "$item")"; fi
done
printf '%s\n' 'Configuration snapshot only. Does not restore firmware or undo root.' > "$snapshot/README.txt"
sh "$(dirname "$0")/install-root.sh"
if [ -x /media/developer/apps/usr/palm/services/org.webosbrew.hbchannel.service/elevate-service ]; then
 /media/developer/apps/usr/palm/services/org.webosbrew.hbchannel.service/elevate-service com.twbstudio.tvthemes.icons >/dev/null 2>&1 || true
fi
