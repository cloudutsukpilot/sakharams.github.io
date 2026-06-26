---
layout: post
title: Claude Code - Tips and Tips
categories: [aicodingtools, claude code]
tags: [AI Coding Tools, Claude Code]
---

# 32 Claude Code Hacks That Will Change How You Build

Whether you've just installed Claude Code or you've been using it for months, there's almost certainly a way you're leaving performance on the table. These 32 hacks — organized from beginner to advanced — cover everything from context management and voice input to parallel agent teams and git worktrees. The best ones are at the end.

---

## Beginner Hacks (1–10)

### 1. Run `/init` on Every Project

The very first thing you should do when opening any existing project in Claude Code is type:

```
/init
```

Claude will scan your entire codebase — folders, files, architecture — and generate a `CLAUDE.md` file. Think of it as a cheat sheet Claude writes for itself about your project: conventions, key files, and architectural decisions. Instead of re-explaining your project at the start of every session, Claude simply reads this file and picks up right where you left off.

Starting from scratch? Claude Code can help you write the `CLAUDE.md` yourself. Just describe your goal, tech stack, and any rules or key folders.

```markdown
# CLAUDE.md example

## Project
E-commerce platform built with Next.js 14, Supabase, and Tailwind.

## Key Directories
- /app       → Next.js App Router pages
- /components → Reusable UI components
- /lib       → Utilities and helpers

## Conventions
- Use server components by default
- Keep API calls in /lib/api
- Always validate with Zod
```

---

### 2. Set Up a Status Line

Working in the terminal and want to keep an eye on your session stats? Type:

```
/status-line
```

Tell Claude what you want to see — current model, context percentage, cost, whatever — and it generates a small script that sits at the bottom of your terminal. It's a mini dashboard that updates with every response, so you always know exactly how much context you have left.

---

### 3. Use Voice Input

Claude Code now ships a native `/voice` command — you can literally talk to your terminal and have it code for you. It's still rolling out, but if you want voice dictation right now, any system-wide dictation app works too. Just talk, words appear, done.

---

### 4. Keep Your Context Small

This one sounds obvious but most people ignore it: **don't dump your entire codebase into one conversation.** Only give Claude what it needs for the current task. Break big problems into small, focused steps.

The less noise in the context window, the better Claude performs. More context is not always better.

---

### 5. Use `/context` to Find Token Bloat

If a session feels sluggish or expensive, run:

```
/context
```

You'll see exactly what's eating your tokens, broken down by percentage — system prompts, file contents, MCP servers, everything. Diagnose the bloat, then restructure accordingly.

---

### 6. Compact at 60%, Clear Between Tasks

When your context usage hits around 60%, don't wait until it's full. Run:

```
/compact
```

Claude compresses your conversation history so you can keep going without losing the important stuff. And you can be specific:

```
/compact but keep all the API integration decisions and database schema
```

Claude will shrink everything else and preserve exactly what you asked it to keep.

When switching to a completely different task, use `/clear` to wipe the slate clean. Your `CLAUDE.md` and project files are all still there — it's not starting from scratch, just a fresh conversation.

---

### 7. Always Start in Plan Mode

Before Claude writes a single line of code, hit `Shift+Tab` to cycle into plan mode (or choose it manually). In plan mode, Claude can still read and research your codebase, but it won't change anything. Instead it will:

- Outline the steps
- Ask clarifying questions
- Map out the full approach

Once you approve the plan, switch out of plan mode and tell it to execute. This single habit dramatically reduces the number of times you have to go back and correct Claude.

---

### 8. Treat Claude Like a Junior Developer

Don't always give direct commands like "write me a function that does X." Instead, give it **problems**:

> "How should we handle growth tracking?"

When Claude thinks through the approach itself — making its own assumptions and reasoning through decisions — the outputs are measurably better. Ask it to explain its reasoning. It's like plan mode, but pushing one level deeper into the thinking.

---

### 9. Make Claude Ask You Questions

You can explicitly tell Claude to keep asking questions until it's confident it understands the task:

```
Continuously ask me questions until you're 95% confident you understand
exactly what I need and exactly what you need to do.
```

The alignment you get from this upfront saves three or four rounds of back-and-forth revisions later.

---

### 10. Build Self-Checking Into the To-Do List

