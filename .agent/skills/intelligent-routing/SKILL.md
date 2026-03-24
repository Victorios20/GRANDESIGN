---
name: intelligent-routing
description: Route requests before any coding, UI creation, architecture decision, or multi-step reasoning task. Classify the request, select the correct specialist agent from `.agent/agents/`, load its required skills, check for matching workflows, and enforce the Antigravity execution protocol for implementation, refactors, UI work, and system design.
---

# Intelligent Routing

## Purpose

Enforce structured execution using the Antigravity system.

Ensure that every task:
- is classified
- is routed to the correct agent
- uses the correct skills
- follows the proper workflow before execution

## Step 1 - Classify Request

Determine the request type before implementation:

- `QUESTION` -> explanation only
- `SURVEY` -> analyze or explore without editing
- `SIMPLE` -> small code change
- `COMPLEX` -> build, refactor, or multi-file work
- `DESIGN` -> UI, UX, layout, or visual system work

## Step 2 - Select Agent

Match the task domain to the specialist agent:

- UI, React, Next.js -> `frontend-specialist`
- API, business logic -> `backend-specialist`
- DB, schema, query design -> `database-architect`
- Debugging and root-cause analysis -> `debugger`
- Security review or hardening -> `security-auditor`
- Planning and scoping -> `project-planner`
- Multi-domain work -> `orchestrator`

If the domain is ambiguous, resolve that ambiguity before implementation.

## Step 3 - Announce Agent

Always announce the selected agent before continuing:

```markdown
🤖 Applying knowledge of @[agent-name]...
```

Do not skip this announcement.

## Step 4 - Load Agent

Open `.agent/agents/{agent}.md`.

Then:

- read the agent rules
- read the frontmatter
- extract the `skills:` list
- apply the agent-specific constraints before proceeding

## Step 5 - Load Skills

For each skill declared by the selected agent:

- open `SKILL.md` first
- read only the sections relevant to the current task
- do not load the entire skill blindly

Prefer minimal, targeted loading over broad context expansion.

## Step 6 - Check Workflow

If the task matches a workflow, open `.agent/workflows/<name>.md` and follow it step by step.

Typical triggers include:

- planning flows
- creation flows
- debugging flows
- orchestration flows
- testing flows

Do not bypass a matching workflow.

## Step 7 - Run Socratic Check

Before coding or design work, ask clarifying questions when:

- requirements are unclear
- the task is complex
- multiple files are likely to change

Never assume hidden requirements.

## Step 8 - Execute

Only after classification, routing, agent loading, skill loading, workflow check, and Socratic check:

- generate code
- generate UI
- generate architecture
- generate the solution

## Failure Conditions

Treat the following as protocol failures:

- no agent selected
- no agent announcement
- skills not loaded
- code or design created before routing
- workflow ignored

## Success Condition

A valid response is:

- routed
- specialized
- consistent with the Antigravity system
