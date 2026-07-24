#!/bin/zsh
set -e

script_dir="${0:A:h}"
node "$script_dir/uninstall.mjs"
read -k 1 "?Press any key to close."
