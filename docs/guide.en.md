# suta: full guide

The short introduction and install steps are in the [README](../README.md). This guide covers every install option, how it works, the post-edit check, all 57 patterns, the repository layout, development and contributing.

한국어: [guide.md](guide.md)

Contents: [Overview](#overview) · [What it removes](#what-it-removes) · [Installation](#installation) · [Updating](#updating) · [How it works](#how-it-works) · [Post-edit check](#post-edit-check) · [57 patterns](#57-patterns) · [Layout](#layout) · [Repository structure](#repository-structure) · [Development](#development) · [Contributing](#contributing)

## Overview

suta provides guidelines and pattern code to reduce repetitive cards, excessive colors and unnecessary decoration in AI-generated UI. The agent uses the guidelines and adapts code from 57 patterns to the project.

The patterns include keyboard, screen reader and reduced-motion support. The plugin checks layout and motion in files changed through supported editing tools. Shell-written files need a manual audit. The rendered UI and interactions still need browser checks.

The name comes from the Korean *suta* (手打), as in noodles made by hand.

## What it removes

| What AI usually makes | With suta |
|---|---|
| Every screen built from the same hero → three cards → button template, every button filled | A skeleton per screen type, drawn from screens of 31 Korean reference apps (see the note below). A detail screen keeps one filled button in a bar fixed to the bottom |
| Every section wrapped in a card, with another box inside the card | Grouping by spacing and thin lines. Cards only for standalone units, one layer deep |
| Numbers the same size as their labels, spacing and radius values all over the place | Hierarchy from size and weight. Spacing, type and radius come from tokens (a scale) only |
| Gradient text, glows and colored badges everywhere, 9px text | Emphasis in one or two places per screen. Text at 12px or more, covered by the layout check |
| `transition: all 0.3s ease` on everything | Only the properties that move, with durations and easing sized to the motion (motion tokens) |
| Animating `height` or `top`, so the page stutters | Only `transform` and `opacity` move. Height uses the grid technique and position changes use FLIP |
| Ignoring the reduced-motion setting | Reduced-motion support in every stylesheet |
| `div` buttons that a keyboard can't reach | Native HTML elements with keyboard and screen reader support |
| Modals that leave focus, Esc and background scroll alone | Focus moves in and returns, Esc closes, the background is locked |
| Drag-to-dismiss that doesn't follow the finger | Follows the finger and decides from the release velocity |
| A lone spinner for loading, double submits on rapid taps | Skeletons that hold the layout, buttons locked while pending |
| Code written from scratch every time | 57 patterns copied into the project and adapted to it |

The screen-type skeletons come from 1,116 screens collected from 31 Korean reference apps. 12 of them were not app screens (for example, another app's screen or a capture taken mid-transition), so the counts use the remaining 1,104. Other docs in this repository quote one number or the other for this reason.

## Installation

Install once. After that, ask for UI as you normally would.

### Claude Code

```text
/plugin marketplace add Guksu/suta
/plugin install suta@suta
```

The plugin bundles the skill and the [post-edit check](#post-edit-check). Both are on as soon as it's installed.

### Codex

```bash
codex plugin marketplace add Guksu/suta
codex plugin add suta@suta
```

Codex runs a plugin's hooks only after you approve them. Open `/hooks` in Codex and approve suta's post-edit check. To use only the skill without the hook, the method below works too.

### Cursor, Gemini CLI, GitHub Copilot and others (skill only)

Install with one line from the project root. Pick one of the two methods. This installs only the skill, so the post-edit check does not run. The agent runs the checks itself as part of the workflow.

```bash
# Method 1: skills CLI (detects installed agents and copies into each one's skill folder)
npx skills add Guksu/suta --skill suta

# Method 2: this repo's install script (copies into .agents/skills/suta, needs only git)
curl -fsSL https://raw.githubusercontent.com/Guksu/suta/main/scripts/install-skills.sh | sh
```

| What you want | Command |
|---|---|
| Install into another folder | `… \| sh -s -- --dest .cursor/skills` |
| Use across your whole machine | `… \| sh -s -- --dest ~/.agents/skills` |
| Update | Run the same command again (only the `suta` folder is replaced) |

You can also copy the files by hand without the script.

```bash
git clone --depth 1 https://github.com/Guksu/suta.git
mkdir -p .agents/skills
cp -R suta/skills/suta .agents/skills/
```

| Tool | Project skill folder | Personal global folder |
|---|---|---|
| Codex | `.agents/skills/` | `~/.agents/skills/` |
| Cursor | `.agents/skills/` or `.cursor/skills/` | `~/.agents/skills/` or `~/.cursor/skills/` |
| Gemini CLI | `.agents/skills/` or `.gemini/skills/` | `~/.agents/skills/` or `~/.gemini/skills/` |
| GitHub Copilot | `.agents/skills/`, `.github/skills/` or `.claude/skills/` | `~/.agents/skills/` or `~/.copilot/skills/` |
| Claude Code | `.claude/skills/` (or the marketplace above) | `~/.claude/skills/` |

Paths follow each tool's documentation as of September 2026. If a tool changes, check that tool's documentation.

If you used the old version (fe-skills), remove it first. In Claude Code, run `/plugin marketplace remove fe-skills` and then install with the commands above. If you also installed the design Q&A plugin `fe-system`, run `/plugin uninstall fe-system@fe-skills`. The old install script and skills CLI installed a separate skill folder per pattern (`bottom-sheet/` and so on). Those folders overlap with suta on the same requests, so delete them, along with the design Q&A `design` folder. The install script lists any that remain.

## Updating

Read the [release notes](https://github.com/Guksu/suta/releases) before updating.

For **Claude Code**, run these commands in a terminal, then start a new session:

```bash
claude plugin marketplace update suta
claude plugin update suta@suta
```

For **Codex**, refresh the marketplace with `codex plugin marketplace upgrade suta`, then open suta in the app's plugin settings to check and update the installed version. Refreshing the marketplace alone is not confirmation that the installed plugin changed. Check `/hooks` if the app asks you to approve updated hooks.

For a **skills CLI** install, run `npx skills update suta` from the project where you installed it. This updates suta in the scope you select. If you used our install script instead, rerun the same install command with the same destination.

Command references: [Claude Code](https://code.claude.com/docs/en/discover-plugins#update-plugins-now) · [Codex marketplaces](https://developers.openai.com/plugins/build/plugins) · [skills CLI](https://skills.sh/docs/cli).

## How it works

The skill and pattern documentation is written in Korean. One recorded check used an English request and produced English UI copy and a reply in English; this is a single example, not a broad language evaluation.

1. You install suta once. It is a single skill, and at startup the agent reads only its description.
2. You ask as usual, for example "build a login screen" or "polish this button animation". The agent recognizes UI work and opens suta. You don't need to name the skill.
3. The agent picks matching patterns from suta's catalog and reads each pattern's manual (`PATTERN.md`).
4. It copies the pattern code into the project and adapts it to the project's framework and styling.
5. It runs the combined audit script (`scripts/audit.mjs`) and fixes what it finds. The script looks for layout defects (nested cards, text under 12px, effect overuse, off-scale spacing) and motion defects (layout animations, `transition: all`, missing reduced-motion support) in one pass.

| Request | Patterns suta picks |
|---|---|
| "Build the order screen for our noodle shop" | `quantity-stepper` · `bottom-sheet` · `loading-button` · `toast-stack` |
| "Let users pick menu options in a bottom sheet" | `bottom-sheet` |
| "Make feed photos pinch-zoomable" | `pinch-zoom` |
| "Every screen animates differently" | `motion-principles` · `motion-audit` |
| "Too many cards, it feels cramped. Tidy up the layout" | `layout-principles` · `layout-audit` |
| "Build the menu detail screen for the noodle shop" | `layout-principles` (detail screen skeleton) · `stretchy-header` · `quantity-stepper` · `loading-button` |

To call it explicitly, use `/suta:suta` in Claude Code or `$suta` in Codex. To make every UI task use it, add a line such as "Follow the suta skill for UI work" to the project's `AGENTS.md` or `CLAUDE.md`.

> A **skill** is a manual an AI agent reads. suta holds 57 patterns inside one skill and reads only the ones it needs, so it doesn't crowd the agent's skill list even next to other skills.

### Post-edit check

Installed as a Claude Code or Codex plugin, suta runs layout and motion checks on a file every time the agent edits it. It runs as a hook, which is a command a tool runs automatically at a given moment.

| Result | What goes back to the agent |
|---|---|
| error: text under 11px, layout-property animation, `transition: all`, missing reduced-motion | The list and how to fix each, sent back so the agent fixes it on the spot |
| warn: nested cards, effect overuse, off-scale spacing and more | A notice of up to 5 lines. Whether to fix it is a judgement call against the principles |
| Clean, or not a checked file | Nothing |

- Only the lines this edit changed count. Problems that were already in the file never stop the agent. When something else is being reported, one extra line notes "N existing errors unrelated to this edit". A newly created file is checked in full.
- Checked files are CSS, SCSS, Less, TSX, JSX, Vue, Svelte and HTML (layout and motion) and TS/JS (motion). `node_modules`, build folders and test files are skipped.
- In React Native and Expo apps, the audit also reads `StyleSheet.create` values (font size, spacing, radius, color) and Reanimated animations (layout properties, infinite loops, durations). [Porting to React Native](../skills/suta/patterns/layout-principles/references/react-native.md) (Korean) explains how to carry the web patterns over.
- Mark an intended exception with a comment above the line that gives the reason (`/* layout-audit-ignore: tiny-text — chart axis ticks */`).
- To turn it off, set the environment variable `SUTA_HOOK=off`. It needs Node 22.18 or later. On older versions it passes without checking. It never blocks an edit.

## 57 patterns

Each name links to the pattern's manual, which is written in Korean. The demo link on the right opens the working screen.

### Appearing and disappearing

| Pattern | What it does | Demo |
|---|---|---|
| [Enter/exit animation](../skills/suta/patterns/enter-exit/PATTERN.md) | CSS animations when an element appears or disappears | [Demo](https://guksu.github.io/suta/#/enter-exit) |
| [Scroll reveal](../skills/suta/patterns/scroll-reveal/PATTERN.md) | Content appears in sequence as you scroll | [Demo](https://guksu.github.io/suta/#/scroll-reveal) |
| [Sticky header transition](../skills/suta/patterns/sticky-header/PATTERN.md) | When the large title scrolls away, the fixed header shows a small title | [Demo](https://guksu.github.io/suta/#/sticky-header) |
| [List reorder (FLIP)](../skills/suta/patterns/flip-list/PATTERN.md) | Items move smoothly when the list order changes | [Demo](https://guksu.github.io/suta/#/flip-list) |
| [Zoom lightbox](../skills/suta/patterns/zoom-lightbox/PATTERN.md) | Opens by scaling from the thumbnail position to the center of the screen | [Demo](https://guksu.github.io/suta/#/zoom-lightbox) |
| [Modal dialog](../skills/suta/patterns/modal-dialog/PATTERN.md) | Open and close on the native `<dialog>`, with Esc key and focus handling | [Demo](https://guksu.github.io/suta/#/modal-dialog) |
| [Spring physics motion](../skills/suta/patterns/spring-physics/PATTERN.md) | Motion that carries drag velocity and settles like a spring | [Demo](https://guksu.github.io/suta/#/spring-physics) |
| [Dark mode toggle](../skills/suta/patterns/theme-toggle/PATTERN.md) | Circular theme transition from the press point, saves the choice and follows the device setting | [Demo](https://guksu.github.io/suta/#/theme-toggle) |
| [Stretchy image header](../skills/suta/patterns/stretchy-header/PATTERN.md) | Large image header scrolls at a slower rate and darkens, and stretches then snaps back when pulled at the top | [Demo](https://guksu.github.io/suta/#/stretchy-header) |
| [Card expand](../skills/suta/patterns/card-expand/PATTERN.md) | Shared-element transition: the pressed card grows in place into a detail screen and shrinks back on close | [Demo](https://guksu.github.io/suta/#/card-expand) |
| [Card stack](../skills/suta/patterns/card-stack/PATTERN.md) | Stacked cards fan out vertically on press; the chosen card moves to the top and the rest fold beneath it | [Demo](https://guksu.github.io/suta/#/card-stack) |

### While waiting

| Pattern | What it does | Demo |
|---|---|---|
| [Skeleton shimmer](../skills/suta/patterns/skeleton/PATTERN.md) | Placeholder bones with a shimmer that hold the content area while loading | [Demo](https://guksu.github.io/suta/#/skeleton) |
| [Count-up numbers](../skills/suta/patterns/count-up/PATTERN.md) | Balances, points and other numbers step toward a target value | [Demo](https://guksu.github.io/suta/#/count-up) |
| [Story progress](../skills/suta/patterns/story-progress/PATTERN.md) | Story progress bars, long-press to pause, tap to move | [Demo](https://guksu.github.io/suta/#/story-progress) |
| [Loading button](../skills/suta/patterns/loading-button/PATTERN.md) | Shows sending and done states and prevents duplicate submits | [Demo](https://guksu.github.io/suta/#/loading-button) |
| [Infinite scroll](../skills/suta/patterns/infinite-scroll/PATTERN.md) | Loads the next page before the end of the list and prevents duplicate items | [Demo](https://guksu.github.io/suta/#/infinite-scroll) |
| [Virtual list](../skills/suta/patterns/virtual-list/PATTERN.md) | Renders mainly the visible items to handle long lists | [Demo](https://guksu.github.io/suta/#/virtual-list) |
| [Progress ring](../skills/suta/patterns/progress-ring/PATTERN.md) | SVG circle fills by value; three nested rings, over-target display, indeterminate loading | [Demo](https://guksu.github.io/suta/#/progress-ring) |

### Responding to presses

| Pattern | What it does | Demo |
|---|---|---|
| [Press feedback](../skills/suta/patterns/press-feedback/PATTERN.md) | Shrinks on press and restores on release | [Demo](https://guksu.github.io/suta/#/press-feedback) |
| [Toast stack](../skills/suta/patterns/toast-stack/PATTERN.md) | Stacks multiple notifications at the bottom or top banner position and closes each after its own duration | [Demo](https://guksu.github.io/suta/#/toast-stack) |
| [Like pop](../skills/suta/patterns/like-pop/PATTERN.md) | Pop effect on heart click or photo double-tap | [Demo](https://guksu.github.io/suta/#/like-pop) |
| [Celebration overlay](../skills/suta/patterns/celebration/PATTERN.md) | A one-time celebration over the current screen when a goal or badge is reached | [Demo](https://guksu.github.io/suta/#/celebration) |
| [Cart fly](../skills/suta/patterns/cart-fly/PATTERN.md) | Product flies into the cart icon | [Demo](https://guksu.github.io/suta/#/cart-fly) |
| [Tooltip](../skills/suta/patterns/tooltip/PATTERN.md) | Shows on mouse or keyboard input and positions by available space | [Demo](https://guksu.github.io/suta/#/tooltip) |
| [Form shake error](../skills/suta/patterns/form-shake-error/PATTERN.md) | Shakes fields with input errors and shows the error message | [Demo](https://guksu.github.io/suta/#/form-shake-error) |

### Navigation

| Pattern | What it does | Demo |
|---|---|---|
| [Tab indicator slide](../skills/suta/patterns/tab-indicator/PATTERN.md) | Underline slides smoothly to the selected tab | [Demo](https://guksu.github.io/suta/#/tab-indicator) |
| [Snap carousel](../skills/suta/patterns/carousel/PATTERN.md) | Slider that snaps to card boundaries when swiped sideways | [Demo](https://guksu.github.io/suta/#/carousel) |
| [Hamburger menu](../skills/suta/patterns/hamburger-menu/PATTERN.md) | Morphs the menu icon into a close icon and shows the panel | [Demo](https://guksu.github.io/suta/#/hamburger-menu) |
| [Page transition](../skills/suta/patterns/page-transition/PATTERN.md) | Keeps the header and tab bar while transitioning screens in the direction of navigation | [Demo](https://guksu.github.io/suta/#/page-transition) |
| [Dropdown menu](../skills/suta/patterns/dropdown-menu/PATTERN.md) | Action menu that repositions to fit the space and moves with arrow keys and first-letter typing | [Demo](https://guksu.github.io/suta/#/dropdown-menu) |
| [Scroll-aware glass nav](../skills/suta/patterns/glass-nav/PATTERN.md) | Transparent at the top, glass once scrolled; hides on scroll down and returns on scroll up, or collapses into a single pill. Links scroll to their section and the active pill follows | [Demo](https://guksu.github.io/suta/#/glass-nav) |
| [Bottom tab bar](../skills/suta/patterns/bottom-nav/PATTERN.md) | Fixed bottom navigation for 4–5 top-level screens: count badges and dots, hidden on detail screens and while typing, clear of the home indicator | [Demo](https://guksu.github.io/suta/#/bottom-nav) |

### Touch gestures (mobile)

| Pattern | What it does | Demo |
|---|---|---|
| [Bottom sheet](../skills/suta/patterns/bottom-sheet/PATTERN.md) | Opens a sheet from the bottom; drag to resize or close | [Demo](https://guksu.github.io/suta/#/bottom-sheet) |
| [Pull to refresh](../skills/suta/patterns/pull-to-refresh/PATTERN.md) | Pull the top of the list to refresh, with resistance | [Demo](https://guksu.github.io/suta/#/pull-to-refresh) |
| [Swipe to delete](../skills/suta/patterns/swipe-to-delete/PATTERN.md) | Swipe sideways to reveal action buttons (a single delete, or several: archive, later, delete); swiping all the way runs the last action | [Demo](https://guksu.github.io/suta/#/swipe-to-delete) |
| [Feed pinch zoom](../skills/suta/patterns/pinch-zoom/PATTERN.md) | Two-finger zoom on a photo, restores on release | [Demo](https://guksu.github.io/suta/#/pinch-zoom) |
| [Swipe-dismiss viewer](../skills/suta/patterns/swipe-dismiss-viewer/PATTERN.md) | Drag a photo down to shrink and close it, returning to its original position | [Demo](https://guksu.github.io/suta/#/swipe-dismiss-viewer) |
| [Drag to reorder](../skills/suta/patterns/drag-to-reorder/PATTERN.md) | Reorder a list by drag or arrow keys | [Demo](https://guksu.github.io/suta/#/drag-to-reorder) |
| [Long-press menu](../skills/suta/patterns/long-press-menu/PATTERN.md) | Long-press or right-click lifts the item, blurs the background and shows an action menu beside it | [Demo](https://guksu.github.io/suta/#/long-press-menu) |
| [Edge swipe back](../skills/suta/patterns/edge-swipe-back/PATTERN.md) | Drag from the left edge to pull in the previous screen; on release, distance and velocity decide whether to go back | [Demo](https://guksu.github.io/suta/#/edge-swipe-back) |

### Input controls

| Pattern | What it does | Demo |
|---|---|---|
| [Custom select](../skills/suta/patterns/select/PATTERN.md) | Dropdown with keyboard control and screen reader support | [Demo](https://guksu.github.io/suta/#/select) |
| [Accordion](../skills/suta/patterns/accordion/PATTERN.md) | Expand and collapse content with a CSS height transition | [Demo](https://guksu.github.io/suta/#/accordion) |
| [Toggle switch](../skills/suta/patterns/switch/PATTERN.md) | On/off switch built on a native checkbox | [Demo](https://guksu.github.io/suta/#/switch) |
| [Floating label input](../skills/suta/patterns/floating-label/PATTERN.md) | Moves the placeholder text to a top label based on input state | [Demo](https://guksu.github.io/suta/#/floating-label) |
| [Checkbox · Radio](../skills/suta/patterns/checkbox-radio/PATTERN.md) | Animates the check mark and radio dot to match the selected state | [Demo](https://guksu.github.io/suta/#/checkbox-radio) |
| [OTP input](../skills/suta/patterns/otp-input/PATTERN.md) | Moves between cells on type and delete, supports pasting a code | [Demo](https://guksu.github.io/suta/#/otp-input) |
| [Segmented control](../skills/suta/patterns/segmented-control/PATTERN.md) | Pill background slides behind the selected segment, built on a native radio group | [Demo](https://guksu.github.io/suta/#/segmented-control) |
| [Wheel picker](../skills/suta/patterns/wheel-picker/PATTERN.md) | Drum picker that scrolls vertically and snaps to the center cell, with 3D tilt, click and keyboard | [Demo](https://guksu.github.io/suta/#/wheel-picker) |
| [Search suggestions](../skills/suta/patterns/search-suggest/PATTERN.md) | Searches when typing pauses and keeps stale responses from overwriting the latest results | [Demo](https://guksu.github.io/suta/#/search-suggest) |
| [Range slider](../skills/suta/patterns/range-slider/PATTERN.md) | Range input with two handles for minimum and maximum | [Demo](https://guksu.github.io/suta/#/range-slider) |
| [Quantity stepper](../skills/suta/patterns/quantity-stepper/PATTERN.md) | Adjust quantity with buttons, long-press to accelerate, switches to delete at the minimum | [Demo](https://guksu.github.io/suta/#/quantity-stepper) |
| [File upload](../skills/suta/patterns/file-upload/PATTERN.md) | File drop, preview and progress display, rejection reasons | [Demo](https://guksu.github.io/suta/#/file-upload) |

### Surfaces and style

| Pattern | What it does | Demo |
|---|---|---|
| [Glassmorphism surface](../skills/suta/patterns/glass-surface/PATTERN.md) | Translucent card, nav bar or modal with a blurred backdrop; falls back to an opaque surface when blur is unsupported | [Demo](https://guksu.github.io/suta/#/glass-surface) |

### Principles and review

| Pattern | What it does | Demo |
|---|---|---|
| [Motion principles & tokens](../skills/suta/patterns/motion-principles/PATTERN.md) | One token set of 5 durations, 5 easings, stagger and reduced-motion, plus rules for which value each kind of movement uses | [Demo](https://guksu.github.io/suta/#/motion-principles) |
| [Motion audit](../skills/suta/patterns/motion-audit/PATTERN.md) | Scans CSS and JS for layout-property animations, missing reduced-motion, out-of-range durations and more, reports them as `file:line` and points to the pattern that fixes each | [Demo](https://guksu.github.io/suta/#/motion-audit) |
| [Layout principles & tokens](../skills/suta/patterns/layout-principles/PATTERN.md) | Layout principles, conventions per screen type and one token set for spacing, type, weight, radius and color (contents listed below the table) | [Demo](https://guksu.github.io/suta/#/layout-principles) |
| [Layout audit](../skills/suta/patterns/layout-audit/PATTERN.md) | Scans CSS, JSX and HTML for nested cards, sub-11px text, effect overuse, off-scale spacing, centered paragraphs, pastel tinted surfaces, too many hue families, emoji used as icons, mobile-webview pitfalls (100vh, input zoom, disabled zoom) and more, reports them as `file:line` with the principle that fixes each | [Demo](https://guksu.github.io/suta/#/layout-audit) |

The layout principles pattern contains these parts.

- 12 principles for order, hierarchy, grouping, alignment and emphasis.
- Conventions for 17 screen types, including AI chat, shopping apps, stock trading and gamification, plus conventions for bottom tab bars and mobile webviews.
- One set of line icons.
- Guidance on type, color and surfaces: neutrals, one accent and an error red, plus a separate rise/fall pair for market data and gold, silver and bronze for reward graphics.
- One token set for spacing, type, weight, radius and color.
- Before and after versions of nine typical AI-made screens.

## Layout

```text
skills/suta/                         The skill that gets installed
├─ SKILL.md                         Workflow · AI-slop rules · layout and motion values · pattern catalog
├─ scripts/
│  ├─ audit.mjs                     Combined audit: layout and motion rules in one pass
│  └─ post-edit-hook.mjs            Post-edit check hook (Claude Code and Codex plugins)
└─ patterns/bottom-sheet/
   ├─ PATTERN.md                    When to use · why it's built this way · usage · options · caveats
   └─ assets/
      ├─ createSheetDrag.ts         Framework-independent drag logic
      ├─ bottom-sheet.css           Motion and state definitions
      └─ BottomSheet.tsx            React component
```

Pattern code can be copied one pattern at a time. Logic shared by several patterns is included in each as the same file, and the repository's check script verifies that the copies match their source.

## Repository structure

```text
suta/
├─ skills/suta/                     The installed skill: SKILL.md + combined audit (scripts/) + 57 patterns (patterns/)
├─ .claude-plugin/                  Claude Code marketplace and plugin info (the repo root is the plugin, with the post-edit check hook)
├─ .codex-plugin/                   Codex plugin info (skill + post-edit check hook)
├─ .agents/plugins/                 Codex marketplace info
├─ AGENTS.md                        Working instructions for every coding agent (single source)
├─ CLAUDE.md                        Claude Code supplement (imports AGENTS.md)
├─ .agents/skills/add-skill/        Pattern-adding procedure (for maintainers, hidden from normal installs)
├─ demo/                            Vite + React demo site
├─ evals/                           Selection evals: trigger (trigger.json) and patterns (selection/), publishing benchmark (benchmark/)
├─ scripts/                         Checks · selection eval · catalog generation · benchmark (benchmark/) · install script
└─ docs/                            Design · plans · work logs · rules
```

## Development

### Running the demo

```bash
npm install
npm run dev
```

Open the [local demo](http://localhost:5173/suta/) in a browser. To check on a phone on the same network, run `npm run dev -- -- --host`.

### Verification

| Command | What it checks |
|---|---|
| `npm test` | Vitest + jsdom tests |
| `npm run lint` | Code lint |
| `npm run build` | Production build |
| `npm run catalog` | Rebuilds the entry skill's pattern catalog from each `PATTERN.md` and the demo list |
| `node scripts/validateSkills.mjs` | Entry skill and pattern structure, catalog sync, shared-code matches, README badge numbers |
| `node scripts/evalSelection.mjs` | Selection eval: whether UI requests trigger suta (`evals/trigger.json`) and requests pick the right pattern (`evals/selection/`) |
| `npm run validate` | Both checks above plus the combined layout and motion audit (errors only) in one go |

When changes land on `main`, the demo deploys to GitHub Pages automatically.

## Contributing

The pattern documents and code are the source of truth. The demo imports `assets/` directly and never copies code.

If you work with a coding agent, [`AGENTS.md`](../AGENTS.md) (Korean) holds the shared instructions. Claude Code, Codex, Cursor, Gemini CLI and Copilot all read the same rules and the same pattern-adding procedure (`.agents/skills/add-skill/`).

### Adding a pattern

1. Write the selection eval first. In `evals/selection/{name}.json`, list 3 requests that should pick this pattern and 3 neighboring requests that shouldn't.
2. Write the manual at `skills/suta/patterns/{name}/PATTERN.md`. `name` matches the folder name. `description` states in the third person only what the pattern does and when to use it (80–300 characters). Its first sentence becomes the one-line summary in the catalog. The body follows the order: when to use → why it's built this way → usage (React / plain JS) → options → caveats.
3. Add the implementation in `assets/`: CSS and framework-independent logic. Write tests for the logic first, and respect the reduced-motion setting.
4. Register the demo. In `demo/src/demos/{name}/`, import from `@skills/{name}/assets/...`, then register it in `demo/src/demos/index.ts`.
5. Run `npm run catalog` to rebuild the entry skill's pattern catalog.
6. Run build, lint, tests, structure checks and the selection eval (`npm run validate`). Then check the behavior in a browser and review the motion's speed, easing and accessibility settings.

Add a row to the pattern table in this guide and in the Korean one (`guide.md`). When the number of patterns or tests changes, update the README badges too, or the structure check fails.

### Related documents

- [Publishing benchmark](benchmark.en.md): plain Claude Code vs Claude Code with suta
- [Agent working instructions](../AGENTS.md) (Korean)
- [Working rules](harness-rules.md) (Korean)
- [Repository design](design/2026-08-19-fe-skills.md) (Korean)
- [Planned patterns and work plan](plans/) (Korean)
