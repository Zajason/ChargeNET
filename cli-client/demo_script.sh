#!/bin/bash

# =============================================================================
# CONFIGURATION VARIABLES
# =============================================================================
CLI_EXEC="node"
CLI_SCRIPT="se2502.js"

USER_EMAIL="admin@ev.local"
PASS="admin123"
POINTS_FILE="points_test.csv"

# Time Variables
S1="2025-01-01 10:00"
E1="2025-01-01 11:00"
S2="2025-01-01 12:00"
E2="2025-01-01 13:00"

DATE_FROM="20250101"
DATE_TO="20250102"

# Initialize empty ID
POINT_ID=""

# Helper function to pause execution
pause_script() {
  echo ""
  read -p "Press [Enter] to continue to the next step..."
  echo "------------------------------------------------------------------"
  echo ""
}

echo "=================================================================="
echo "STARTING CHARGENET PRESENTATION DEMO (REGEX METHOD)"
echo "=================================================================="

# -----------------------------------------------------------------------------
# STEP 0: LOGIN
# -----------------------------------------------------------------------------
echo "[STEP 0] Logging in as $USER_EMAIL..."
$CLI_EXEC $CLI_SCRIPT login --username "$USER_EMAIL" --passw "$PASS"
pause_script

# -----------------------------------------------------------------------------
# STEP 0.5: ADD PAYMENT METHOD
# -----------------------------------------------------------------------------
echo "[STEP 0.5] Adding a default mock payment method..."
$CLI_EXEC $CLI_SCRIPT addcard
pause_script

# -----------------------------------------------------------------------------
# STEP 1: HEALTHCHECK
# -----------------------------------------------------------------------------
echo "[STEP 1] Healthcheck..."
$CLI_EXEC $CLI_SCRIPT healthcheck
pause_script

# -----------------------------------------------------------------------------
# STEP 2: RESET POINTS
# -----------------------------------------------------------------------------
echo "[STEP 2] Resetting all points..."
$CLI_EXEC $CLI_SCRIPT resetpoints
pause_script

# -----------------------------------------------------------------------------
# STEP 3: ADD POINTS
# -----------------------------------------------------------------------------
echo "[STEP 3] Adding points from $POINTS_FILE..."
$CLI_EXEC $CLI_SCRIPT addpoints --source "$POINTS_FILE"
pause_script

# =============================================================================
# DYNAMIC ID FETCHING (REGEX - ROBUST)
# =============================================================================
echo -e "\033[0;36m[SYSTEM] Fetching a valid Point ID dynamically...\033[0m"

# 1. Capture the raw output
RAW_OUTPUT=$($CLI_EXEC $CLI_SCRIPT points --status available --format json)

# 2. Use grep/sed to find the FIRST occurrence of "pointid": <number>
# This regex looks for "pointid" followed by optional spaces/quotes/colons, then captures digits
POINT_ID=$(echo "$RAW_OUTPUT" | grep -oP '"pointid"\s*:\s*"?\K\d+' | head -n 1)

# Fallback for systems without grep -P (like generic macOS grep)
if [ -z "$POINT_ID" ]; then
    # Try using sed to extract digits after pointID
    POINT_ID=$(echo "$RAW_OUTPUT" | sed -n 's/.*"pointID"[^0-9]*\([0-9]\+\).*/\1/p' | head -n 1)
fi

if [ -n "$POINT_ID" ]; then
    echo -e "\033[0;32m--> Success! We will use Point ID: $POINT_ID\033[0m"
else
    echo "CRITICAL: Could not extract a Point ID. CLI Output might be empty."
    echo "DEBUG RAW OUTPUT START:"
    echo "$RAW_OUTPUT"
    echo "DEBUG RAW OUTPUT END"
    exit 1
fi
echo ""
# =============================================================================

# -----------------------------------------------------------------------------
# STEP 4: HEALTHCHECK
# -----------------------------------------------------------------------------
echo "[STEP 4] Healthcheck: Verifying import..."
$CLI_EXEC $CLI_SCRIPT healthcheck
pause_script

# -----------------------------------------------------------------------------
# STEP 5: STATUS AVAILABLE
# -----------------------------------------------------------------------------
echo "[STEP 5] Viewing points with status 'available'..."
$CLI_EXEC $CLI_SCRIPT points --status available
pause_script

# -----------------------------------------------------------------------------
# STEP 6: STATUS CHARGING
# -----------------------------------------------------------------------------
echo "[STEP 6] Viewing points with status 'charging'..."
$CLI_EXEC $CLI_SCRIPT points --status charging
pause_script

# -----------------------------------------------------------------------------
# STEP 7: STATUS OUT OF ORDER
# -----------------------------------------------------------------------------
echo "[STEP 7] Viewing points with status 'outoforder'..."
$CLI_EXEC $CLI_SCRIPT points --status outoforder
pause_script