Claude builds a to-do list when it starts working. You can bake verification steps directly into that list:

```
1. Build the homepage layout
2. Take a screenshot and verify the layout looks correct
3. Open Chrome DevTools and check for console errors
4. Only then move to the next feature
```

Add this rule to make it stick:

```
Don't move on to your next to-do until you're 95% confident that to-do is complete.
```

Claude isn't just building and handing it to you anymore — it's building, checking, and only asking for your feedback when it's already done its own QA pass.

---

## Intermediate Hacks (11–22)

### 11. Deploy Sub-Agents for Parallel Work

When working on complex problems, tell the main session to use sub-agents:

```
Use sub-agents to research the authentication options in parallel while you scaffold the UI.
```

Claude spins up isolated sub-agents, each with their own context window, running in parallel. The main thread stays clean while sub-agents go do research, write tests, or explore different approaches. When they're done, they all report back with their findings.

Think of it as going from one developer to a small team.

---

### 12. Build Custom Skills

Create reusable prompt files in your `.claude/skills/` directory:

```
.claude/skills/
├── tech-debt.md       # how to scan for and categorize technical debt
├── code-review.md     # your code review standards and checklist
└── api-design.md      # conventions for new API endpoints
```

Invoke them with a slash command or just natural language, and that entire workflow runs consistently every time. Commit them to GitHub and your whole team instantly has access.

```markdown
# .claude/skills/code-review.md

When reviewing code, always check:
1. No hardcoded secrets or credentials
2. Error handling on all async operations
3. Input validation before database writes
4. Tests exist for new public functions
5. No console.log left in production paths
```

---

### 13. Use Haiku for Sub-Agents

Not every task needs Opus. When a sub-agent needs to scrape dozens of articles, process large amounts of data, or do high-volume, lower-complexity work, set it to use Haiku:

```
Spin up sub-agents using claude-haiku-4-5 to scrape and summarize these 50 articles,
then pass only the key highlights back to this session.
```

Haiku at scale is dramatically cheaper. Your main thread stays on Opus for the reasoning that actually matters.

---

### 14. Refresh Your `CLAUDE.md` Constantly

After every significant session, update the `CLAUDE.md`:

- New patterns discovered
- Gotchas to avoid
- Conventions that emerged
- New skills you created

Tell Claude to do this automatically:

```
At the end of this session, update CLAUDE.md with any new patterns,
gotchas, or conventions we discovered.
```

Over time, Claude gets smarter about your project, your business, your preferences. But keep it lean — `CLAUDE.md` is loaded as a system prompt at the start of every conversation. Aim for **150–200 lines maximum**. If it gets longer, trim it.

---

### 15. Have `CLAUDE.md` Route to Other Files

Instead of stuffing everything into one file, keep `CLAUDE.md` slim and use it as a table of contents:

```markdown
# CLAUDE.md

## Architecture
See: /docs/architecture.md

## Style Guide
See: /docs/style-guide.md

## Business Context
See: /docs/product-context.md

## Current Sprint
See: /docs/sprint-goals.md
```

Claude knows exactly where to look for detailed information, but only loads those files when it actually needs them. Your system prompt stays light.

---

### 16. Exit Early and Re-Ask

If you notice Claude going down the wrong path — **hit Escape immediately.** Don't wait for it to finish. Every token it spends going the wrong direction is wasted context.

Correct course, reprompt, and get back on track. Steer tight, steer early.

---

### 17. Challenge Outputs Aggressively

If Claude gives you something that's just okay, push back:

```
Scrap that. Give me a more elegant version.
```

```
This isn't good enough. Try again with a completely different approach.
```

Claude will often give you a dramatically better output on the second try once it knows the bar is higher and what not to do. Once it produces something better, tell it to update the skill or `CLAUDE.md` so it doesn't make that mistake again.

---

### 18. Use `/re` for Quick Undos

Made a wrong turn? Instead of starting over:

```
/re
```

Claude rolls back to a previous point in the conversation. Fast, clean, no restart needed.

---

### 19. Use Hooks for Notifications

Set up a notification hook so Claude pings you when it's done:

```
/hooks
```

Or just ask Claude to set one up in natural language:

```
When you finish this task, send me a system notification sound.
```

Run 10–15 Claude Code sessions simultaneously. When you hear the ping, one of them needs your input. You never have to babysit the terminal.

