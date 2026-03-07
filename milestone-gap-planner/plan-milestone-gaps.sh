#!/usr/bin/env bash
set -euo pipefail

# Find latest audit
audit=$(ls -t .planning/*-MILESTONE-AUDIT.md 2>/dev/null | head -n1 || true)
if [ -z "$audit" ]; then echo "No audit file"; exit 1; fi

echo "Using $audit"

# Get gaps lines starting with "- "
mapfile -t gaps < <(grep '^- ' "$audit" | sed 's/^- //')
if [ ${#gaps[@]} -eq 0 ]; then echo "No gaps"; exit 0; fi

declare -A phases
for line in "${gaps[@]}"; do
  if [[ "$line" =~ ^([^:]+):[[:space:]]*(.*) ]]; then
    pname="${BASH_REMATCH[1]}"
    desc="${BASH_REMATCH[2]}"
  else
    pname="General"
    desc="$line"
  fi
  phases["$pname"]+=$'  - '"$desc"$'\n'
done

summary=""
for p in "${!phases[@]}"; do
  summary+=$'\n## Phase: '"$p"$'\n'${phases[$p]}
done

echo -e "\n--- Proposed Phases ---"
echo -e "$summary"

read -p "Apply to ROADMAP.md? (y/n) " ans
if [[ "$ans" =~ ^[Yy] ]]; then
  roadmap=ROADMAP.md
  [ -f "$roadmap" ] || echo "# ROADMAP" > "$roadmap"
  echo -e "\n# Generated from $audit" >> "$roadmap"
  echo -e "$summary" >> "$roadmap"
  echo "Updated"
else
  echo "Cancelled"
fi
