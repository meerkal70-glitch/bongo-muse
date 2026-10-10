#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
export EXPO_TOKEN="RdDHWc9Rzcn28m031PfvF3uhBmOx-J1lLgaTr8Hb"
eas credentials -p android
