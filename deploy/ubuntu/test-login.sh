#!/usr/bin/env bash
set -euo pipefail
curl -sS -X POST http://127.0.0.1:4000/api/auth/check-phone \
  -H 'Content-Type: application/json' \
  -d '{"phone":"09301905219"}'
echo
curl -sS -X POST http://127.0.0.1:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"09301905219","password":"09301905219"}'
echo
curl -sS -X POST http://127.0.0.1:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"09379579269","password":"09379579269"}'
echo
