#!/bin/bash

# Remove old component files
rm -f ./input.ts ./Input.tsx ./input.tsx
rm -f ./label.ts ./Label.tsx ./label.tsx
rm -f ./components.ts

# Keep only the new folder structure
echo "Old component files removed. Keeping only:"
echo "- input/index.tsx"
echo "- label/index.tsx"
echo "- index.ts"