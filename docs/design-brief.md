# Design brief — course-lab

Constraints a general-purpose design tool cannot know. Read this before touching
any UI in this repo; it is the input that makes generic design advice correct here.

## Who and where

A 14–16-year-old on a **school-issued Chromebook**, in a classroom, during a 50-minute
period. Second user: the teacher, at the front, sometimes with the screen **on a
projector** at the back of the room. Ambient light is fluorescent and high; the screens
are cheap TN/IPS panels with poor off-axis contrast.

**Light theme, always.** Not a preference — a dark UI on a washed-out projector in a lit
classroom is unreadable from row four.

## Hard constraints

- **1366×768** is the design viewport. Not a laptop, not a phone. Anything below the fold
  at that size is a thing students will not find.
- **No webfonts.** The district network is a real filter and a blocked CDN means a
  fallback flash mid-lesson. Every font stack degrades to a system font on purpose.
- **No new dependencies.** React + Vite is the whole stack, deliberately
  (`docs/course-lab-founding-spec.md` §2–3). No UI kit, no CSS framework, no icon
  package.
- **WCAG AA minimum, and treat it as a floor.** Body text ≥ 4.5:1. Real, visible
  `:focus-visible` on every control — Chromebook trackpads are bad and keyboard use is
  common. Accommodations on roster are not hypothetical.
- **`prefers-reduced-motion` honored everywhere.** Non-negotiable, same as the rest of
  the portfolio.
- **Touch targets ≥ 40px.** Chromebooks are often touchscreens and students use them
  that way.

## The rule that governs everything else

**The shell must not compete with the module it launches.**

Each module is a designed teaching surface with its own committed palette — indigo for
prompts, ember for the transformed curve, violet reserved for producer targets, teal and
amber for verdicts. Those colors *mean* something. The shell is a hallway. If the picker
is as visually loud as the module, the shell's color starts reading as meaningful when it
is not, and the module's color stops being special.

**Shell = same tokens, lower contrast, less color, plainer type.** Accent is for the
current action only. Nothing decorative anywhere.

## Tokens

Mirrored from the modules (`src/modules/*.jsx` each carry their own `C` block — the house
ruling is single-file module artifacts, **do not extract a shared kit**). Duplication here
is the pattern, not an oversight.

| Role | Value |
|---|---|
| bg | `#F7F4ED` |
| panel | `#FFFFFF` |
| ink | `#23211C` |
| sub | `#6A675E` |
| line | `#E5E0D4` |
| accent (indigo) | `#3457A6` |
| good / warn / danger | `#1D8A66` / `#A8740F` / `#A3261F` |

Display: `'Fraunces','Georgia',serif` · Body: `'Inter','Segoe UI',system-ui,sans-serif`
(both currently resolve to the fallback — see "no webfonts").

## Copy rules

- **Write to the student, not about them.** The storage warning says "tell Mr. L," not
  "storage unavailable."
- **No jargon on student-facing surfaces.** "telemetry," "session," and "sink" are teacher
  words. Students see "your work."
- **Never blame the student for a device problem.**
- Teacher controls are **labelled as teacher controls** and visually demoted. A student
  must not be able to wander into a destructive action.

## Not goals

- Dark mode. See above.
- Mobile/phone layout. Students use the Chromebook; a phone layout is a surface nobody
  asked for.
- Animation beyond state feedback. Motion here conveys "this responded," nothing else.
- Branding. This is a classroom tool, not a product launch.
