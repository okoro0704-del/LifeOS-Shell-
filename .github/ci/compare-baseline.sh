#!/usr/bin/env bash
# Compare a node:test run of the LifeOS API suite against the documented baseline.
#   compare-baseline.sh <suite-log> <known-failures-file> <min-tests>
# Fails on: any failure not in the baseline, a run with fewer than <min-tests> tests
# (crash, missing files), or a run with no summary. Baseline entries that now pass
# are reported so the list can shrink; they do not fail the job.
set -euo pipefail
log="$1"; known="$2"; min_tests="$3"
summary="${GITHUB_STEP_SUMMARY:-/dev/stdout}"

total=$(grep -E '^ℹ tests [0-9]+' "$log" | awk '{print $3}' | tail -1 || true)
passed=$(grep -E '^ℹ pass [0-9]+' "$log" | awk '{print $3}' | tail -1 || true)
failed=$(grep -E '^ℹ fail [0-9]+' "$log" | awk '{print $3}' | tail -1 || true)
if [ -z "$total" ]; then echo "No test summary in $log (suite did not complete)."; exit 1; fi

failing=$(mktemp)
sed -n '/^✖ failing tests/,$p' "$log" | grep -E '^✖ ' | grep -v '^✖ failing tests' \
  | sed -E 's/^✖ //; s/ \([0-9.]+ms\)$//' | sort -u > "$failing"
known_sorted=$(mktemp); grep -v '^\s*$' "$known" | sort -u > "$known_sorted"

new=$(comm -23 "$failing" "$known_sorted")
still=$(comm -12 "$failing" "$known_sorted")
fixed=$(comm -13 "$failing" "$known_sorted")

{
  echo "### LifeOS API suite: $total tests, $passed passed, $failed failed"
  echo "Known baseline failures still failing: $(printf '%s' "$still" | grep -c . || true) of $(wc -l < "$known_sorted")"
  [ -n "$still" ] && printf '%s\n' "$still" | sed 's/^/- /'
  if [ -n "$fixed" ]; then echo "#### Baseline entries now passing (remove them from the list)"; printf '%s\n' "$fixed" | sed 's/^/- /'; fi
  if [ -n "$new" ]; then echo "#### NEW failures (not in the baseline)"; printf '%s\n' "$new" | sed 's/^/- /'; fi
} >> "$summary"

status=0
if [ "$total" -lt "$min_tests" ]; then echo "Only $total tests ran; expected at least $min_tests."; status=1; fi
if [ -n "$new" ]; then echo "New failures:"; printf '%s\n' "$new"; status=1; fi
exit $status