---

### 20. Use Screenshots as Input

Claude can see. This is a huge unlock:

- Feed it a screenshot of an error message
- Show it a website you want to replicate
- Have it screenshot your own app and self-review

For web builds, set up a screenshot loop:

```
Design the component → take a screenshot → analyze → improve → repeat 3 times before showing me V1.
```

The V1 you get from this loop is miles ahead of what you'd get from a single pass.

---

### 21. Use Chrome DevTools

Claude can open a browser, navigate to your app, interact with elements, and check the console for errors:

```
Open the app, click through the onboarding flow, and check Chrome DevTools for any
JavaScript errors or failed network requests.
```

This is the functional equivalent of the screenshot loop — but for behavior, not appearance. Great for catching broken buttons, failed API calls, and layout issues that screenshots miss.

---

### 22. Clone Inspiration Sites

Take a screenshot of any site you love and tell Claude:

```
Make it look like this.
```

Claude recreates the design patterns without producing generic AI output. You can also feed it the actual HTML/CSS of the inspiration site for even more precision. Use it as a template and add your own touch — don't ship it as a clone.

---

## Advanced Hacks (23–32)

### 23. Run Parallel Sessions with Git Worktrees

Two Claude Code sessions working in the same folder at the same time will overwrite each other. Git worktrees solve this:

```bash
# Terminal 1 — work on feature-auth
claude-worktree feature-auth

# Terminal 2 — work on feature-payments simultaneously
claude-worktree feature-payments
```

Each worktree gets its own isolated branch and workspace. Run three, four, five sessions in parallel. When done, merge the branches back into main like any other git workflow.

```bash
# List active worktrees
git worktree list

# Remove when done
git worktree remove feature-auth
```

---

### 24. Use API Endpoints Instead of MCP Servers (When Appropriate)

MCP servers are powerful, but they load their entire tool definition list into the context window. If you're tight on tokens and only need one specific operation, hardcode a direct API call instead:

```bash
# Instead of loading the entire Notion MCP server...
# Just hardcode the one endpoint you actually need:

curl -X GET https://api.notion.com/v1/databases/YOUR_DB_ID \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: 2022-06-28"
```

If you only need to read one Notion database, you don't need Claude to know about every other Notion API function. Hardcode the endpoint, save the tokens.

---

### 25. Use `/loop` for Recurring Tasks

Set Claude to automatically re-run a check on an interval:

```
Every 5 minutes, check the deployment logs and tell me if there's an error.
```

```
Remind me at 3pm to check in with the team on the API migration.
```

Claude runs the prompt in the background and only interrupts you when something actually needs attention. Note: `/loop` sessions persist for up to 3 days. For longer-running scheduled automation, use Claude Desktop's scheduled tasks (though each task spins up in a fresh session without conversation memory).

---

### 26. Host on a VPS for Always-On Sessions

Run Claude Code on a remote server so it keeps running even when your laptop is closed:

```bash
# SSH into your VPS
ssh user@your-vps.com

# Start Claude Code in a persistent tmux session
tmux new -s claude
claude

# Detach (Ctrl+B, D) — Claude keeps running
# Reconnect from anywhere:
tmux attach -t claude
```

From there you can even control it via Telegram — SSH in from your phone, or pair it with a Telegram bot that pipes messages to the session. Perfect for long-running builds where you don't want to babysit a local terminal.

---

### 27. Remote Control from Your Phone

Claude Code now lets you control local sessions from your phone or any browser. Start a task at your desk, then walk away and keep steering it from your pocket. Your code never leaves your local machine — just the control interface is remote.

Start something heavy, go grab a coffee, keep building from your phone.

---

### 28. Natural Language SQL Analytics

Connect CLI tools like BigQuery's `bq` tool to Claude Code and ask questions in plain English:

```
What were our top 10 revenue sources last quarter?
```

Claude translates it to the right query, runs it, and gives you the answer. No SQL required. This works for any CLI-based database tool — BigQuery, Postgres via `psql`, whatever you have connected.

---

### 29. Use `ultrathink` for Hard Problems

When you need Claude to really dig in — architecture decisions, complex debugging, major refactors — or when it just isn't giving you the right output after a couple tries, add this to your prompt:

```
ultrathink
```

