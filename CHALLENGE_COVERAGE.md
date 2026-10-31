# Challenge coverage and demonstration checklist

The hosted Site is deterministic. The local backend implements independent Claude contexts and streaming responses, but live Claude has not been tested because ANTHROPIC_API_KEY is not configured. Do not pitch hosted playback as live AI.

| Requirement | Implementation / practical limit |
|---|---|
| Three independent domains | `backend/server.py`: three Agent objects, distinct prompts, separate histories, domain-filtered payloads. Not one combined prompt. |
| ATC wake, blocked taxiways, throughput | Canonical hard checks; throughput represented by last landing time and holding in the configured airport arrival stream. Full sector geometry/capacity is outside scope. |
| Pilot fuel, safety, turbulence, connections | Protected reserve/destination/alternate budgets and assessed weather hard vetoes; fuel burn, turbulence-weighted holding and missed connections are soft costs. Turbulence is an editable assumed 0–3 level. |
| Ground gates, overtime, turnaround | Compatibility, occupancy, buffers, minimum turns and crew budgets/capacity checked; remote stands, overtime and turnaround delay costed. |
| Structured exchange and cross-domain evaluation | Versioned proposals, JSON votes/counters, code evidence; objections revise the cohort plan. Independent local preferences never override global feasibility. |
| Traceable consensus | Three same-version ACCEPT votes plus every hard check passing, then flight confirmations. Raw structured trace export. |
| No endless loops | Three turns, 192 generated candidates maximum; local AI negotiation has a 60-second deadline and per-call timeout. |
| Deterministic non-AI fallback | Rank fully validated generated candidates; mark FALLBACK separately from CONSENSUS. No valid generated candidate yields ESCALATE. Bounded search is not a proof of global infeasibility. |
| Provided DOT row | Import the provided 2015 CSV. Require a selected row with WEATHER_DELAY > 15 or LATE_AIRCRAFT_DELAY > 20. Preserve the raw qualifying seed in each AI payload. Cached preview schedules omit the raw row; import is required to demonstrate this criterion. |
| Real-time disruptions | Editing inputs invalidates approvals; new run uses a fresh snapshot. Local AI replies stream when received. No live aircraft/weather/ATC feed is integrated. |

## Demo

1. Start the local server, configure a server-side API key and model, and select independent Claude execution.
2. Import the supplied CSV and include a qualifying seed. Explicitly acknowledge synthetic operational parameters.
3. Run a feasible cohort: show separate actual agent responses, a ground rejection and revision, unanimous same-version agreement, and the timeline.
4. Make a fuel budget infeasible: show the exact failed evidence and no committed plan.
5. Inject an unavailable agent: show deterministic validated fallback, explicitly not consensus.
6. Remove a required assessment: show NOT_EVALUATED before any model call.
7. Export the trace. Distinguish configured simulation evidence from real operational certification.

Before claiming the complete live AI challenge demonstration, exercise step 1 with a real credential. Controlled test responses verify the protocol and vetoes but do not verify model connectivity or real-world safety.

## Clarification update

The supplied challenge workbook is bundled, mapped for 322 airports and used by default. Workbook limits and exact source cells are inspectable. Challenge reserve is 30 holding minutes plus 5% trip contingency; the earlier 45-minute legacy profile remains separate. Movement capacity, departure wake and gate-change notice are now enforced. See WORKBOOK_PROFILE.md for declared synthetic assumptions and overrides.

A turn contains three distinct structured domain messages. Coordinator messages are not counted. At most three turns; missing responses are ERROR records and fallback is explicitly non-AI. The first-come baseline must itself be feasible before savings are claimed. Counterfactual resource changes remain hypothetical and require verification.
