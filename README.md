# Aerolink — daylight recovery studio

Static, private pitch demonstrator with a white and pale-blue interface. Run locally with `python3 -m http.server 8873 --directory dist`.

1. Set 1–12 active flights, or import a CSV.
2. Choose a disruption; **Configure** opens capacity, weather and timing settings.
3. Run recovery. Inspect each domain's decisions, hard checks, structured messages and proposed landing order.

**Flight inputs** edits individual fuel, crew, wake and weather inputs. **Run history** keeps the latest 12 immutable run snapshots in the browser session. Changing inputs clears approvals. Playback can pause, step, replay and jump to a domain's round decision.

## CSV import

Files are streamed locally in a Web Worker; they are not sent to a model or server. Maximum file size is 1 GB. Preview is limited to 1,000 rows and selection to 12 flights.

- DOT format: finds rows with WEATHER_DELAY > 15 or LATE_AIRCRAFT_DELAY > 20. Select an eligible seed (first 200 examples, with airport/date rescan), then nearby scheduled arrivals at the same destination and date within ±60 minutes. Actual arrival outcomes are not decision inputs. Explicitly accept the labelled synthetic operations profile because DOT does not contain fuel, wake classes, gate resources or crew budgets.
- Operational format: download the CSV template from the current scenario. Missing mandatory fields block validation unless demo defaults are explicitly enabled; blank supplied cells remain unknown. Airport resources remain the displayed shared scenario assumptions.

## Engine and limits

Three independent deterministic domain evaluators in `dist/engine.js` exchange versioned structured messages. This browser is not connected to live Claude. The optional Python Claude orchestrator is in the parent directory.

All commitments and fallback plans pass `dist/hard-rules.js`. Unknown required evidence fails closed. Negotiation is limited to 3 rounds and at most 192 generated candidates; larger cohorts use bounded heuristics, not guaranteed global optimisation. Local preference fit is explanatory, never a safety override. The full rule reference and modelling limits are available in the UI.

`node --test tests/*.test.cjs` checks parser, import mapping, variable cohorts, consensus, fallback, priorities and hard constraints.

The visual design is an independent aviation concept, not an official Airbus design system or an operational clearance tool.

## Per-flight recovery review

**Edit each flight** opens the manifest. Each aircraft has an editable carrier, callsign, aircraft type and operational constraints. Carrier labels do not grant landing priority. The operational CSV template includes CARRIER.

After the full cohort plan is validated, playback confirms one flight at a time, distinguishing runway landing from gate/stand arrival. The final chronological schedule is grouped into up to five flights per group; these are display groups, not simultaneous landings. Diversions identify the alternate without inventing an alternate gate. Failed or incomplete plans never show successes. Proposal hashes remain in structured technical details and trace exports.

## Independent Claude execution

The hosted Site is a rules simulation. To run live independent Claude agents, open this checkout, set `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` in the **server environment**, run `python3 backend/server.py`, then visit `http://127.0.0.1:8874` and choose **Independent Claude agents**. Never place the secret in browser code or CSV files.

The backend uses three Agent objects, separate system prompts, domain-specific payloads and separate conversation histories. Structured replies stream to the local UI as they arrive. A rejected hard check overrides a model ACCEPT. The coordinator allows at most three rounds and 60 seconds of negotiation; malformed replies, timeouts and outages go to deterministic, fully validated fallback or escalation. There are no live aircraft or airport feeds. Model API calls have not been verified without a configured credential; controlled transport tests verify coordination and code vetoes.

For the challenge data requirement, **import the provided 2015 DOT CSV** and include a row where WEATHER_DELAY > 15 or LATE_AIRCRAFT_DELAY > 20. Import preserves that qualifying raw row and passes it to each agent along with provenance. The cached preview retains schedules but not the original raw delay row. Operational fuel, gate, crew, wake and turbulence inputs remain explicit assumptions. A historical delay cause is context, not knowledge of a future actual arrival.

## Why no flights are confirmed

No validated plan means no success confirmations. The cohort is committed as one shared plan; a failure affecting one aircraft can block the whole cohort. The panel reports exact failed checks and evidence from the closest generated candidate, identifies the responsible domain, and suggests which operational inputs/resources to review. Missing data is reported separately. The bounded search does not prove global infeasibility. Do not edit reserves or legal budgets merely to obtain agreement.

## Challenge scope

- ATC: wake/radar spacing, open runways and taxi routes; airport arrival throughput proxy. Full en-route sector capacity is outside this model.
- Pilot: protected fuel and assessed weather checks; holding burn, missed connections and configured turbulence-weighted holding exposure (0–3 assumed level).
- Ground: gates, buffers, turn minimums, crew budgets/capacity; remote-stand usage, overtime and turnaround departure delay.
- Communication: versioned structured proposals/votes/counters, same-version unanimous agreement, trace export, round/candidate/time limits and non-AI fallback.
- Actual AI: runnable local streaming backend, not connected to hosted production and not live-tested without credentials. No requirement to force agreement when no safe candidate exists.

Tests: `node --test tests/*.test.cjs` and `python3 -m unittest discover -s backend -p 'test_*.py'`.

## Updated challenge workbook and three-turn definition

The supplied workbook is now bundled and applied automatically to all 322 destination airports. Open **Workbook limits** for exact sheet/cell sources, current values and overrides. See WORKBOOK_PROFILE.md for the reserve/contingency interpretation, duty assumptions, wake/departure checks, rolling-hour movement capacity and 20-minute gate-change notice.

The **three-turn board** counts one message from each domain per turn, up to nine agent messages. Coordinator proposals and fallback records do not count toward the three-agent turn. Offers describe arrival/gate adjustments subject to every peer's validation. Unavailable agents are logged as errors rather than fabricated responses.

The **baseline comparison** reports simulated holding, holding fuel, connections and turnaround differences only against a feasible baseline. Failed rules-mode runs test a bounded set of ground-team and released-gate counterfactuals; no safety margins are weakened and no resource suggestion is applied automatically.

The filtered DOT dataset is not a complete traffic schedule. Configure the reserved background movement rate separately. The original flights.csv remains a separate input and is not bundled in the team ZIP.

## Enter the disruption

The main setup now accepts a free-text disruption description rather than fixed presets. The description is shared with every local Claude agent and retained in scenario/trace exports. It is context, not a silently inferred operational limit. Open Set the operational effects to enter runway reopening, weather clearance and equipment readiness; Configure and Edit each flight retain gate, taxiway, fuel and crew controls.

Alternatively, choose a disruption row from the supplied DOT flights.csv. The selected seed is automatically included in the cohort, its exact raw row is retained, and weather/late-aircraft delay causes populate the description. Historical delay minutes are not automatically treated as a current runway closure. The hackathon's qualifying-DOT-row requirement still applies to the final challenge demonstration; a manually written scenario is a what-if case unless linked to that dataset.

Plan validation is automatic. ATC, Pilot and Ground recheck the same revised schedule because changes in one domain can create fuel or gate conflicts in another. No user approval is required for each agent check, and safety limits are never loosened to obtain agreement.
