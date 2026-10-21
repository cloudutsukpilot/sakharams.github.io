# Voice: make a playbook read like a person wrote it

A playbook should sound like an experienced cloud/DevOps architect walking a colleague through how
*this* project is being prepared, not like a generic template filled in 18 times. Apply this while
drafting, then do one pass over each finished post just for voice.

## Tone and structure

- **Open each post with a concrete hook tied to the project**, not a definition. Good: "Acme Shop's
  checkout has to survive a Diwali sale at 20x normal traffic, so 'non-functional' is where this
  project is won or lost." Bad: "Requirements gathering is the process of…".
- First person ("I", "we") for the author's decisions; "you" for the reader. Use contractions.
- Vary sentence and paragraph length. Mix prose, tables and lists. Some sections should reason
  through the *why* in paragraphs, not just list items.
- Have opinions and name trade-offs: "I'd keep the MVP to card payments only; UPI adds a second
  reconciliation path we can't test properly yet." Say when the textbook answer doesn't fit.
- Be concrete for this project: name the components, environments, user types and numbers from the
  brief. A section that would read the same for any project is not done.
- Short sections are fine. If a topic barely applies (for example localization for an internal
  tool), say so in two or three sentences and why, rather than padding it.
- Cross-link the other posts of the same project where a decision depends on them
  (`[Technical Architecture](/posts/projects/<slug>/05-technical-architecture/#hosting-and-deployment-model)`).
- Light humour or asides are fine in moderation; don't force them.

## Honesty about facts (hard rule)

- The brief and the author's answers are the only source of project facts. Never invent clients,
  employers, team sizes, budgets, dates, metrics, incidents or outcomes and present them as real.
- When a section needs a fact the brief doesn't give, write the reasoning you *can* give and leave
  the gap as a visible TODO callout that asks the exact question:

  ```markdown
  > **TODO:** What is the target availability for checkout: 99.9% or 99.95%? This sets the
  > multi-region decision in [Resilience](#resilience-and-disaster-recovery).
  {: .prompt-warning }
  ```

- Recommendations are allowed and encouraged, framed as recommendations ("I'd start with…",
  "A sensible default here is…"), not as decisions the project already made.
- Hypothetical scenarios must be framed as such ("Picture a deploy at 6 pm on a Friday…").
- If the author shared a personal experience, weave it in their voice where it fits; keep their
  facts and don't embellish.

## Phrases to avoid

They read as AI-generated, and check.py flags them: "delve", "dive deep" / "let's dive in",
"in today's fast-paced / ever-evolving…", "it's important to note", "game-changer",
"unlock / unleash the power", "seamless(ly)", "robust" (unless literal), "leverage" (say "use"),
"navigate the complexities", "in conclusion", "whether you're a beginner or an expert",
"Happy coding!". Also avoid em-dash-heavy sentences, bolding every other phrase, and ending every
section with a one-line summary.
