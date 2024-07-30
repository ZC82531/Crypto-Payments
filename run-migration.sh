#!/bin/bash
set -e

# Load .env if present
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set in .env"
  exit 1
fi

supabase db push --db-url "$DATABASE_URL"
