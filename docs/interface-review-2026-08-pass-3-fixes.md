# Third pass — what the fixes changed, and what fixing them turned up

Companion to [`interface-review-2026-08-pass-3.md`](./interface-review-2026-08-pass-3.md).
Every numbered item in that review's "Suggested order" is closed. This records
what shipped, verified against a clean production build driven through `/demo`
at 393 / 834 / 1440 px, plus an Arabic pass at 393 and 1440.

**Baseline after:** 622 tests in 76 suites (was 577 in 70), `tsc` clean, 0
console errors, 0 horizontal overflow, 0 identifiers on screen at any width.

---

## What shipped

### 1. Screens hear about their records

One `RecordChangeBridge` subscribes to `clinical_documents.$` and publishes the
app's existing change signal, debounced on the same 400 ms `useRecordCounts`
uses. Every hook that already consumed the tick — a dozen of them — became live
without being touched.

The seven page-level readers that subscribed to *nothing* are wired to it too:
Summary, Results, Wallet card, Health maintenance, Growth charts, Export and the
clinical timeline. Summary needed a little more than a dependency, because its
reducer fetches only from `IDLE` and a sync never moved it off `COMPLETED`.

Two `window.location.reload()` calls are gone — the additive `.emrpkg` merges,
which existed only to make lists notice. The seven that remain all swap
something a provider read once (the whole database, the encryption mode, the
user profile), and each now says why in a comment.

### 2. Three screens count the same records the same way

`isAllergyNegationRecord` and `referencedAttachmentIds` are shared rules now,
not conventions each screen remembered separately.

| | Before | After |
| --- | --- | --- |
| Allergies: nav / page / wallet | 6 | 6 |
| Allergies: Summary | 11 (as "24 records") | 6 (as "19 records") |
| Allergies: Export chip | 11 | 6, plus **Allergy status · 5** |
| Documents: nav | 14 | 11 |
| Documents: Export chip | 11 | 11 |

Negations are not hidden — they count under their own name, so Export's "the
chips add up to the total" stays true and a printed summary handed to a clinic
stops listing "No Known Allergies" under Allergies. Documents reconciled the
other way: an attachment a DocumentReference wraps is that document's file, and
only a standalone upload is a document of its own — which is what the Documents
page always listed.

### 3. Results adds up

`resultTotals` computes the second tile as the complement of the first, so the
row is additive by construction rather than by whoever last edited a filter
remembering every member of the union. **222 = 180 labs + 42 reports, imaging
and other** — the eleven records that belonged to no labelled tile are named.

`dedupeNarrativeText` prints a report's prose once. The demo's aligner report
showed one sentence under **Impression**, **Narrative**, **Result note** and
**Provider comments**; two of those were the same field by construction
(`getResultNote` reads `note[0].text`, `getProviderComments` maps all of
`note[]`).

### 4. Composed strings translate

`buildTimelineCardTitle` takes a translator and fills a format string, so
"Your Conditions, Procedures, and 3 more" is `t('Your {a}, {b}, and {n} more')`
with the categories translated separately — a combinatorial set of sentences
reduced to three keys. The timeline's three search placeholders go through `t()`.

The coverage spec caught four strings this work introduced before they could
ship, which is the guard the review said was missing.

### 5. The bundle is no longer one chunk

`React.lazy` on every route but the shell and the landing timeline, with the
Suspense boundary on `TabWrapper`'s `main`; `react-odontogram` (and the WebGL
renderer it drags in) behind a dynamic import; the dental 3-D scan viewer split
from its card so it loads only when a scan exists and the browser has WebGL;
recharts split out of the timeline's lab row, where it only renders after you
expand a row and switch it to the graph.

| | Before | After |
| --- | --: | --: |
| JS chunks | 2 | 104 |
| Entry chunk, raw | 4.8 MB | 2.7 MB |
| **Entry chunk, gzipped** | **1331 KB** | **762 KB** |
| three.js in the entry chunk | yes | no |
| recharts in the entry chunk | yes | no |

### 6. Back returns you to where you were

`useScrollRestoration`, hung off `TabWrapper`'s `main`. Verified at 393 and
1440: scroll a list, open a record, press Back, land where you left.

### 7. One treatment for deleting

`useUndoableDelete` for the small things you wrote yourself — a tracker entry, a
timeline comment — which delete on the tap and carry the way back in the toast.
`ConfirmDeleteDialog` for the one case that cannot be undone: a record whose
attachments go with it, and which now says so.

`window.confirm` no longer appears anywhere in the app. The two "Discard unsaved
changes?" prompts moved to the same dialog, which meant giving the modal's close
guard a way to report "not safe" without answering the question itself.

