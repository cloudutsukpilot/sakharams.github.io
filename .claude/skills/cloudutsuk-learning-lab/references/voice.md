# Voice: write a lab like someone who ran it

A lab post is a guide. Someone experienced is next to the reader at the terminal, saying what to type,
what will happen, and why. Write it while looking at the real repo and the real screenshots.

## Tone

- **Talk to the reader as "you"** for the steps ("Run `make up`. The first run pulls about 2 GB").
  Use "I" sparingly, for choices the author made ("I pinned the collector to 0.162.0 because…").
  Use contractions.
- **Open each part with what the reader will have at the end of it**, not with a definition. Good:
  "By the end of this part a click on the page is a trace in Tempo." Bad: "OpenTelemetry is an
  observability framework that…".
- **Quote the real code.** Every config or code block comes from the lab repo at the captured
  revision, trimmed with `# …` where needed and never reworded. Name the file above each block.
- **Commands are copy-pasteable** and expected output is real output from your run (trim it, don't
  invent it).
- **Explain the why at each hop**: who emits, how it travels (push vs scrape vs tail), where it lands,
  why it takes N seconds. That reasoning is the lesson; the commands are only the vehicle.
- **Name the gotchas you hit**, in Common Failures and inline ("If Grafana shows no data, check the
  time picker first; the dashboard defaults to the last 15 minutes").
- Vary sentence length; mix prose, tables and short lists. Don't end every section with a summary line.

## Experiments in part 6

Under each experiment card, two short sections:

- **What the screenshots show**: what changed, panel by panel, with the numbers, service names and
  IDs that are actually visible ("the counter goes from 464 to 472: eight requests, not one"). Compare
  with the prediction.
- **Why it happens**: trace the cause through the stack, and link the part that set it up
  (`[Instrumentation](/posts/labs/<slug>/02-write-the-code/#instrumentation)`).

Keep each to one or two paragraphs. The card already lists what to look for, so don't repeat it.

## Check Your Understanding

3–5 questions per part that make the reader apply the idea, not recall a word, each with a folded
answer:

```markdown
<details markdown="1">
<summary>Why does the request counter rise by more than one per reload?</summary>

Because the page is three files…

</details>
```

## Honesty (hard rule)

- Facts come from the lab repo, the captured run and the author's brief. Never invent versions,
  timings, numbers or outcomes. If you didn't measure it, don't state it.
- Never describe a screenshot you haven't looked at, or one that isn't captured. A missing fact gets a
  visible TODO:

  ```markdown
  > **TODO:** Capture the error-rate timelapse (cloud lab: needs the author's go-ahead to run).
  {: .prompt-warning }
  ```

- Recommendations ("in production I'd add tail sampling") are framed as recommendations.

## Phrases to avoid

check.py flags them: "delve", "dive deep" / "let's dive in", "in today's fast-paced…",
"it's important to note", "game-changer", "unlock / unleash the power", "seamless(ly)",
"robust" (unless literal), "leverage" (say "use"), "navigate the complexities", "in conclusion",
"whether you're a beginner or an expert", "Happy coding!". Also avoid em-dash-heavy sentences and
bolding every other phrase.
