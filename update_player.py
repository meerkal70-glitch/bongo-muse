import sys

path = "/Users/apple/.gemini/antigravity-ide/scratch/bongomus/app/player.tsx"
with open(path, "r") as f:
    content = f.read()

import_statement = "import { SyncedLyricsView } from '../components/SyncedLyricsView';\nimport { useSafeAreaInsets } from 'react-native-safe-area-context';\n"
content = content.replace("import { useSafeAreaInsets } from 'react-native-safe-area-context';", import_statement)

# Remove LyricLine
start = content.find("const LyricLine = ")
end = content.find("const SyncedLyricsView = ", start)
if start != -1 and end != -1:
    content = content[:start] + content[end:]

# Remove SyncedLyricsView
start2 = content.find("const SyncedLyricsView = ")
end2 = content.find("const { width } = Dimensions.get('window');", start2)
if start2 != -1 and end2 != -1:
    content = content[:start2] + content[end2:]

with open(path, "w") as f:
    f.write(content)
print("Done")