# -----------------------------------------------------------------------------
# STEP 8: POINT INFO
# -----------------------------------------------------------------------------
echo "[STEP 8] Details for Point ID: $POINT_ID..."
$CLI_EXEC $CLI_SCRIPT point --id "$POINT_ID"
pause_script

# -----------------------------------------------------------------------------
# STEP 9: RESERVE
# -----------------------------------------------------------------------------
echo "[STEP 9] Reserving Point ID: $POINT_ID..."
$CLI_EXEC $CLI_SCRIPT reserve --id "$POINT_ID" --minutes 30
pause_script

# -----------------------------------------------------------------------------
# STEP 10: STATUS RESERVED
# -----------------------------------------------------------------------------
echo "[STEP 10] Viewing points with status 'reserved'..."
$CLI_EXEC $CLI_SCRIPT points --status reserved
pause_script

# -----------------------------------------------------------------------------
# STEP 11: POINT INFO
# -----------------------------------------------------------------------------
echo "[STEP 11] Details for Point ID: $POINT_ID (Verify Reservation)..."
$CLI_EXEC $CLI_SCRIPT point --id "$POINT_ID"
pause_script

# -----------------------------------------------------------------------------
# STEP 12: UPDATE POINT (Release)
# -----------------------------------------------------------------------------
echo "[STEP 12] Releasing Point ID: $POINT_ID (Setting to available)..."
$CLI_EXEC $CLI_SCRIPT updpoint --id "$POINT_ID" --status available
pause_script

# -----------------------------------------------------------------------------
# STEP 13: POINT INFO
# -----------------------------------------------------------------------------
echo "[STEP 13] Details for Point ID: $POINT_ID (Verify Release)..."
$CLI_EXEC $CLI_SCRIPT point --id "$POINT_ID"
pause_script

# -----------------------------------------------------------------------------
# STEP 14: RESERVE AGAIN
# -----------------------------------------------------------------------------
echo "[STEP 14] Reserving Point ID: $POINT_ID again..."
$CLI_EXEC $CLI_SCRIPT reserve --id "$POINT_ID" --minutes 30
pause_script

# -----------------------------------------------------------------------------
# STEP 15: CHECK RESERVED
# -----------------------------------------------------------------------------
echo "[STEP 15] Checking reserved points..."
$CLI_EXEC $CLI_SCRIPT points --status reserved
pause_script

# -----------------------------------------------------------------------------
# STEP 16: NEW SESSION 1
# -----------------------------------------------------------------------------
echo "[STEP 16] Recording Session 1 ($S1 to $E1)..."
$CLI_EXEC $CLI_SCRIPT newsession --id "$POINT_ID" \
  --starttime "$S1" --endtime "$E1" \
  --startsoc 10 --endsoc 30 \
  --totalkwh 15 --kwhprice 0.5 --amount 7.5
pause_script

# -----------------------------------------------------------------------------
# STEP 17: POINT STATUS HISTORY
# -----------------------------------------------------------------------------
echo "[STEP 17] History of Point ID: $POINT_ID..."
$CLI_EXEC $CLI_SCRIPT pointstatus --id "$POINT_ID" --from "$DATE_FROM" --to "$DATE_TO"
pause_script

# -----------------------------------------------------------------------------
# STEP 18: POINT INFO
# -----------------------------------------------------------------------------
echo "[STEP 18] Details for Point ID: $POINT_ID..."
$CLI_EXEC $CLI_SCRIPT point --id "$POINT_ID"
pause_script

# -----------------------------------------------------------------------------
# STEP 19: NEW SESSION 2
# -----------------------------------------------------------------------------
echo "[STEP 19] Recording Session 2 ($S2 to $E2)..."
$CLI_EXEC $CLI_SCRIPT newsession --id "$POINT_ID" \
  --starttime "$S2" --endtime "$E2" \
  --startsoc 50 --endsoc 80 \
  --totalkwh 20 --kwhprice 0.6 --amount 12
pause_script

# -----------------------------------------------------------------------------
# STEP 20: SESSIONS HISTORY
# -----------------------------------------------------------------------------
echo "[STEP 20] Session History for Point ID: $POINT_ID..."
$CLI_EXEC $CLI_SCRIPT sessions --id "$POINT_ID" --from "$DATE_FROM" --to "$DATE_TO"
pause_script

# -----------------------------------------------------------------------------
# STEP 21: POINT STATUS
# -----------------------------------------------------------------------------
echo "[STEP 21] Final Status check for Point ID: $POINT_ID..."
$CLI_EXEC $CLI_SCRIPT pointstatus --id "$POINT_ID" --from "$DATE_FROM" --to "$DATE_TO"

echo ""
echo "=================================================================="
echo "DEMO COMPLETED SUCCESSFULLY"
echo "=================================================================="