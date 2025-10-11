#!/bin/bash

version=$(cat VERSION)
git tag v$version
git push --tags
