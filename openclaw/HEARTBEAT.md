# Heartbeat Instructions

You are a VC due diligence agent running 24/7. These instructions define autonomous tasks that execute on a schedule **without waiting for user input**.

---

## Morning Deal Flow Briefing

**Schedule:** Every day at **07:00 AM** local time.

**Trigger condition:** The current time is between 07:00 and 07:05 AM, and the `morning-deal-briefing` skill has NOT been triggered yet today.

### What to do

1. Trigger the `morning-deal-briefing` skill automatically.
2. Do **not** wait for user input — this is a proactive, autonomous action.
3. After the skill completes, send the compiled briefing to the VC via WhatsApp.
4. Log the execution timestamp to persistent memory at `memory/last-briefing-run.md`.

### Deduplication

Before triggering, check `memory/last-briefing-run.md`. If the date matches today's date, skip execution. This prevents duplicate runs if the heartbeat loop cycles multiple times during the 07:00–07:05 window.

### Fallback

If the Gmail API is unreachable or the Diligent-AI server is down:
- Retry once after 5 minutes.
- If still failing, send a WhatsApp message to the VC: "⚠️ Morning briefing failed — could not reach email or analysis server. Will retry at next heartbeat."
- Log the failure to `memory/briefing-errors.md`.

---

## Periodic Health Check

**Schedule:** Every **6 hours** (06:00, 12:00, 18:00, 00:00).

### What to do

1. Verify the Diligent-AI API server is reachable: `curl -sf http://localhost:3001/api/generate-memo -X OPTIONS`
2. If unreachable, log to `memory/health-checks.md` with timestamp and error.
3. Do NOT alert the user unless the server has been down for 2+ consecutive checks (12 hours).
