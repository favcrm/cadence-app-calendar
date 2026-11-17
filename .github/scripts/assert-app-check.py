#!/usr/bin/env python3
"""Accept a native app-check report only when it passed.

Calendar stores nothing and declares no `app-storage`, so there is no
hosted-only refusal to tolerate: the report must say `ok: true`. Any refusal is
a failed check; a report still carries a digest and an inventory when it
refuses, but those are metadata, not installability or safety.

Usage: assert-app-check.py [report.json]
"""
import json
import sys

path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/app-check.json"
try:
    report = json.load(open(path, encoding="utf-8"))
except (OSError, ValueError) as error:
    print(f"app check report is unreadable: {error}", file=sys.stderr)
    sys.exit(1)
if not isinstance(report, dict):
    print("app check report is not an object", file=sys.stderr)
    sys.exit(1)
if report.get("ok") is True:
    print("app check passed")
    sys.exit(0)
refusal = ((report.get("refusal") or {}).get("message")) or ""
print("app check refused: " + (refusal or repr(report)), file=sys.stderr)
sys.exit(1)
