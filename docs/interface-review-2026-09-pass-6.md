# Interface review, sixth pass — what the device brings

> **Status:** all twelve findings are fixed — see "What shipped" and "Tested
> again" at the foot. The findings are kept as written. Two were overstated on
> inspection and are corrected where they stand (§5's dental row, §12's first
> sentence). The two follow-ons first left open — `share_target` and the
> `core-js` audit — are done too; what is left needs a real phone, and is listed
> under "Still to check on a device".

Companion to [`interface-review-2026-09-pass-5.md`](./interface-review-2026-09-pass-5.md).
The first five passes asked about the page: is it drawn right, readable, true,
usable over time, reachable. This one asks about what the **device** adds that
the page does not control:

- the **installed app** — manifest, `start_url`, orientation, offline;
- **large text** (the browser's default font size at 130%, 150% and 200%);
- the **on-screen keyboard**, and iOS Safari's zoom-on-focus;
- **touch**, where `title` tooltips and hover do not exist;
- the **Back button** while a sheet or palette is open;
- a **phone held sideways** (852 × 393), and a 2560 px desktop;
- a **cold first load** on a mid-range phone.

**Setup:** clean production build at `348d903`, served locally, driven through
`/demo` and through the real app with an empty database. Phone is 393 × 852 with
touch; desktop is 1440 × 900 and 2560 × 1440. Large text is the root font size
raised with a stylesheet, which is what the browser font-size setting does to a
`rem`-based app. The on-screen keyboard is simulated by shrinking the viewport to
393 × 460 after focusing a field.

---

## What came back clean

| Probe                                                 | Result                                 |
| ----------------------------------------------------- | -------------------------------------- |
| Horizontal overflow at 200% text, 7 routes            | **0**                                  |
| Text size 130% and 150%                               | layout holds, tab bar intact           |
| Focused field hidden behind the tab bar (keyboard up) | **0** of 3 forms                       |
| Offline reload, visited and unvisited routes          | app shell loads, records render        |
| CPU cost of first paint, 4× throttled                 | ~1 s to first UI; long tasks 0.9–1.2 s |
| Content width at 2560 px                              | capped; no line runs across the screen |
| Console errors                                        | **0**                                  |

---

## 1. The front door is a 404 — fixed

Every way into the app without a path opens on **Page not found**:

| Arrival                                    | Was                                |
| ------------------------------------------ | ---------------------------------- |
| `/demo` — the public demo's entry          | "We could not find a page for `/`" |
| A new install, after **Skip Tutorial**     | "Page not found"                   |
| A returning user at `/`                    | "Page not found"                   |
| The installed app (`start_url: "."` → `/`) | "Page not found", on every launch  |

`2a93da4` replaced the catch-all `<Navigate to={Timeline}>` with `NotFoundPage`,
which was right for mistyped addresses — but the catch-all had also been the
only route matching `/`, and there is no index route. The demo's router uses
`/demo` as its basename, so `/demo` is `/` inside it and fell through too.

**Fixed:** an index route that redirects `/` to the timeline. Unknown paths
still 404. Verified: `/demo` and `/demo/` → `/demo/timeline`; Skip Tutorial →
`/timeline`; returning `/` → `/timeline`; `/nope` → Page not found.

This is the one that most wants a spec. `routes` is not exported from
`App.tsx`, so nothing can render it in a memory router; exporting it and adding
a three-line test for `/` would have caught the regression.

## 2. The installed app is locked to portrait

`manifest.json` sets `"orientation": "portrait"`. Installed on Android, Mere
cannot be turned sideways — on a phone, and on a tablet, where portrait-only
is a letterbox. This fails WCAG 1.3.4 (Orientation), which exists for people
whose device is mounted.

It also throws away the one fix pass 5 could not make: the clinical timeline's
49 lanes and the lab charts are exactly what a phone held sideways is for.

**Fix:** delete the line.

## 3. At 200% text the tab bar pushes "More" off the screen

| Root text size |                               "More" tab visible |
| -------------: | -----------------------------------------------: |
|           100% |                                             100% |
|           130% |                                             100% |
|           150% |                                             100% |
|           200% | **33%** — starts at x = 366 in a 393 px viewport |

Each tab is a fixed `w-24`; four of them are 384 px, and at 200% the labels no
longer fit, so the row grows past the edge and is clipped. "More" is the only
way to Utilities, Sources, Settings and search on a phone, so for someone who
needs large text those four destinations are gone. WCAG 1.4.4 (Resize text).

The page itself survives 200% with no sideways overflow; the demo welcome toast
becomes one word per line and covers most of the screen for its few seconds.

**Fix:** `flex-1 min-w-0` in place of `w-24`, and let the label wrap or shrink
below the icon rather than widen the tab.

## 4. Most text fields make iOS zoom the page

iOS Safari zooms in when a focused field's text is under 16 px, and does not
zoom back out. Measured on the phone:

| Surface                                                                            | Fields under 16 px               |
| ---------------------------------------------------------------------------------- | -------------------------------- |
| Sharing                                                                            | **16 / 16** — every field, 14 px |
| Every list's search box (Records, Labs, Medications, Vitals, Documents, Providers) | 1 / 1 each                       |
| Labs reference-range select                                                        | 1 / 1                            |
| Visit prep "Questions for visit"                                                   | 1 / 1                            |
| Settings and Sources passphrase, import mode                                       | 3 / 3                            |
| **Add record form**                                                                | **0** — uses `text-base`         |

So the one form that already gets it right is the proof that the others are
an oversight rather than a choice.

**Fix:** `text-base sm:text-sm` on inputs, selects and textareas — one shared
class, or a base-layer rule under `sm`. Not `maximum-scale=1`, which takes
pinch-zoom away from everyone.

## 5. On a phone, the wallet card still cuts the warning

Pass 5 fixed this for print. On screen, on the phone — the size of the thing
you would hand to someone in an emergency room — the card still reads:

> 1 capsule 1 time each day in the morning. D…

The whole instruction, "Do not crush or chew" included, is in the `title`
attribute. A tap does nothing; there is no hover on glass.

The same pattern hides smaller things elsewhere — information that only a mouse
can reach:

| Where                  | Hover-only text                                                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wallet card            | the full instruction, per medication                                                                                                                                       |
| Records hub (×8)       | why a category has no count                                                                                                                                                |
| Sources (×5)           | exact sync time ("November 14, 2023 at 3:39 AM")                                                                                                                           |
| ~~Dental chart (×32)~~ | ~~each tooth's FDI number~~ — **withdrawn:** the FDI number is printed under each tooth's own number; the probe read the `title` as extra because it adds the word "Tooth" |
| Settings               | what "Repair source links" does                                                                                                                                            |

**Fix:** for the wallet card, let the instruction wrap on screen (it is two
lines, not ten) or make the row expand on tap. For the rest, move the text into
the page or a disclosure; keep `title` only where it repeats something visible.

## 6. Back leaves the page under an open sheet

Open **More** on the phone from Labs, then press Back — the Android gesture,
or the browser button. The sheet closes, and the page behind it changes to the
previous route: you are now on Records, not Labs. The same happens to the
command palette on desktop (⌘K, then Back).

On Android, Back closing the thing on top is what every native sheet does, and
the installed app has no other Back.

**Fix:** push a history entry when an overlay opens and close it on `popstate`
— one hook shared by the More sheet, the command palette, `FormSheet` and
`Modal`. The add-record form is already a route, so Back already behaves there.

## 7. With the keyboard up, 40% of the screen is chrome

Simulated keyboard on Sharing (393 × 460 left above it): the sticky tool picker
and page title take the top 117 px, the tab bar the bottom 65 px. That leaves
278 px — five or six lines — to see the field you are typing in and what it
belongs to. The tab bar is useless while typing; nobody switches section
mid-word.

**Fix:** hide the tab bar while a text field has focus (or while
`visualViewport.height` is well under `innerHeight`), and let the tool header
scroll away on the phone. Worth confirming on a real device, where iOS and
Android resize differently.

## 8. The first visit is heavy on a phone network

| Asset                                                     |        Raw | Gzipped |
| --------------------------------------------------------- | ---------: | ------: |
| Entry chunk `index-*.js`                                  |    2.83 MB |  786 KB |
| Source Sans, two variable `.ttf`                          |    1.04 MB |  437 KB |
| CSS                                                       |     132 KB |   25 KB |
| **Precache, fetched in the background after first paint** | **6.0 MB** |       — |

The CPU side is fine (§ clean). The network side is not: about 1.25 MB
compressed has to arrive before anything paints, which is 6–7 s on a slow 4G
link, and then the service worker pulls 6 MB more on the same metered
connection. Over half of the font weight is the italic.

**Fix:** ship the fonts as subset `woff2` (typically a third of the `ttf`), and
consider loading the italic on demand. Then run a bundle visualiser over the
entry chunk: 2.8 MB for a shell whose routes are all lazy means something large
is imported eagerly.

## 9. Offline, the app changes typeface

Offline navigation works — visited and unvisited routes both load. But
`injectManifest` uses the default glob (`js`, `css`, `html`), so the two `.ttf`
files are never precached. Offline, every screen renders in the fallback system
font: different widths, different wrapping, the layout the earlier passes tuned
is not the one on screen.

**Fix:** add the font extension to `injectManifest.globPatterns` (and, after §8,
it is `woff2`).

## 10. The PWA head is half-configured

- **Two manifests.** `vite-plugin-pwa` injects its own `manifest.webmanifest`
  beside `manifest.json`: name `mere-medical`, theme `#42b883` (the Vue.js
  green), no icons. Chrome uses the first link, so today it is inert — until
  someone reorders the head. Set `manifest: false`, or move the real manifest
  into the plugin's config.
- **No `<meta name="theme-color">`.** Safari and iOS do not read it from the
  manifest, so the status bar is not Mere's blue.
- **No `apple-touch-icon`.** Added to an iPhone home screen, the icon is a
  screenshot of whatever page was open.

## 11. A phone held sideways gets the desktop

At 852 × 393 the `md` breakpoint (768 px, a width) applies, so a landscape phone
gets the 16rem rail and the tall dark page banner. On Medications the first
record starts at y ≈ 372 in a 393 px viewport: the whole first screen is title,
search and chips.

**Fix:** a height query — `@media (max-height: 500px)` — that collapses the rail
by default and shrinks the banner. Only worth doing after §2 makes landscape
possible in the installed app.

## 12. Desktop: files only go in through a picker

Thirteen file inputs (package import, document attachments, CSVs, profile
photo). ~~None accept a drop~~ — **corrected:** the visible ones on the
add-record form take a drop natively; the package imports on Sources, Settings
and the tutorial are hidden inputs behind buttons, and those do not. And a file
dropped anywhere else replaces the app with the file, taking any half-filled
form with it. On a desktop the natural move with an `.emrpkg`
or a PDF from a portal is to drag it onto the window.

Two larger follow-ons for the installed app: `file_handlers` in the manifest so
double-clicking an `.emrpkg` opens Mere, and `share_target` so "Share → Mere"
from an email attachment works on Android.

---

## Also noticed, not written up

- **Stray dark-mode classes.** The app is light-only, but eleven files carry
  `dark:` variants (spinners, the search icon), which Tailwind's default
  `media` strategy applies under OS dark mode. Harmless now; they will surprise
  whoever adds dark mode. Either remove them or set `darkMode: 'class'`.
- `html { overscroll-behavior-y: none }` removes pull-to-refresh. In the
  installed app there is no other reload gesture; probably intended, but worth
  a deliberate "sync" affordance if not already obvious.
- The iOS file picker judges `accept` by type, and `.emrpkg` is not a type it
  knows; `application/octet-stream` may or may not keep the file selectable.
  Needs a real iPhone.

## What this pass could not test

A headless Chromium is not a phone. These want a real device before anyone
signs them off: iOS zoom-on-focus itself (§4 measures its trigger), the real
keyboard's resize behaviour (§7), safe-area insets under a notch, the Android
back gesture in the installed app (§6), VoiceOver and TalkBack, and timings
against the production server with gzip on (§8's are computed from sizes).

## Suggested order

1. ~~The root 404 (§1)~~ — fixed; add the route spec.
2. Delete the portrait lock (§2). One line, WCAG AA.
3. The tab bar at 200% (§3). The only finding that makes whole sections
   unreachable.
4. 16 px fields on the phone (§4). One class.
5. The wallet card on screen (§5), then the other hover-only text.
6. Back closes overlays (§6). One hook, four components.
7. Fonts: `woff2`, subset, precached (§8, §9).
8. The PWA head (§10).
9. Then the ones that want a design decision: keyboard-up chrome (§7),
   landscape layout (§11), drag-and-drop and file handlers (§12).

---

## What shipped

| #   | Was                                                                                                    | Is                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `/demo`, the end of the tutorial, a returning `/` and the installed app all opened on "Page not found" | An index route sends `/` to the timeline. The shell's own routes — root, retired addresses, 404 — moved to `app/shellRoutes.tsx` so a spec can render them without booting the database                                                                                                                                                                                |
| 2   | `"orientation": "portrait"`                                                                            | Gone                                                                                                                                                                                                                                                                                                                                                                   |
| 3   | Four `w-24` tabs (rem-sized): at 200% text, 768px of tabs in a 393px bar, More two-thirds off-screen   | Tabs share the bar equally; labels stop growing at 18px (150%) so four words always fit. More fully on screen at 100–250%                                                                                                                                                                                                                                              |
| 4   | 14px fields on Sharing, every search box, passphrases                                                  | A coarse-pointer rule raises text fields to `max(1rem, 16px)`: 0 of 27 phone fields under 16px. Desktop keeps its 14px                                                                                                                                                                                                                                                 |
| 5   | Wallet card "…in the morning. D…", rest in a `title`; four other hover-only texts                      | The instruction is condensed, not clamped, and wraps. Sources prints the exact sync date; Settings' repair button has a visible hint; the Records hub drops a tooltip the blurb already covers. 0 hover-only texts on the probed pages                                                                                                                                 |
| 6   | Back with a sheet or palette open left the page underneath                                             | `useCloseOnBack` gives each open overlay its own history entry — More sheet, ⌘K palette, `Modal`, `FormSheet`, confirm dialogs, user switcher, notifications, comments, the phone package sheet. An overlay closing because its own link navigates says so (`closeForNavigation`) and navigates with `replace`, so Back from the destination is one step               |
| 7   | With the keyboard up, tab bar + tool picker + back bar took 40% of what was left                       | `useSoftKeyboardOpen` (a text field focused _and_ the viewport well under its tallest) marks the shell; the tab bar, Utilities tool picker and "All records" bar step aside on phone widths until the field blurs or the keyboard closes                                                                                                                               |
| 8   | 786 KB entry script + 1.04 MB TTF                                                                      | Entry 524 KB gzipped (−34%): `fhirpath` + ANTLR + UCUM swapped for a 30-line path walker checked against fhirpath on every path used; `console-feed` loaded only in developer mode; the record edit sheet fetched on first Edit; the whole-library `core-js/stable` import removed (below). Fonts are WOFF2 split Latin (51 KB) / extended, fetched by `unicode-range` |
| 9   | Offline in the system font                                                                             | All four WOFF2 files precached; offline screens render in Source Sans                                                                                                                                                                                                                                                                                                  |
| 10  | Second manifest in Vue green, no `theme-color`, no iPhone icon                                         | `manifest: false`; `theme-color`, `apple-touch-icon` (180px), `apple-mobile-web-app-title`, `color-scheme: light`                                                                                                                                                                                                                                                      |
| 11  | A sideways phone got the 16rem rail and a banner ending at y≈372 of 393                                | A `short:` screen (max-height 500px): the rail starts collapsed (expanding lasts the session and does not overwrite the desktop preference); the banner tightens and drops its description; chips scroll in one row. Banner ends at y≈225                                                                                                                              |
| 12  | Hidden import inputs took no drop; a stray drop replaced the app                                       | The window takes file drops: a `.emrpkg` goes to the same review a shared link gets, nothing imported until accepted; anything else is refused with a sentence. `file_handlers` in the manifest, read through `launchQueue`, "sends "Open with Mere" to the same review, and `share_target` does the same for "Share → Mere" on Android (below)                        |

Also: `darkMode: 'class'` makes the stray `dark:` classes inert.

### What the fixing turned up

**The rail never fitted a short window.** Checking §11 showed the desktop rail
is ~770px of items with no scrolling, clipped by the shell. On any window under
that — a 1280 × 600 laptop browser as much as a sideways phone — the profile
link, and at 393px Settings too, sat below the edge with no way to reach them.
It now scrolls on windows under 800px tall; only there, because scrolling one
axis clips the other and the collapsed rail's name bubbles hang off its side.

**Enter did nothing in ⌘K.** Testing §6 through the palette found that the
only way from the search box to a result was Tab, past the close button. Enter
now runs the first result and ↓ steps into the list.

**A `back()` can race the router.** The first version of the Back hook took
its entry off with `history.back()` a task after closing. The palette closes
and then navigates, the router's push landed after that task, and the `back()`
undid the navigation — ⌘K → Settings stayed on Labs. Overlays closing for a
navigation now say so, and never send a `back()`.

### The two follow-ons, done after all

- **"Share → Mere" (`share_target`).** The share sheet POSTs the file; the
  service worker parks it in a `mere-share-target` cache and redirects to
  `timeline?shared-package=1`, where the review panel takes it — once. Scoped
  to packages: a shared PDF has no review screen to go to, and Android offers
  Mere for any `application/octet-stream`, so anything that is not a package
  is opened, found not to be one, and said so. Tested end to end by submitting
  the share form to the installed worker in Chromium; a real share sheet still
  wants a real Android phone. See also
  [`sharing-a-package-by-link.md`](./sharing-a-package-by-link.md#other-ways-a-package-arrives).
- **`core-js/stable`.** 174 KB imported whole for the browsers in
  `.browserslistrc` — current Chrome, Edge, Firefox ESR, the last two Safari
  and iOS majors — which ship all of it. A build without it was searched for
  every newer built-in: `Promise.withResolvers` and `Float16Array` are
  feature-tested before use; `structuredClone`, `Object.hasOwn` and
  `Array.prototype.at` have been in every supported browser since 2022; the
  only `regeneratorRuntime` is the package defining itself. `polyfills.ts` is
  gone and `main.tsx` says why. The `core-js` and `regenerator-runtime`
  entries in `package.json` are now unused by the app and can come out with
  the next lockfile update.

### Documented

- [`sharing-a-package-by-link.md`](./sharing-a-package-by-link.md) — the four
  routes a package arrives by, all through one review.
- The user docs: _Installing Mere as an App_ gains "What installing adds"
  (offline, any orientation, Open with Mere, Share → Mere); _What can Mere
  Medical do?_ gains "Bring in a Record Package" and the ⌘K / Ctrl+K search.

### Still to check on a device

A headless Chromium stood in for every phone here. Before calling these done
on hardware:

- [ ] iPhone, Safari and installed: tapping Sharing and search fields does not
      zoom (§4); the home-screen icon is Mere's (§10)
- [ ] iPhone: the `.emrpkg` picker in Sources lets a package be chosen (the
      `accept` list names a type iOS does not know)
- [ ] Android, installed: the back gesture closes the More sheet and dialogs
      (§6); turning the phone rotates the app (§2)
- [ ] Android: share a `.emrpkg` from email to Mere (§12)
- [ ] Both: with the keyboard up, the tab bar steps aside and returns (§7)
- [ ] Desktop Chrome, installed: double-click a `.emrpkg` → Open with Mere
- [ ] VoiceOver and TalkBack across the tab bar, the More sheet and ⌘K

## Tested again

Same build, same probes, same widths, against the fixed build at the head of
this branch.

| Probe                                                  | Before                        | After                                                               |
| ------------------------------------------------------ | ----------------------------- | ------------------------------------------------------------------- |
| `/demo`, after Skip Tutorial, returning `/`            | Page not found                | `/timeline` (unknown paths still 404; `/labs/:key` still redirects) |
| Manifest orientation · manifests linked                | portrait · 2                  | none · 1, with `file_handlers` and `share_target`                   |
| "More" at 200% / 250% text                             | 33% visible / —               | fully visible, labels whole                                         |
| Phone text fields under 16px                           | 27 of 27                      | **0** of 27 (desktop unchanged at 14px)                             |
| Wallet card on a phone                                 | "…morning. D…"                | "…morning. Do not crush or chew."                                   |
| Hover-only texts on the probed pages                   | 16                            | **0**                                                               |
| More sheet on Labs, then Back                          | Records                       | Labs, sheet closed                                                  |
| More → Settings, then Back                             | —                             | Labs                                                                |
| ⌘K, then Back · ⌘K → Settings, then Back               | Records · (Enter did nothing) | Labs · Settings, then Labs                                          |
| Keyboard up on Sharing                                 | tab bar + tool picker shown   | both hidden, back on blur                                           |
| Slow 4G + 4× CPU, gzip: first paint                    | 5.3 s                         | **3.7 s**                                                           |
| … bytes before the first heading                       | 802 KB                        | 549 KB                                                              |
| … until text is in Source Sans                         | 9.9 s, 1.69 MB                | **5.5 s, 0.85 MB**                                                  |
| "Share → Mere" (form POST to the installed worker)     | no such route                 | review panel on the timeline; the parked file used once             |
| Offline typeface                                       | system fallback               | Source Sans                                                         |
| Landscape Medications: banner ends at                  | y ≈ 372 of 393                | y ≈ 225                                                             |
| Profile / Settings in the rail at 852×393 and 1280×600 | below the edge                | reachable (scrolls)                                                 |
| `.emrpkg` dropped on the window                        | browser opens the file        | review panel, nothing imported                                      |
| PDF dropped outside a file field                       | app replaced by the PDF       | refused, with where it can go                                       |
| Sideways overflow at 320 / 393 / 852×393 / 1440        | none                          | none                                                                |
| Console errors                                         | 0                             | 0                                                                   |

Timings are medians of three runs of each build served locally with gzip,
Chromium throttled to 1.6 Mbps / 150 ms and a 4× slower CPU, service workers
off so every run is a first visit.

**Baseline:** 791 tests in 95 suites, all passing (was 758 in 90). `tsc` clean;
`eslint` reports no errors, and no warnings in the new files. New specs cover the
shell routes, `useCloseOnBack`, `useSoftKeyboardOpen`, the path walker against
fhirpath, a dropped package in the review panel, and the share-target handoff.
