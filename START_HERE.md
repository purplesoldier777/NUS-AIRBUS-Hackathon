# Runway Recovery Room — team handoff

Unzip this archive, then open a terminal in the runway-recovery-room folder.

Requirements: Python 3.10+ and Node.js (tested with Node 22). No npm or pip packages are required.

## Start the dashboard

    python3 backend/server.py

Open http://127.0.0.1:8874/ in your browser. Rules simulation works without any API key. On Windows, use `python` if `python3` is unavailable.

## Run the three Claude agents

Configure ANTHROPIC_API_KEY and ANTHROPIC_MODEL in the terminal environment before starting the server. Use a model available to your Anthropic account. Restart the server after configuring them, then select Independent Claude agents in the dashboard. Model calls use your account and may incur charges. Never put a real key in source code, CSV files, the group chat or a shared ZIP.

Each role has a separate prompt, domain data and conversation history. Replies stream as they arrive. Every hard constraint retains veto power. Maximum three rounds / 60 seconds, followed by validated deterministic fallback or escalation.

Live Claude connectivity has not been tested with a real credential in this handoff. Protocol and safety-veto tests use controlled responses. The hosted demo is a rules simulation, not live AI.

## Data

A complete sample operational CSV is included at dist/operational-flights-template.csv. You can also download a template from the dashboard.

The original 2015 DOT flights.csv is NOT included. Import your group's supplied CSV and select a row where WEATHER_DELAY > 15 or LATE_AIRCRAFT_DELAY > 20. Explicitly acknowledge the synthetic operations profile. The cached demo has historical schedules but omits the raw qualifying row; import the original data to demonstrate the challenge criterion.

Fuel, gates, wake classes, weather assessments, turbulence and crew budgets include declared simulation assumptions. This is a hackathon demonstrator, not operational clearance software. See CHALLENGE_COVERAGE.md for implemented scope and remaining limits.

## Tests

    node --test tests/*.test.cjs
    python3 -m unittest discover -s backend -p 'test_*.py'

Verified at handoff: 55 JavaScript tests and 4 Python tests passed.

## Find the code

- dist/: interactive dashboard, simulation engine and canonical hard-rule validator
- backend/server.py: local streaming server and three independent Claude agents
- tests/ and backend/test_server.py: validation and coordination tests
- README.md and CHALLENGE_COVERAGE.md: design, workflow, scope and limitations

Hosted demo: https://runway-recovery-room-belinda.quick-swan-3845.chatgpt.site/
The hosted demo keeps its existing access permissions; sharing this ZIP does not grant Site access.

This archive excludes API credentials, Git history, hosting account identifiers, temporary files and generated caches.

## Workbook clarification update

The original challenge2_operational_constraints.xlsx is now included in dist/ and applied automatically for all 322 airports. Open Workbook limits to inspect exact source cells and overrides. Read WORKBOOK_PROFILE.md for the 30-minute holding reserve, 5% contingency, 20-minute gate-change notice, departure wake and airport movement caps. These are synthetic challenge limits; the older legacy profile remains separate.

The turn board shows exactly three domain messages per completed turn, up to three turns. Coordinator proposals are separate. The comparison claims benefits only against a feasible baseline. Failed rules-mode runs test bounded extra-team/released-gate counterfactuals, with no automatic resource changes or relaxed safety margins.

The filtered flight data contains disruptions, not total airport traffic. Configure reserved background movements explicitly. The original flights.csv is still a separate input.

## Disruption input update

Write your own disruption description, or use Not sure? Choose a disruption row from flights.csv. The description is shared with the three agents and retained in exports. Set measurable effects in the operational-effects controls; text alone never silently changes safety limits. Validation is automatic and always applies to the same revised schedule.