### 8. Dental's follow-up list is a list of records

`nextActions` is built from records that are genuinely outstanding — an active
finding, a perio measurement, a referral, a treatment still marked planned —
each a row you can open, titled as itself, detailed with its kind, teeth and
date. The count above the list is the length of the list. Stat tiles reading
zero are gone.

### 9. The directory reads every record

`collectDirectory` harvests names from performers, authors, recorders,
asserters, requesters, information sources and CareTeam participants, and places
from encounter locations, service providers, custodians and managing
organisations. On the demo library that is **5 providers where the page
previously showed none** — Ben Bora on 7 records, Christy Chin on 6 — each row
carrying how many records name them and when they last appear.

`OtherDownloadDoors` states in one place how Export, Sharing and Visit prep
differ, and links across, so three working features stop pretending the other
two don't exist.

### 10. RTL, and the console

367 physical direction utilities → **2**, both deliberate (tooth positions in an
anatomical diagram, which should not mirror). `space-x-*` became `gap-x-*` on
the seven flex rows using it, since `space-x` lays down a physical margin.

Production builds carry no `console.log` / `.debug` / `.info`. `warn` and
`error` stay — a self-hoster debugging a sync needs them, and they carry
messages rather than payloads. Two statements that printed record content on
every render were deleted outright.

---

## What the fixing turned up

Three things worth recording, because in each case the first attempt was wrong
in a way the tests or the browser had to catch.

**A shared shell may not assume a router.** Putting scroll restoration in
`AppPage` crashed the entire app to "Something went wrong" — `AppLoadingSkeleton`
renders an `AppPage` while the database boots, which is before `RouterProvider`
mounts, so `useLocation()` threw and the root error boundary swallowed every
route. The DirectoryTab spec failed on exactly this and was, at first, "fixed"
by wrapping it in a `MemoryRouter` — treating the alarm as the problem. The hook
now lives on `TabWrapper`, and `AppPage.spec.tsx` renders outside a router and
asserts it does not throw.

**Restoring scroll needs to know which box scrolled, and to wait.** Two further
attempts failed in the browser after passing review: the save side bound its
listener at mount, when the page has not rendered its scroller yet, so it
recorded 0 every time (it listens in the capture phase on the container now);
and the restore side aimed at the first scrollable box it found, which on a
desktop Records route is the category side nav, so the *navigation* scrolled
while the list stayed put (the remembered position carries which box, in
document order).

**Labs still loses its filter on Back.** Testing restoration on Labs kept
failing until it was clear why: the page returns pre-filtered to "Attention", so
it is five rows tall and there is nothing to restore to. Filter and search state
lives in component state, not the URL — so it does not survive Back, cannot be
linked, and cannot be restored.

*Since fixed — see [§11 below](#11-the-view-you-are-looking-at-has-an-address).*

---

## 11. The view you are looking at has an address

The item above, closed. It turned out to be one finding wearing two hats: the
pre-filtered default and the un-restorable view were the same bug seen from
different sides.

**`useListViewParams`** puts a list page's search box and filter chips in the
URL. Applied to all fourteen pages that carry them — Labs, Medications,
Problems, Imaging, Documents, Conditions, Allergies, Vitals, Procedures,
Encounters, Referrals, Insurance, Directory and the Records hub — so the answer
is the same wherever you are. Written with `replace: true`, so typing updates
the current history entry instead of pushing one per keystroke.

**Labs opens on "All" now.** The default was "Attention", which meant a records
page opened showing five of fifty rows and read as "you only have five labs".
Two things had already been built to work around it, and both are gone:

- an `added=1` marker on the return path from the manual form, so that a lab you
  had *just typed* would be visible on the page you were returned to — a normal
  result is not "attention", so under the default it was not there;
- a `sessionStorage` copy of the search box, plus a `sessionStorage` copy of the
  scroll offset saved on every row click — a per-page reimplementation of the
  restoration the shell now does for every route.

The page's own test had to enter through the `added=1` path, because none of its
fixtures is flagged and the default hid all of them. A test that has to dodge
the default is a fair sign about the default.

Verified end-to-end at 393 and 1440, on the built app:

| | Result |
| --- | --- |
| Opens on | **All 50**, clean URL |
| Choosing "Attention" | `?filter=attention` |
| Reload | comes back on Attention |
| Back from a result | same filter, **scroll restored** |
| `?filter=attention&q=hemo` | opens filtered, search box filled |

One thing this turned up: the desktop lab row *is* a real `<Link>` (pass 1's
finding is genuinely closed), and the reason a scripted click on it appeared to
do nothing was the sticky banner intercepting a click on a row that had been
scrolled into view underneath it. Worth knowing before reading that as a
regression.
