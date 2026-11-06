#!/bin/zsh
# Opens the prebuilt PULSE app in your browser on http://localhost:8899
d="$HOME/Desktop/To do"
(python3 -m http.server 8899 -d "$d/dist" > /tmp/pulse-server.log 2>&1 & echo "server pid: $!" > /tmp/pulse-server.pid)
sleep 1
open "http://localhost:8899"
echo "PULSE is running on http://localhost:8899"
echo "Re-run Start Pulse.command to launch again, or kill the pid in /tmp/pulse-server.pid to stop it."
