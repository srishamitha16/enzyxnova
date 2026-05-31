#!/bin/bash
# EnzyXNova Icon Generator for Electron
# Creates basic placeholder icons for Windows executable

# This would need ImageMagick or similar
# For now, we'll skip if icons don't exist

echo "Creating icon assets directory..."
mkdir -p assets

# Create a simple PNG icon (placeholder) using ImageMagick if available
if command -v convert &> /dev/null; then
    echo "Creating application icon..."
    convert -size 256x256 xc:white \
            -fill "#14b8a6" -draw "circle 128,128 10,128" \
            assets/icon.png
    echo "Icon created: assets/icon.png"
else
    echo "Note: ImageMagick not found. Using placeholder icon."
    echo "For production, replace assets/icon.png with your application icon (256x256 PNG)"
fi

echo "Icon setup complete!"
