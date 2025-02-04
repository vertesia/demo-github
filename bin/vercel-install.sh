#!/bin/bash

echo "[install] the current directory is \"$(pwd)\""
npm -g i @vertesia/cli
vertesia --version
pnpm vertesia:connect
pnpm install
echo '[install] custom install command completed.'
