#!/bin/bash
# Check if a filename was provided
if [ -z "$1" ]; then
  echo "Usage: ./run-debug.sh <path-to-pdf>"
  exit 1
fi

# Create directory for output if it doesn't exist
mkdir -p outputs/

# Run the TypeScript debugger with npx tsx
npx tsx debug-processor.mts "$1"

# Check if any images were created
IMAGE_COUNT=$(find outputs/ -maxdepth 1 -name "*.png" | wc -l)
if [ "$IMAGE_COUNT" -gt 0 ]; then
  echo "✅ Success: $IMAGE_COUNT images extracted to $(pwd)/outputs/"
  open outputs/  # This will open the folder on macOS so you can see the images!
else
  echo "❌ No images extracted to outputs/."
fi
