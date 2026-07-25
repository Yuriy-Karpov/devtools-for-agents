# Evidence patterns for common leaks

Use this reference only after snapshot comparison and a retaining path identify a
concrete owner. A matching class name is a lead, not a diagnosis. For every
pattern, connect the retained node to the interaction that created it and repeat
the same lifecycle after the proposed cleanup.

## Event listeners and subscriptions

Look for a long-lived `Window`, `Document`, event target, emitter, store, observer,
or subscription retaining a callback whose closure owns the suspect object.
Confirm that the lifecycle should unsubscribe it.

Recommend symmetric cleanup using the same listener identity and compatible
options, an unsubscribe handle, observer `disconnect()`, or a scoped
`AbortController`. Do not merely add `removeEventListener` when the handler was
registered with an anonymous function that cannot be matched.

## Detached DOM and framework trees

Confirm that the node is absent from the live document, should have been released,
and remains reachable through application code. Detached DOM can be an intentional
cache, transition buffer, virtualized list, or development-mode artifact.

Trace through wrappers, event listeners, component instances, framework fibers,
registries, and cached collections. Recommend clearing the owning reference or
fixing component teardown, then verify that the same node family no longer
accumulates across A → B → A cycles.

## Closures, timers, tasks, and pending work

Look for a closure context retaining large state through an active timer,
animation frame, queued task, unresolved promise, worker, or callback registry.
The closure itself is not proof; identify the long-lived scheduler or owner that
keeps it reachable.

Recommend cancelling scheduled work, settling or aborting requests, removing the
callback from registries, or narrowing captured variables. Treat promises that
eventually settle as delayed cleanup unless repeated cycles show persistent
accumulation.

## Unbounded collections and caches

Look for `Array`, `Map`, `Set`, object dictionaries, memoization tables, histories,
or application stores whose entry count rises with the scenario and does not
stabilize. Determine whether growth is bounded by a documented capacity or
eviction policy.

Recommend explicit capacity and eviction, lifecycle cleanup, or weak collections
only when weak-key semantics match the ownership model. `WeakMap` and `WeakSet`
do not make strongly referenced values collectible when their keys remain live.

## Globals, registries, and development instrumentation

Look for paths through `Window`, module singletons, debug registries, analytics
queues, error buffers, hot-reload state, or test harnesses. Reproduce in the
intended production/development mode before attributing application impact.

Recommend removing accidental registration or bounding retained history. Do not
classify a deliberate singleton as a leak unless its contents grow beyond the
intended lifetime.

## Large or repeated strings

String growth can come from logs, serialized payloads, source maps, caches, DOM
text, or repeated error data. Use `get_heapsnapshot_duplicate_strings` only when
string growth is material. Rank groups by their reported totals, then inspect
retaining paths for representative node IDs.

Retained graphs for different strings can overlap, and truncated values can group
distinct full strings under the same displayed prefix. Do not sum group retained
sizes as independent impact or expose sensitive string values in the report.
Prefer fixing the retaining container or generation pattern over interning
arbitrary user data.
