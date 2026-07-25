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
   When LCP is material to the request or verdict, follow the LCP causal diagnosis
   below. Use Network, Console, snapshot, screenshot, `evaluate_script`, and
   emulation only as supporting evidence.
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

## LCP causal diagnosis

Use this flow when LCP is slow, is the main optimization target, or reveals a
material risk under the tested constraints. Do not run every check mechanically
when LCP is clearly unrelated to the request.

1. From the trace summary, record the LCP value and the returned insight names.
   Analyze `LCPBreakdown` when available, then inspect only relevant supporting
   insights such as `DocumentLatency`, `LCPDiscovery`, and `RenderBlocking`.
2. Identify the LCP element and whether it is image-, text-, or video-based.
   Prefer element and resource details already returned by the trace insight.
   If they are missing, use a fresh snapshot or a read-only `evaluate_script`
   query against buffered `largest-contentful-paint` entries. Treat missing
   element details as a limitation; do not guess from the visually largest item.
3. For a resource-backed LCP, locate the exact URL in `list_network_requests` and
   inspect it with `get_network_request`. Establish when the request started,
   what initiated it, its priority when available, redirects, transfer duration,
   caching, and whether it was discoverable from the initial document. Do not
   infer transfer size or priority when the tool did not return them.
4. Inspect the rendered markup only for hypotheses supported by the trace:
   `loading="lazy"` on the actual LCP image, CSS background discovery, JS-created
   or hydration-delayed markup, absent or ineffective preload, missing
   `fetchpriority`, render-blocking styles/scripts, font blocking for text LCP, or
   hidden content that becomes visible late. A large viewport image is only an
   LCP candidate; do not recommend `fetchpriority="high"` until the actual LCP
   resource or a measured discovery problem is established.
5. Attribute the bottleneck to the dominant LCP subpart and choose advice from
   that branch:
   - **TTFB** — investigate document redirects, server response, and document
     delivery or caching. Do not propose image compression as the primary fix.
   - **Resource load delay** — make the actual LCP resource discoverable earlier.
     Prefer initial HTML with `<img>` or `<picture>`; remove lazy loading from the
     LCP element; use `fetchpriority="high"` for the confirmed LCP image. Use an
     exact image preload when early HTML discovery is impractical, especially for
     CSS backgrounds, and ensure it matches the requested resource.
   - **Resource load duration** — investigate bytes, responsive sizing, encoding,
     request redirects, origin/CDN latency, and cache behavior. Recommend WebP,
     AVIF, `srcset`, CDN, or caching only when the evidence supports that lever.
   - **Element render delay** — investigate render-blocking CSS or fonts,
     synchronous script, long main-thread tasks, client rendering/hydration, and
     visibility changes. Do not assume a smaller image will reduce this delay.
6. Preserve the complete timing breakdown in evidence. Percent shares help locate
   leverage but are not performance budgets; a high share of a small total may
   not justify work, while a smaller share of a poor total may still matter.
7. Verify with an equivalent trace under the same route, viewport, auth, cache,
   CPU, and network profile. Compare the affected subpart and total LCP, and check
   that CLS and other material metrics did not regress. Use comparable repeated
   runs for quantitative before/after claims.

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
- The common LCP bands (good at or below 2.5 s, needs improvement above 2.5 s and
  at or below 4.0 s, poor above 4.0 s) describe Core Web Vitals field guidance.
  A lab trace can use them for orientation but cannot establish that a URL or
  origin passes the field metric. Field assessment requires suitable field data
  and its URL/origin granularity.
- Do not assign severity from a metric value alone. Consider whether the issue
  blocks or materially degrades the scoped user flow.

## Result format

Respond in the language of the current user-agent conversation. An explicitly
requested language takes precedence. If the language is unclear, mixed, or a
fallback is required, respond in Russian. Do not translate MCP tool names,
parameters, insight IDs, enum values, or other technical identifiers.

Write for a reader who first needs to know whether the measured experience is
fast, what is actually wrong, and what to do next. Lead with the outcome; put
measurement protocol and trace identifiers near the end. Do not make the reader
infer the verdict from raw metrics.

Use this order:

1. **Verdict** — one or two plain-language sentences. State whether the measured
   scenario is healthy, needs attention, or has a serious problem, and name the
   most important reason. Scope the verdict to the tested scenario. If no
   material problem was found, say so explicitly. Do not call a result "good" or
   "bad" from a common threshold alone; make clear when thresholds are guidance
   rather than a product budget.
2. **At a glance** — a short list or small table of the user-relevant metrics and
   their meaning. Separate `What is good` from `What needs attention`. Do not list
   a technically interesting observation as a problem when it had no measured
   user impact. When LCP is a material finding, name the LCP element or resource
   and show the four subparts when available; otherwise do not add an LCP
   breakdown just for completeness.
3. **What to do** — ordered, concrete actions. Label each as `now`, `next`, or
   `optional` according to measured user impact and expected leverage. If no
   action is urgent, say that before listing optional improvements.
4. **Issues** — only material findings, ordered by severity. Keep each finding
   scannable with short labeled bullets: `Problem`, `User impact`, `Evidence`,
   `Action`, and `Verify`. State severity and confidence separately in words;
   avoid ambiguous headings such as `[medium][high]`.
5. **Test details** — URL, scenario, viewport/device, auth, cache protocol, trace
   type, run count, baseline and `Slow 4G`, `series CPU`, `CPU source`,
   `restore CPU`, assumptions, and cleanup status. Include a compact runs table
   with run index, pair or `n/a`, network and CPU profiles, cache, validity, key
   metrics, and insight set ID. Keep exact trace identifiers here unless they are
   direct evidence for a finding.
6. **Limitations** — only limitations that affect interpretation or coverage:
   missing field data, too few valid runs, inaccessible states, instability,
   unknown pre-audit CPU state, exhausted retry budget, failed cleanup, or checks
   not performed.

Omit empty sections. Put non-actionable details such as expected console noise or
a non-blocking request chain under a brief `Additional notes` section rather than
mixing them with prioritized issues.

Use `critical` only when the problem blocks a key flow or makes it effectively
unusable. For every material finding include the observation, user impact,
evidence, confidence (`high`, `medium`, or `low`), recommendation, and equivalent
verification trace. Tie an LCP recommendation to the measured dominant subpart
and confirmed element/resource instead of listing generic image optimizations.

Preferred finding shape:

```md
### Finding title

Severity: medium. Confidence: high.

- **Problem:** ...
- **User impact:** ...
- **Evidence:** ...
- **Action:** ...
- **Verify:** ...
```

Prefer a concise report over repeating the same fact in the verdict, metrics,
finding, and recommendation. For comparable repeats, report baseline and
`Slow 4G` medians and spread separately. Label a single run or pair as
diagnostic, not regression-grade.

## Stop and degrade safely

Return a partial report instead of inventing results when the page or scenario
cannot be reproduced, a trace cannot be recorded, a dialog or crash blocks the
flow, or required tools are unavailable. Name completed checks, the exact
limitation, and the smallest next step. Complete the audit when the scenario ran
under the stated conditions, valid traces were captured, material conclusions
are tied to evidence, and an equivalent re-test is described. The result may be
a confirmed bottleneck, an unconfirmed hypothesis, or no material issue within
scope.
