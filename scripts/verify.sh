#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .artifacts
# Same command in local development, independent verifier, and CI.
# The log is evidence, not a verdict; only the verifier authors verification.json.
exec > >(tee .artifacts/last-verify.log) 2>&1
node -e 'if (Number(process.versions.node.split(".")[0]) !== 24) { console.error("Node.js 24가 필요합니다. 현재 실행 버전: " + process.version); process.exit(1); }'
python3 -m unittest discover -s scripts -p 'test_*.py' -v
npm run lint
npm run typecheck
npm run build
npm test
