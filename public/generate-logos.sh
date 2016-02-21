#!/usr/bin/env bash

readonly PROGDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

convert -trim -bordercolor '#e2001a' -border 200x20 $PROGDIR/img/forever-gym-reservations.png $PROGDIR/img/logo-wide.png
convert -trim $PROGDIR/img/forever-gym-reservations.png $PROGDIR/img/logo.png

