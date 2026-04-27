#!/bin/bash
# Tailscale Funnel for hk-camera — provides permanent stable public HTTPS URL
# Your permanent URL: https://harkishans-macbook-air.tailebae5d.ts.net

LOGFILE=/tmp/tailscale-funnel.log

echo "$(date) Starting Tailscale Funnel..." | tee -a "$LOGFILE"
echo "=========================================" | tee -a "$LOGFILE"
echo "  PERMANENT URL:" | tee -a "$LOGFILE"
echo "  https://harkishans-macbook-air.tailebae5d.ts.net" | tee -a "$LOGFILE"
echo "=========================================" | tee -a "$LOGFILE"
echo "" | tee -a "$LOGFILE"

while true; do
  tailscale funnel 5173 2>&1 | tee -a "$LOGFILE"
  echo "$(date) Funnel stopped – restarting in 3s..." | tee -a "$LOGFILE"
  sleep 3
done
