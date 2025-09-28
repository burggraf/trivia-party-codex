<!--
Sync Impact Report
Version change: 0.0.0 → 1.0.0
Modified principles: none (initial release)
Added sections: Core Principles; Experience & Quality Standards; Delivery Workflow; Governance
Removed sections: none
Templates requiring updates:
- ✅ .specify/templates/plan-template.md
- ✅ .specify/templates/spec-template.md
- ✅ .specify/templates/tasks-template.md
- ✅ .specify/templates/agent-file-template.md
Follow-up TODOs: none
-->

# Trivia Party Constitution

## Core Principles

### Client-Side Only Code

- MUST implement client-side only code. All applications are static web apps deployed to Cloudflare Pages with no server-side execution or Node APIs.
- MUST never introduce server-side code in frontend projects; all logic runs purely in the browser environment.

### React Frontend with Modern Practices

- MUST build frontend exclusively with React.
- MUST leverage TypeScript with strict typing; usage of `any` type is prohibited.
- MUST use shadcn components with Tailwind CSS for all UI elements ensuring consistent, accessible design.
- MUST write modular React components with clear organization and maintainability.
- MUST keep source files concise, aiming for no more than 250 lines per file.

### Backend via Supabase Only

- MUST use Supabase and the supabase.js client library exclusively for backend services.
- MUST rely on Supabase database and enforce appropriate Row-Level Security (RLS) policies to protect data.
- MUST utilize Supabase Auth for user authentication.
- MUST use Supabase Storage, Realtime, and Edge Functions as needed.
- MUST prefer Postgres functions called via `supabase.rpc()` over edge functions for data-related logic unless external API access or complex orchestrations justify edge functions.

### Code Quality and Simplicity

- MUST favor simplicity over complexity in solutions.
- MUST write small, clear, and easy-to-follow code.
- MUST maintain readability, well-structured codebases, inline documentation for complex logic, and follow all linter and type-checking rules.

## Experience & Quality Standards

- MUST maintain a consistent design system based on Tailwind and shadcn components.
- MUST validate all code with automated tests and static analysis.
- MUST confirm accessibility and performance benchmarks in all UI components.

## Delivery Workflow

- MUST reference this constitution during all planning and implementation phases via Spec Kit slash commands.
- MUST link plans and pull requests to relevant tasks that confirm adherence to these principles.

## Governance

- Amendments to principles require consensus among contributors and documented impact analysis.
- Versioning follows semantic versioning to track changes in project policies.

**Version**: 1.0.0 | **Ratified**: 2025-09-28 | **Last Amended**: 2025-09-28
