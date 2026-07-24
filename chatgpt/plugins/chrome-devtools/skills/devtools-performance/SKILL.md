---
name: devtools-performance
description: Diagnose live Chromium page-load and runtime performance through the bundled Chrome DevTools MCP. Use for slow pages, performance traces, Core Web Vitals (LCP, INP, CLS), long tasks, rendering or network bottlenecks, interaction latency, and before/after performance regressions. Do not trigger for generic UI debugging without a performance question.
---

# DevTools Performance

Analyze performance through the MCP server named `devtools`. Before the first MCP
call, read the sibling [devtools](../devtools/SKILL.md) skill and apply its
connection, page-control, snapshot, and safety rules. This skill defines only
performance-specific behavior.

Analyze the application in the environment supplied by the user. Do not change
how it is built or started, switch its build mode, or restart it for the audit.
If the current environment may affect performance, report that as a hypothesis
or limitation and recommend repeating the measurement in a production-like
environment. Missing build information does not block the audit.

## Scope and inputs

Before measuring, record the URL or selected page, the exact load or interaction
scenario, desktop/mobile and viewport, authentication state, cache state, CPU and
network throttling, and whether CrUX is available. Choose reasonable defaults when
they do not change the meaning of the test, then report them.

Before the series, choose and record:

- `series CPU` — the slowdown factor used for the measurement series;
- `CPU source` — user, project, default, or `unchanged`;
- `restore CPU` — the action to take after the series.

For `series CPU`:

- use the user or project value when provided; that alone does not mean the same
  profile was active before the audit;
- use `cpuThrottlingRate: 1` by default for desktop;
- for a mobile performance scenario, prefer a supplied or calibrated factor for
  the target device class; when unavailable, use `cpuThrottlingRate: 4` as a
  synthetic fallback, not as emulation of a specific CPU;
- when a mobile viewport is only a scenario condition and a slower CPU is not
  required, do not enable CPU throttling automatically.

Do not change the CPU profile within a comparable series. Report its factor and
selection method. Do not read or guess unavailable pre-audit CPU state. If the
user explicitly reported an active pre-audit factor, restore it. If the audit
enabled CPU throttling, set `cpuThrottlingRate: 1` after the series. If the audit
did not change CPU throttling, do not issue a CPU reset.

For an interaction, also define a reproducible starting state: route, data,
component state, selection/scroll, and the step where tracing starts. Restore it
before every measurement. Do not repeat irreversible or externally significant
actions without a safe fixture or explicit user permission.

Use a reload trace for page load, a manual non-reload trace for an interaction,
and equivalent conditions for before/after comparisons. Do not use
`lighthouse_audit` as a performance audit: the bundled runtime excludes the
performance category and directs performance work to tracing.

Before comparing, choose and record a cache protocol. Use cold/cold only when the
cache can be reset reliably or separate clean isolated profiles are available
before each trace. Otherwise use warm/warm: before each measured load trace,
perform an equivalent unmeasured warm-up under the corresponding network profile.
If equivalent cache state cannot be established, analyze the traces separately,
do not attribute their delta only to network conditions, and state the limitation.

A measurement pair consists of a baseline without network throttling and an
equivalent trace under `Slow 4G` through
`emulate(networkConditions: "Slow 4G")`. Unless the user explicitly limits the
audit to one network profile, run one or more such pairs. Change only
`networkConditions` between profiles; keep viewport, CPU throttling, auth,
scenario, initial application state, and declared cache state equivalent. If the
user requests one profile, run only that profile, preserve cleanup, and do not
make paired conclusions.

After every pair or any error, perform mandatory cleanup. If tracing started and
completion is not confirmed, first attempt `performance_stop_trace`. Then disable
network throttling by calling `emulate` without `networkConditions` and reapply
the audit-managed `series CPU`, viewport, and other required emulation settings.
After the whole series, perform the recorded `restore CPU`: restore an explicitly
reported original factor, set `cpuThrottlingRate: 1` if the audit changed CPU
throttling, or make no CPU emulation call if the audit did not change it. Do not
leave the selected page with an active trace or throttling; report failed cleanup
explicitly.

## Workflow

1. Open the target state and confirm it with a fresh snapshot or screenshot.
2. Record the initial application state and choose the cold/cold or warm/warm
   cache protocol, `series CPU`, `CPU source`, `restore CPU`, and mode:
   - `paired` — baseline and `Slow 4G`; one pair for diagnosis or at least three
     valid pairs for quantitative comparison/regression;
   - `single-profile` — only the user's selected profile; one trace by default
     for diagnosis or at least three for quantitative comparison/regression,
     without paired conclusions.
   An explicit user count takes precedence. If it is below three, treat the
   result as diagnostic rather than regression-grade.
3. In `paired` mode, for each baseline disable network throttling by calling
   `emulate` without `networkConditions`, apply the CPU profile and other
   emulation settings, restore the initial application state, and prepare cache.
   Start a trace with reload/auto-stop appropriate to the scenario. For an
   interaction, disable auto-stop, perform only the minimal flow, then call
   `performance_stop_trace`.
