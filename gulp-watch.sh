#!/usr/bin/env bash

gulp watch
while [ $? -eq 1 ]; do
  echo "ERRORS... restarting"
  sleep 0.5
  gulp watch
done
