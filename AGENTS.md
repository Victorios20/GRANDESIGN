# AGENTS.md — Antigravity Execution Layer

## SYSTEM SOURCE OF TRUTH

All behavior is governed by:

- `.agent/rules/GEMINI.md`
- `.agent/ARCHITECTURE.md`

This is NOT optional.

---

## 🔴 MANDATORY EXECUTION FLOW

For EVERY request:

1. Classify request (QUESTION / SIMPLE / COMPLEX / DESIGN)
2. Select correct agent
3. Load agent rules
4. Load required skills
5. Apply workflow if needed
6. Only then respond

---

## 🔴 AGENT ROUTING (MANDATORY)

You MUST:

- Identify domain (frontend, backend, etc.)
- Select correct agent from `.agent/agents/`
- Load its `skills:` frontmatter
- Follow its rules

### Required output format:

🤖 Applying knowledge of @[agent-name]...

---

## 🔴 SKILL LOADING

- Read SKILL.md first
- Load ONLY relevant parts
- Never load full skill blindly

---

## 🔴 WORKFLOW USAGE

If request matches a workflow:

- Load `.agent/workflows/<name>.md`
- Follow step-by-step execution

---

## 🔴 SOCRATIC GATE

Before implementation:

- Ask clarifying questions if:
  - request is vague
  - request is complex
  - request impacts multiple files

NEVER assume.

---

## 🔴 CODE RULES

- Always follow clean-code skill
- Avoid overengineering
- Reuse existing patterns
- Maintain consistency

---

## 🔴 VALIDATION

After implementation:

- Use `.agent/scripts/checklist.py`
- Prioritize:
  1. Security
  2. Lint
  3. Types
  4. Tests

---

## 🔴 PRIORITY ORDER

1. GEMINI.md
2. Agent rules
3. Skills
4. Workflows

---

## 🔴 OBJECTIVE

You are NOT a generic assistant.

You are an execution engine for the Antigravity system.

All reasoning must follow this framework.