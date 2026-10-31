# Challenge workbook profile

Source: `dist/challenge2_operational_constraints.xlsx`. The original workbook is included unchanged. `dist/constraints-data.js` retains the file SHA-256, raw source cells and all 322 airport rows. Regenerate with:

    python3 scripts/extract_constraints.py /absolute/path/challenge2_operational_constraints.xlsx

`dist/workbook-profile.js` selects the destination airport. The dashboard's Workbook limits view shows the current value, workbook value and exact source cell; differences are labelled OVERRIDE. Scenario/trace exports retain source references and assumptions.

## Mandatory limits

- Airport runways, total gates, spare recovery gates, rolling-hour movement cap and turnaround minimum: `airport_capacity!G:K` on the destination's row.
- Arrival wake NM, including Super/A380: `wake_separation!A4:C11`. Departure wake seconds: column D. The existing 3 NM radar minimum and conservative close-parallel geometry remain explicit model assumptions.
- Reserve: 30 minutes at holding burn (`fuel_and_crew!B2`). Contingency: 5% planned trip fuel (`B3`). Holding burn: 2,400 kg/h narrowbody and 6,500 kg/h widebody (`B4:B5`). These are challenge limits, not regulatory certification.
- Crew duty: 13 hours from report (`B7`), checked against elapsed duty plus planned completion. Remaining flying-time budgets are separately declared per-flight assumptions.
- Gate change: at least 20 minutes before arrival (`B9`). The original assigned stand and decision time are part of the snapshot.

## Explicit interpretations and assumptions

- Spare fuel (`B6`) is modelled as 45 minutes of usable holding **above** reserve, destination/alternate and contingency budgets. This interpretation is stated in the UI and may be replaced with a measured or agreed fuel budget.
- On DOT import, trip fuel is estimated from scheduled flight duration less 15 assumed taxi minutes, or distance and configured cruise speed if scheduled duration is absent. It is not measured fuel. Cached preview uses configured destination fuel as a proxy.
- Crew report is assumed 120 minutes before T0; planning decision time is T−20. Both are editable and exported.
- Ground shift begins T0 and lasts eight hours; overtime uses the workbook's 1.5× cost multiplier (`B8`). Ground-team capacity is an additional explicit scenario input.
- Spare gates represent the recovery pool; remaining airport gates are assumed occupied by unobserved traffic. Gate/runway identifiers and taxi links are model placeholders. R1 is a gate in this profile, not an invented extra remote stand.
- The filtered CSV contains disruptions only. Reserved background movements default to zero for the demo and can be entered in Configure. Movement capacity counts both modelled arrivals and subsequent departures plus this reservation; it cannot reconstruct total demand from filtered records.
- Airport movement capacity is shared across the modelled runway inventory; the conservative wake stream does not model real approach geometry.

The earlier `legacy-arrival-threshold` profile retains its 45-minute cruise reserve. It is separate from `challenge-workbook-v1`; the UI defaults to the supplied workbook profile.

## Negotiation and comparisons

One completed turn contains one structured ATC, Pilot and Ground message. Up to three turns (nine agent messages); coordinator proposals and fallback records are separate. Unavailable agents produce explicit ERROR records, not fabricated AI replies. No consensus after three turns invokes deterministic fallback and records why.

A first-scheduled-arrival-first, greedy-stand baseline uses the same snapshot and mandatory checks. Numerical benefits are shown only if both baseline and selected plan are feasible. Fuel and delay figures are simulated.

Blocked runs optionally test six bounded changes to ground-team/gate availability. Only a revalidated candidate is offered. These are hypothetical operational resource changes requiring verification, not automatically applied changes or a proof of the globally smallest repair. Fuel, duty, weather and wake safety margins are never relaxed.
