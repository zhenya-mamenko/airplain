#!/bin/bash

version=$(cat VERSION)
npm --no-git-tag-version version $version
node -e "const data=require('./app.json'); data.expo.version='${version}'; require('fs').writeFileSync('./app.json', JSON.stringify(data, null, 2))"
git add package.json package-lock.json app.json
