#!/bin/bash

version=$(cat VERSION)
git tag v$version -m "Release v$version"
git push --tags
