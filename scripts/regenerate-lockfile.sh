#!/bin/bash
cd "$(dirname "$0")/.."
npm install --package-lock-only
echo "Lock file regenerated successfully"
