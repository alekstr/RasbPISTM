#!/bin/bash
cmd=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

python ${cmd}/scripts/resetButtonPin.py > /dev/null 2>&1
