#!/usr/bin/env bash

set -euo pipefail

if ! command -v mkcert >/dev/null 2>&1; then
  echo "mkcert is required. On macOS, install it with: brew install mkcert" >&2
  exit 1
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cert_dir="$repo_root/.cert"

mkdir -p "$cert_dir"
mkcert -install
mkcert \
  -key-file "$cert_dir/localhost-key.pem" \
  -cert-file "$cert_dir/localhost.pem" \
  localhost 127.0.0.1 ::1

echo "Trusted local HTTPS certificate created in $cert_dir"
