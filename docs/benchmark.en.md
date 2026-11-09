# Publishing benchmark: plain Claude Code vs suta

We gave the same requests, word for word, to two Claude Code setups and measured the resulting pages in a real browser.

- Plain: Claude Code with nothing installed.
- suta: Claude Code with only the suta plugin installed (entry skill and post-edit check hook).

Model, settings and tool permissions are identical. The only difference is the plugin.

The latest results (round 2) were measured with suta 0.6.0. The current version is 0.8.0, and the benchmark has not been re-run on it.

한국어: [benchmark.md](benchmark.md)

## Round 2: after the type, color and surface update (2026-10-07 · 16 pages per condition)

In round 1 the judges called suta's pages "clean but plain". We then re-analyzed the references for type, color and surfaces, and updated the skill from that analysis ([`research/2026-10-07-tone.md`](research/2026-10-07-tone.md), Korean). The references were 1,104 screens from 31 Korean apps, 19 websites and a set of design-feedback cases. The 1,104 screens are what remained of 1,116 collected after 12 that were not app screens were excluded. Only the suta side was re-run, with the updated skill (version 0.6.0).

- The plain side reuses the round 1 output. Prompts, model and settings are the same.
- The four requests with no brand or industry cue (login, dashboard, landing, cart) were run once more after adding the rule "with no cue, use the near-black default". The other four are from before that rule, which does not apply to them.

### At a glance

- The judgments moved toward suta. Scores are written suta : plain. The default judge model went from 7 : 25 to 11 : 21. The other judge model went from 14 : 18 to 19 : 13, so it now picks suta more often than plain.
- The tone metrics moved toward the references.
  - Size of the most-used text: 14 → 16px (references: 16).
  - Neutral surfaces besides the page background: 0 → 1 (references: 1–2).
  - Pages whose primary button is blue, indigo or violet: 8 → 0 of 16 (plain: 10 of 16).
- The defect metrics stayed at round 1 levels. Overflow, tiny text, small touch targets and strong effects are zero. One nested box appeared.
- Accessibility violations rose from 4 in round 1 to 13 (plain: 87). Almost all are `label-content-name-mismatch`, an `aria-label` that differs from the visible text. They are concentrated on one search-results page.
- The cost is about the same as round 1. The median time per page was 103 seconds (round 1: 96), and input tokens were 4.4× the plain side's.

![Pages built from the same request. In each pair, plain is on the left and suta round 2 on the right. These are the first three requests in order (run 1)](assets/benchmark-compare.jpg)

### Tone metrics

The reference websites (mobile 390px, 14 sites) were measured with the same script. Each reference value is the median, with the lower and upper quartiles in parentheses.

| Tone metric | Reference websites | Plain | suta round 1 | suta round 2 |
|---|---|---|---|---|
| Size of the most-used text (px, median) | 16 (13–16) | 13 | 14 | 16 |
| Share of text under 15px (%, median) | 59 (14–82) | 61.5 | 62.5 | 35.5 |
| Neutral surfaces besides the page background (median) | 2 (1–2) | 1 | 0 | 1 |
| Share of text in an accent color (%, median) | 0.5 (0–6.4) | 6.5 | 0 | 2.6 |
| Pages whose primary button is blue, indigo or violet | — | 10/16 | 8/16 | 0/16 |

- The amount of small text is not the target. The reference mobile sites also have more than half their text under 15px (median 59%). The target is the size of the body text, measured as the most-used text size.
- On the four no-cue requests, suta used near-black primary buttons, except on the landing page. There it chose a forest green, citing the character of the service ("organize your day calmly").

### Defect metrics

| Metric (16 pages, lower is better) | Plain | suta round 1 | suta round 2 |
|---|---|---|---|
| Pages that scroll sideways at 320px | 2/16 | 0/16 | 0/16 |
| Pages with text under 12px | 4/16 | 0/16 | 0/16 |
| Touch targets under 24px (total) | 27 | 0 | 0 |
| Boxes nested in boxes (total) | 41 | 0 | 1 |
| Gradients, blurs, large shadows (total) | 47 | 0 | 0 |
| Distinct font sizes (per page) | 8.1 | 4.1 | 4.1 |
| Accessibility violations (axe, total) | 87 | 4 | 13 |
| Card-like boxes (total) † | 126 | 27 | 29 |

