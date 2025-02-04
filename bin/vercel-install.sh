#!/bin/bash

echo "[install] the current directory is \"$(pwd)\""
npm -g i @vertesia/cli
vertesia --version
pnpm vertesia:connect

# note: we have to go into the app directory to install the dependencies because the
# "vertesia agent connect" command only updates the ".npmrc" file of the agent.
cd apps/github-agent || exit

pnpm install
echo '[install] custom install command completed.'
