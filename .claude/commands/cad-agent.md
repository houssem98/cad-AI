---
description: run one iteration of CAD_AGENT_LOOP.md
---
<!-- generated from CAD_AGENT_LOOP.md · regenerate: node ~/.claude/scripts/loop-prompt.mjs cad-agent --install -->
Goal: an independently engineered AI CAD agent that matches the reference product's observable workflows: natural language becomes typed, validated CAD operations, a real kernel builds the part, the kernel's own inspection verifies it, and an execution record proves it. No kernel evidence, no geometry claim. Clean room: behavior comes from public docs and observation, never from proprietary code, prompts, assets or branding.

One iteration. Read docs/LOOP_GRAPH.md (driver rules), then docs/LOOP_CONVENTIONS.md, then the active loop's ledger.

1. Health: `git status`, the `npm run gate` verdict, and the active loop's ticks and spend against its budget.
2. Pick the active loop and task by the graph's driver rules. Stop check per Conventions: Target, Budget, Stall. If one holds, write the Journal entry, say which, and do not schedule another tick.
3. Write `started T<n>` in the Journal. Write the task's failing check first, then the smallest change that passes it. One task per tick.
4. Run the task's Evidence command, then `npm run gate`. Tick the task only on exit 0, with the output quoted in the Journal. Commit locally per Conventions; never push.
5. Finish the Journal entry: status, gate, commit, what happened, a Direction line, the next task.
6. Escalate per Conventions instead of deciding anything on that list. Next tick in 120 seconds.