† Descriptive only. More or fewer card-like boxes is not better or worse by itself.

### Judgment results

| Request | Default judge model (suta : plain) | Other judge model (suta : plain) |
|---|---|---|
| Detail `menu-detail` | 0 : 4 | 1 : 3 |
| Login `login` | 1 : 3 | 3 : 1 |
| Settings `settings` | 2 : 2 | 2 : 2 |
| Dashboard `dashboard` | 2 : 2 | 2 : 2 |
| Landing `landing` | 2 : 2 | 4 : 0 |
| Cart `cart` | 0 : 4 | 0 : 4 |
| Search results `search-results` | 1 : 3 | 3 : 1 |
| Bottom sheet `option-sheet` | 3 : 1 | 4 : 0 |
| **Total** | **11 : 21** (round 1: 7 : 25) | **19 : 13** (round 1: 14 : 18) |

Each pair was judged twice with the order swapped. Both orders picked the same side for 13 of the 16 pairs with each judge model. For the default judge model those 13 were plain 9 and suta 4. For the other judge model they were suta 8 and plain 5.

### Why the judges chose, and what is left

Reasons the judges gave for picking suta:

- Settings: clear sections and alignment, with account deletion set apart as a low-key link.
- Login: only the primary button is strong, and the social login buttons are clean, with the brand color of Kakao (a Korean messaging service).
- Landing: restrained hierarchy and consistent left alignment.
- Search results: a clear hierarchy of name, then rating, then distance and opening status.

Reasons the judges gave for picking plain. These are the next candidates for improvement.

- Photo placeholders (cart, search results, detail). suta used gray tiles with line icons and was called "wireframe-like". The plain side used emoji and illustrations. When a request does not allow image files, placeholders need to look more like photos (simple drawings with some color).
- A cart defect. One page from run 2 showed the empty-state message while the cart had items.
- Long values. In settings, an email address wrapped mid-word. It needs truncation.
- Link size. The judges still called the login page's "forgot password" and "sign up" links small and weak.

## Round 1 (history, 2026-10-07 · 16 pages per condition)

### At a glance

- suta's pages had far fewer defects.
  - Accessibility violations (axe) across the 16 pages fell from 87 to 4. 81 of the plain side's 87 were insufficient text contrast.
  - Boxes nested in boxes (41 → 0), gradients, blurs and large shadows (47 → 0) and touch targets under 24px (27 → 0) all went to zero.
  - Pages with text under 12px (4 → 0) and pages that scroll sideways at 320px (2 → 0) also went to zero.
  - Distinct font sizes per page halved, from 8.1 to 4.1.
