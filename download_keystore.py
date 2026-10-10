import pexpect
import sys

def main():
    try:
        import os
        with open("run_eas.sh", "w") as f:
            f.write(r"""#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
export EXPO_TOKEN="hcyYbnxx2Yay7-QqB3_HhU3gFd6Hrkc1NybPfyWr"
eas credentials -p android
""")
        os.chmod("run_eas.sh", 0o755)
        child = pexpect.spawn('./run_eas.sh', encoding='utf-8')
        child.logfile = sys.stdout

        # 1. Select build profile
        child.expect('Which build profile do you want to configure', timeout=30)
        # Select "production" (usually first option)
        child.sendline('\x1b[B\x1b[B\r')

        # 2. Select an action
        child.expect('Select an action', timeout=15)
        # The options are usually: 
        # - Application identifier
        # - Android Keystore (down 1)
        # - Push Notifications...
        # Wait, let's just send 'down' until it hits Android Keystore?
        # Actually it's better to type "Keystore" to filter the list!
        child.send('Keystore')
        child.sendline('\r')

        # 3. Select a keystore action
        child.expect('Select an action', timeout=15)
        # The options: Set up, Remove, Download
        # Filter for Download
        child.send('Download')
        child.sendline('\r')

        child.expect('Saved keystore to', timeout=15)
        print("Success! Keystore downloaded.")
        child.close()
    except Exception as e:
        print("Error:", e)
        if 'child' in locals():
            print(child.before)

if __name__ == '__main__':
    main()
