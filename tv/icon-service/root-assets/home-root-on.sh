#!/bin/sh
# Turns root Home on (theme on the Home button and at power-on, LG's menu asleep), then applies the
# boot de-duplication fix and restarts the boot script once so the running watchers are the fixed ones.
# Turned off again by restore-home-root.sh ("Desativar modo root" in the theme's setup page).
set -eu
[ "$(id -u)" = 0 ] || exit 41
D="$(cd "$(dirname "$0")" && pwd)"
/bin/sh "$D/apply-home-root.sh"
/usr/bin/node "$D/tune-home-boot.js" >/dev/null 2>&1 || true
/bin/sh /var/lib/webosbrew/init.d/90-tvstudio-home >/dev/null 2>&1 || true
echo TVSTUDIO_ROOT_HOME_ON
