#!/bin/sh

node . web serve \
  --source-dir etc/albums/1-source-files \
  --scratch-dir etc/albums/2-fixed-tag-files \
  --dest-dir etc/albums/3-organized-files