This allocates Claude's maximum thinking budget of around 32,000 tokens before it responds. The terminal goes all colorful. You'll see the difference in output quality on problems where the solution requires holding a lot of context simultaneously.

Don't use it for simple fixes. Absolutely use it for decisions that might affect the entire system.

---

### 30. Edit Permissions for Safe Autonomy

A lot of tutorials show `--dangerously-skip-permissions` to let Claude run without approval on every step. It's faster, but the name is a warning for a reason.

The smarter approach: explicitly configure what's allowed and what's denied in your permissions settings:

```json
// .claude/permissions.json
{
  "allow": [
    "npm run *",
    "git add *",
    "git commit *",
    "python *"
  ],
  "deny": [
    "rm -rf *",
    "git push --force",
    "DROP TABLE *"
  ]
}
```

The deny list takes priority over the allow list. You get the same speed and autonomy as dangerously-skip-permissions, without the danger.

---

### 31. Use Agent Teams

Sub-agents (hack #11) run in parallel but can't talk to each other. Agent teams are different — they share a task list, communicate with each other, and can even assign each other work:

```
Set up an agent team: one agent for backend API, one for frontend components,
one for writing tests. Have them coordinate on the shared task list.
```

You can talk directly to individual agents, not just the main orchestrator. More expensive and longer-running than sub-agents, but for a big project that needs coherent output across multiple domains, agent teams produce a significantly better result.

---

### 32. Install Context7 MCP

This one is a genuine game changer. Claude's training data has a cutoff, which means it sometimes suggests functions, APIs, or syntax that has been renamed, deprecated, or no longer exists.

Context7 fixes this. Install the MCP server and it pulls live, version-specific documentation for thousands of popular libraries — Next.js, React, MongoDB, you name it — and injects it into the conversation before Claude writes any code.

```bash
# Install via npm
npx -y @upstash/context7-mcp
```

Then in your Claude Code MCP config:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

Now when you're working with any library, prompt Claude to use it:

```
Use context7 to get the latest Next.js 15 docs before implementing this feature.
```

One install. Every coding session from then on works with current documentation. It's one of the highest-leverage things you can add to your Claude Code setup.

---

## Quick Reference

| # | Hack | Command/Tip |
|---|------|-------------|
| 1 | Init every project | `/init` |
| 2 | Session dashboard | `/status-line` |
| 3 | Voice input | `/voice` |
| 4 | Small context | Focus on one task at a time |
| 5 | Find token bloat | `/context` |
| 6 | Compress history | `/compact` · `/clear` |
| 7 | Plan before coding | `Shift+Tab` → plan mode |
| 8 | Give problems not commands | "How should we handle X?" |
| 9 | Force clarifying questions | "Ask until 95% confident" |
| 10 | Self-checking to-do lists | Bake verification steps in |
| 11 | Parallel work | Sub-agents |
| 12 | Reusable workflows | `.claude/skills/*.md` |
| 13 | Cheaper sub-agents | Claude Haiku for data tasks |
| 14 | Living memory | Update `CLAUDE.md` each session |
| 15 | Lean system prompt | Route to external files |
| 16 | Stop wrong paths | Hit Escape, reprompt |
| 17 | Push for better | "Scrap that, try again" |
| 18 | Quick undo | `/re` |
| 19 | Finish notifications | `/hooks` |
| 20 | Visual input | Screenshots |
| 21 | Browser testing | Chrome DevTools integration |
| 22 | Design inspiration | Screenshot → "Make it like this" |
| 23 | True parallelism | `claude-worktree <branch>` |
| 24 | Token-efficient integrations | Direct API endpoints vs MCP |
| 25 | Background monitoring | `/loop` |
| 26 | Always-on sessions | VPS + tmux |
| 27 | Mobile control | Claude Code remote |
| 28 | Natural language DB | Connect `bq`/`psql` CLI |
| 29 | Deep thinking | `ultrathink` in prompt |
| 30 | Safe autonomy | Configure allow/deny lists |
| 31 | Coordinated agents | Agent teams |
| 32 | Live documentation | Context7 MCP |

---

The hacks build on each other. Start with `/init`, plan mode, and small context. Once those are second nature, layer in sub-agents, custom skills, and worktrees. By the time you get to agent teams and Context7, you're genuinely operating at a different level than when you started.