4. In `paired` mode, restore the same starting state for `Slow 4G`, apply
   `emulate(networkConditions: "Slow 4G")` with the same CPU profile, prepare an
   equivalent cache state, and repeat the trace. Perform mandatory cleanup
   regardless of the result.
5. In `single-profile` mode, run only the selected profile with the same CPU,
   state/cache preparation, tracing, and cleanup rules.
6. Register every trace with a `run index`, pair number or `n/a`, network profile,
   CPU profile, cache protocol, validity status, and returned insight set IDs.
   Exclude invalid traces from statistics and replace them only within the retry
   budget: at most one additional pair/trace for diagnosis and at most two for
   quantitative mode. In `paired` mode one retry unit is the whole pair; in
   `single-profile` it is one trace. If the same error occurs twice, stop retrying
   and return a partial report. An explicit user retry limit takes precedence.
   Inspect the summaries of all valid traces. Pass only insight set IDs and names
   from the corresponding trace to `performance_analyze_insight`; never mix
   insight sets from different runs.
7. Connect each important metric to an evidence chain: resource timing,
   main-thread work, rendering, layout, third-party activity, or a specific input.
   Use Network, Console, snapshot, screenshot, and emulation only as supporting
   evidence.
8. Check trace comparability. Do not remove outliers without explanation. Compare
   cold with cold and warm with warm; between baseline and `Slow 4G`, change only
   `networkConditions` and keep viewport, CPU throttling, auth, and scenario the
   same.
9. For comparable repeats, calculate the median and spread of each network
   profile. Label one trace or one pair as diagnostic and do not use it as
   regression evidence.
10. Prioritize improvements by user impact and expected leverage. Describe the
   equivalent trace required to verify each recommendation.
11. After all runs, confirm that tracing is stopped, network throttling is
    disabled, and the recorded `restore CPU` action was completed.

## Interpretation rules

- Distinguish lab trace data from CrUX field data. Missing CrUX does not block a
  lab audit.
- Do not claim causality from correlation alone. Label an unverified cause as a
  hypothesis and name the next test.
- Do not generalize one page or one run to the whole site.
- Do not compare unlike cache, device, CPU, or auth conditions. Compare different
  network conditions only in a planned baseline / `Slow 4G` pair where network is
  the only intentionally changed variable.
- Do not attribute a delta from incomparable cache states to network throttling.
  Treat one pair as diagnostic rather than quantitative regression evidence.
- Do not compare runtime traces with different routes, data, or component states.
  If the starting state cannot be reproduced, analyze runs separately and label
  the causal conclusion as a hypothesis.
- For an INP-like issue, reproduce a specific real interaction; a load-only trace
  is insufficient. A lab trace establishes the latency of the measured input, not
  the page's field INP. Report field INP only from suitable field data such as
  CrUX, respecting its URL/origin granularity.
- Do not invent a product performance budget. If none was provided, label common
  thresholds as guidance rather than acceptance criteria.
- Do not assign severity from a metric value alone. Consider whether the issue
  blocks or materially degrades the scoped user flow.

## Result format

Respond in the language of the current user-agent conversation. An explicitly
requested language takes precedence. If the language is unclear, mixed, or a
fallback is required, respond in Russian. Do not translate MCP tool names,
parameters, insight IDs, enum values, or other technical identifiers.

Return a compact report with:

1. **Scope** — URL, scenario, viewport/device, cache protocol, run count, initial
   application state, baseline and `Slow 4G`, `series CPU`, `CPU source`,
   `restore CPU`, auth, trace type, assumptions, and cleanup status.
2. **Summary** — the main performance outcome without false precision; for
   comparable repeats, report baseline and `Slow 4G` medians and spread separately.
3. **Runs** — for each trace, `run index`, pair or `n/a`, network and CPU profiles,
   cache, validity, key metrics, and insight set ID.
4. **Findings** — ordered by `critical`, `high`, `medium`, `low`, or `info`.
5. **Evidence** — metric, trace insight, request, task, layout event, or exact
   reproduction step.
6. **Recommendations** — a concrete change direction and equivalent re-test.
7. **Limitations** — missing field data, instability, too few valid runs,
   inaccessible states, unknown pre-audit CPU state, exhausted retry budget,
   failed cleanup, or checks not performed.

For every finding state the observation, user impact, evidence, confidence
(`high`, `medium`, or `low`), recommendation, and verification method. Use
`critical` only when the problem blocks a key flow or makes it effectively
unusable.

Compact finding template:

```md
### [severity][confidence] Finding title
Observation → Impact → Evidence → Recommendation → Verification
```

## Stop and degrade safely

Return a partial report instead of inventing results when the page or scenario
cannot be reproduced, a trace cannot be recorded, a dialog or crash blocks the
flow, or required tools are unavailable. Name completed checks, the exact
limitation, and the smallest next step. Complete the audit when the scenario ran
under the stated conditions, valid traces were captured, material conclusions
are tied to evidence, and an equivalent re-test is described. The result may be
a confirmed bottleneck, an unconfirmed hypothesis, or no material issue within
scope.