- Some things did not differ. Neither side used `transition: all`. On the plain side, 14 of the 15 pages with motion already supported reduced motion.
- In the blind judgment, both judge models picked the plain side more often. Out of 32 judgments, the default judge model chose plain 25 times and the other judge model 18 times.
  - The most common reason suta lost was "clean but plain" (see [Why the judges chose](#why-the-judges-chose) below).
  - suta won when the plain page had a visible defect, such as a broken bar chart or a headline split mid-word (dashboard, landing).
- It cost more.
  - Time per page went from a median of 61 to 96 seconds.
  - Input tokens were 4.3× and output tokens 1.5×, because the agent reads the skill and pattern docs and runs the checks.

### All metrics

| Metric (lower is better) | Plain Claude Code | With suta |
|---|---|---|
| Pages that scroll sideways at 320px | 2/16 | 0/16 |
| Pages where a fixed bottom bar still covers content at the end | 0/16 | 0/16 |
| Pages with text under 12px | 4/16 | 0/16 |
| Touch targets under 24px (16-page total) | 27 | 0 |
| Boxes nested in boxes (16-page total) | 41 | 0 |
| Gradients, blurs, large shadows (16-page total) | 47 | 0 |
| Distinct font sizes (per page) | 8.1 | 4.1 |
| Centered multi-line paragraphs (16-page total) | 3 | 0 |
| Pages using `transition: all` | 0/16 | 0/16 |
| Pages animating width, height, position or margins directly | 1/16 | 0/16 |
| Pages with motion but no reduced-motion support | 1/16 | 0/16 |
| Accessibility violations (axe, 16-page total) | 87 (87 serious) | 4 (4 serious) |
| suta audit errors · warnings (per page) ※ | 0.1 · 5.9 | 0 · 0.1 |
| Card-like boxes (16-page total) † | 126 | 27 |
| Pages opening height via grid tracks (`grid-template-rows`) † | 0/16 | 5/16 |

※ suta's own standard, shown for reference only.

† More or fewer is not better or worse by itself (descriptive).
- Card-like boxes show a difference in how content is grouped.
- The grid-track technique is what suta recommends instead of animating height. It still recalculates layout every frame, just like animating height. The one plain-side case animated `width` and `max-height` directly.

### Judgment results

| Request | Default judge model (suta : plain) | Other judge model (suta : plain) |
|---|---|---|
| Detail `menu-detail` | 2 : 2 | 2 : 2 |
| Login `login` | 0 : 4 | 0 : 4 |
| Settings `settings` | 0 : 4 | 0 : 4 |
| Dashboard `dashboard` | 2 : 2 | 4 : 0 |
| Landing `landing` | 1 : 3 | 4 : 0 |
| Cart `cart` | 0 : 4 | 0 : 4 |
| Search results `search-results` | 0 : 4 | 2 : 2 |
| Bottom sheet `option-sheet` | 2 : 2 | 2 : 2 |
| **Total** | **7 : 25** | **14 : 18** |

Each pair was judged twice with the order swapped, so there are 4 judgments per request (2 runs × 2 orders). Both orders picked the same side for 15 of the 16 pairs with the default judge model (plain 12, suta 3) and for 14 pairs with the other judge model (plain 8, suta 6).

### Why the judges chose

The judges gave a one-sentence reason with each pick. These were the common ones.

Reasons for choosing plain:

- The settings page grouped sections in cards on a gray background, so the areas were distinct. suta divided them with lines only, which a judge called "flat".
- Social login buttons had brand colors and icons. suta's were identical white buttons.
- Links such as "forgot password" were blue and looked like links. suta's were gray text.
- More features, such as select-all and delete-selected in the cart.
- On desktop, the mobile column sat in a centered frame on a gray background. suta left a narrow column alone on white.

Reasons for choosing suta:

- The plain page had finishing defects: a bar chart that did not draw, wrapped axis labels, a headline split mid-word, a section title running into a card border, bullets hanging outside the margin.
- suta's left alignment and spacing were consistent, and the key figure was the largest element.

### Skill usage

- All 16 suta runs read the skill. The requests never mentioned suta.
- The most-read patterns were `layout-principles` and `motion-principles` (13 runs each), `quantity-stepper` (6) and `toast-stack` (4).
- The post-edit hook returned warnings 6 times and never blocked on an error.
- No tool call was denied for permissions in either condition.

### Interpretation: what suta should fix (addressed in round 2)

Reducing defects (accessibility, narrow screens, small text, nested boxes, effect overuse) worked as intended. Most losses in the judgment came from taking things out too far. These were the candidates for the next improvement.

- Screens with many groups, such as settings, conventionally use inset grouped lists on a gray background. Make them an exception to "boxes are the last resort".
- Buttons with brand guidelines (social login) are an exception to "emphasis in one or two places".
- Links should look like links (color or underline).
- When a single mobile column sits on a wide screen, show its edges with a background and frame.
- Taking things out means decoration, not features.

## Method

### Eight requests

One per screen type, written the way people usually ask (in Korean). The full text is in [`evals/benchmark/prompts.json`](../evals/benchmark/prompts.json).

| id | Screen type | Request (summary) |
|---|---|---|
| `menu-detail` | Detail | Cafe app menu detail: photo, name and price, size and shot options, quantity, add-to-cart button |
| `login` | Form | Login: email and password, three social logins, sign-up and password reset links, error state |
| `settings` | Settings | App settings: profile, notification toggles, language and theme, log out and delete account |
| `dashboard` | Dashboard | Seller dashboard: key metrics, recent orders, weekly sales bar chart, responsive |
| `landing` | Landing | Scheduling SaaS landing page: hero, three features, three pricing tiers, FAQ, footer |
| `cart` | Cart | Shopping cart: items (quantity, remove), coupon, payment summary, order button |
| `search-results` | List | Restaurant search results: search bar, filter chips, result list, empty state |
| `option-sheet` | Interaction | Option bottom sheet (drag to dismiss) and an added-to-cart toast, with natural animation |

Every request ends with the same sentence: "Make it a single index.html in the current folder, with CSS and JS inside, and no external libraries, CDNs or image files." This lets us measure every output under the same conditions.

### Runs

- Each request ran twice per condition (8 × 2 × 2 = 32 runs). Every run starts as a new session in an empty folder.
- Runs used `claude -p` (non-interactive). File writes were auto-approved inside the work folder, and all shell commands were allowed. This matches a person sitting next to the agent and approving each call. Non-interactive mode has nobody to approve, so anything not allowed is simply denied. Both conditions used the same settings.
- The suta condition loaded the plugin with `--plugin-dir`, in the same layout a marketplace install uses (manifest + `skills/`), and the plugin folder was made readable (`--add-dir`). The requests never mention suta, because whether the skill triggers on its own is part of what we measure.
- Tool calls denied for lack of permission were recorded for every run. A first attempt allowed only read-only shell commands, and the suta runs ended without being able to read the pattern docs or run the checker. All 32 runs were redone with the settings above.

### Measurements

Each output (`index.html`) was opened in Chromium and measured from rendered values. The measuring code is separate from suta's checker.

| Metric | How it is measured |
|---|---|
| Sideways scroll at 320px | Whether the document scrolls horizontally at 320px wide |
| Text cut off or spilling out of its box (from 2026-11) | At 390 and 1280px, whether text runs past the left or right edge of the box that clips it (`overflow-x: hidden`) or of the nearest box with a border or background. Ellipsis truncation, screen-reader-only text (`clip: rect(0 0 0 0)`, `clip-path: inset(50%)`) and text entirely outside its box (the next carousel slide) are excluded. The walk up the ancestors stops at scroll containers (either direction) and at `position: fixed` elements, since that text is scrolled into view or not clipped by its ancestors. The logic is in `scripts/lib/clipCheck.ts` |
| Table columns outside the first 390px screen (from 2026-11) | At 390px, in the row with the most visible cells among a table's first five rows, whether any cell extends past the visible width (the overlap of its sideways-scrolling box and the screen). A table left to scroll sideways keeps key columns off the first screen. The screen width is `clientWidth` (390): when a page overflows sideways, `innerWidth` in mobile emulation grows to the content width (fixed 2026-11-09) |
| Text under 12px | Computed font size of elements that hold text directly, at 390px |
| Touch targets under 24px | Links, buttons and inputs whose shorter side is under 24px (links inside sentences excluded; checkboxes and radios include their label) |
| Card-like boxes | Elements with rounded corners plus a border, a background different from their surroundings, or a shadow. Exclusions are listed below the table |
| Boxes nested in boxes | Card-like boxes sitting inside another card-like box |
| Gradients, blurs, large shadows | Elements with a large gradient background, `backdrop-filter`, a shadow blurred 16px or more, or gradient text |
| Distinct font sizes | Number of distinct computed sizes among visible text |
| Centered paragraphs | Text blocks of two or more lines that are center-aligned |
| `transition: all` | Whether any element has a computed `transition-property` of `all` with a non-zero duration |
| Layout animation | Whether any transition or `@keyframes` animates width, height, position or margins |
| Reduced-motion support | Whether a page with motion has a `prefers-reduced-motion` rule (CSS or script) |
| Accessibility violations | [axe-core](https://github.com/dequelabs/axe-core) 4.14 with the WCAG 2.0, 2.1 and 2.2 A and AA rules. Serious and critical impacts are counted separately |
| suta audit | suta's own layout and motion check (`skills/suta/scripts/audit.mjs`) on the same file. This is suta's own standard, so it is shown for reference only |
| Tone (from round 2) | Five metrics, described below the table |

Card-like boxes leave out buttons, inputs, images, anything smaller than 48×32px, circles and pills, and elements named as controls (avatars, chips, toggles, segments and so on). More or fewer card-like boxes is not better or worse by itself, so this metric is descriptive only.

The tone metrics look at text within the first six screen heights at 390px wide. Each piece of text is weighted by its character count, not counting spaces. The reference websites were measured the same way. The five metrics are:

- the size of the most-used text
- the share of text under 15px
- the share of text in an accent color (saturation 0.35 or more)
- the number of distinct wide neutral surfaces besides the page background
- the hue of the widest button filled with a saturated color

Only the initial state is measured. Parts that open on a tap, such as a bottom sheet, do not count toward the layout metrics. The motion metrics read computed styles and the whole stylesheet, so they do include closed elements.

### Blind judgment (reference)

For each request and run, the two pages' screenshots (full mobile page at 390px, first desktop screen at 1280px) were shown only as A and B, and a judge picked one. The judge could also answer "tie", which counts as half a point for each side. Neither round had any ties.

- The judge is a fresh Claude Code session without the plugin. Each pair was judged once by the same model that built the pages (the default judge model) and once by a different model (the other judge model).
- The criterion was "the one an experienced product designer would approve to ship as is". The judge was not told suta's rules.
- In the full mobile-page capture, fixed elements (top bars, bottom button bars) were moved to where they appear at the start or end of scrolling. Captured as is, a bottom bar lands in the middle of the page and looks like it covers content. The first judgment used captures with this problem, so it was redone after the fix. From round 2, bottom `position: sticky` bars have the same problem and are returned to their place in the document flow.
- Each pair was judged twice with the order swapped, to cancel out any bias toward whichever comes first.
- This is a model's judgment, not a human evaluation.

## Limitations

- The sample is small, at 8 requests × 2 runs per condition. Small differences may be chance. Every run's values are in [`evals/benchmark/results.json`](../evals/benchmark/results.json) (round 2) and [`results-r1.json`](../evals/benchmark/results-r1.json) (round 1).
- Round 2 re-ran only the suta side. The plain side is round 1 output. The pages for the four no-cue requests were made after one more rule was added, so the 16 suta pages were not all made by exactly the same skill.
- Round 2 used suta 0.6.0. The skill has changed since then (current version 0.8.0), and these numbers have not been measured on it.
- One model and one setting were used. Results may differ with other models or thinking levels.
- Some metrics overlap with what suta prevents (nested boxes, `transition: all` and so on). In other words, they measure suta's claimed effect with code independent of suta's checker. Accessibility (axe) is a third-party standard.
- Only the initial state is measured. Screens after interaction and actual behavior (for example, whether drag-to-dismiss follows the finger) are not.
- The judgment reflects a model's taste. The default judge model is the model that built the pages, so it may favor what it usually produces. That is why the other judge model judged as well. In round 2 the two disagree: out of 32 judgments, the default judge model picked suta 11 times and the other judge model 19 times. In round 1 they picked plain 25 and 18 times. No human designer evaluated the pages.
- The judge sees only the first desktop screen, so some "the bottom bar covers the last row" complaints disappear once you scroll. The metric measured at the end of scrolling is 0 in both conditions.
- Every output is a single HTML file, which differs from real projects (React and so on). The format was fixed so both conditions are compared on equal terms.

## Re-running

This calls the claude CLI 32 times, so it takes time and usage (about 30 minutes at 4 at a time).

```bash
npm i --no-save playwright axe-core && npx playwright install chromium
node scripts/benchmark/run.mjs --out ../suta-bench --repeats 2 --concurrency 4   # runs (re-run the same command to resume)
node scripts/benchmark/measure.mjs --out ../suta-bench                          # measure
node scripts/benchmark/judge.mjs --out ../suta-bench                            # blind judgment (optional)
node scripts/benchmark/report.mjs --out ../suta-bench                           # aggregate → evals/benchmark/results.json (--name changes the file name)
```

Use a short work path outside the repository. When a model mistypes a long path, the write lands outside the work folder, gets blocked, and the run ends without output.
