---
# Plan Milestone Gaps Workflow
---

## Overview
This workflow automates the creation of fix phases for gaps identified by a milestone audit.

### Steps
1. **Load latest milestone audit**
   - Locate the most recent file matching `v*-MILESTONE-AUDIT.md` in the `.planning` directory.
2. **Extract gaps**
   - Parse the audit file to collect gap descriptions (lines starting with `- `).
3. **Group gaps into logical phases**
   - Simple heuristic: group by a common prefix before a colon (`:`) if present, otherwise each gap becomes its own phase.
4. **Update `ROADMAP.md`**
   - For each new phase, append a markdown section:
     ```md
     ## Phase: <Phase Name>
     - Gap: <description>
     ```
5. **User confirmation**
   - After preparing the changes, display a summary and ask the user to confirm before writing to `ROADMAP.md`.
6. **Offer to plan each phase**
   - Provide a short command suggestion like `/gsd-plan-phase <Phase Name>` for the user to run.

## Execution
Run the accompanying script `plan-milestone-gaps.sh` which implements the above steps.
