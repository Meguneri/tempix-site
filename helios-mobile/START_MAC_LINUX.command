#!/bin/sh
cd "$(dirname "$0")" || exit 1
python3 server.py
printf "\nPress Enter to close. "
read answer
