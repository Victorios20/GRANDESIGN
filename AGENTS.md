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
  5. Database validation (when schema/database changes are involved)

### Prisma validation (MANDATORY when database changes occur)

If the implementation changes Prisma schema, models, relations, migrations, seeds, or any database contract, you MUST also validate Prisma state before finishing.

Required checks:

- Confirm `schema.prisma` is consistent with the implementation
- Verify migration was created when needed
- Verify migration applied successfully
- Verify Prisma Client is up to date
- Check for drift between schema and database
- Validate impacted queries/mutations after schema change

Suggested validation order:

1. `npx prisma validate`
2. `npx prisma format`
3. `npx prisma migrate dev` or confirm equivalent migration flow was executed
4. `npx prisma generate`
5. Run application/type checks after Prisma update

Never finish a database-related task without confirming Prisma changes are reflected in the database and client.

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