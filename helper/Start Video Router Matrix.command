#!/bin/bash
set -eu
cd "$(dirname "$0")"
if [ ! -x "runtime/node" ]; then
  printf '%s\n' 'Please extract the entire Mac ZIP before starting Video Router Matrix.' 'The bundled runtime or its executable permission is missing.'
  read -r -p 'Press Return to close. ' _reply
  exit 1
fi
exec "$PWD/runtime/node" "$PWD/helper/main.js" --open "$@"
