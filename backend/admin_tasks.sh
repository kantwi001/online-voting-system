#!/bin/bash
# Admin automation script for Online Voting System

set -e

case "$1" in
  reset-admin-password)
    if [ -z "$2" ]; then
      echo "Usage: $0 reset-admin-password <newpassword>"
      exit 1
    fi
    NEW_ADMIN_PASSWORD="$2" python3 reset_admin_password.py
    ;;
  migrate-db)
    echo "Running DB migrations (create all tables if missing)"
    python3 -c "from app import db, app; ctx = app.app_context(); ctx.push(); db.create_all(); ctx.pop()"
    ;;
  *)
    echo "Usage: $0 {reset-admin-password <newpassword>|migrate-db}"
    exit 1
    ;;
esac
