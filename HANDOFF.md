# Atlas — Engineering Handoff Document

**Read this entire document before writing any code.** This is a full project handoff written because the previous Claude session hit its context window limit. You have no memory of the prior conversation — everything you need is here.

Last updated: 2026-07-12 (end of previous session, immediately after the Atlas rebrand).

---

========================================================
## PROJECT OVERVIEW
========================================================

**What the app is:** A personal, offline-first fitness tracking app for iOS, currently named **Atlas** (recently rebranded from "Gym Tracker"). It started as a workout logger and has since grown into a combined workout + nutrition tracking platform, being built out incrementally toward a full "fitness platform" (workouts + nutrition + eventually pantry/grocery tracking).

**Current purpose and vision:** The user (a biomedical student, building this partly as a portfolio piece) wants an app that could plausibly replace:
- A dedicated workout tracking app — mostly done
- A dedicated calorie/macro tracking app with photo recognition — mostly done
- Basic grocery/pantry tracking apps — **not started yet**

The explicit long-term ambition (stated by the user when they requested the nutrition expansion) was "add a Nutrition + Pantry + Grocery system that integrates tightly with the existing workout tracker" to transform this into "a complete personal fitness platform." Pantry + Shopping List was deliberately deferred to a later phase and **has not been built yet** — this is the most obvious next major feature.

**Current name/branding:** **Atlas**. Just rebranded (see "Recent Changes" below) from "Gym Tracker" to a premium black/charcoal/gold aesthetic explicitly modeled after Apple Fitness, Notion, Linear, and Arc Browser — minimal, elegant, confident, NOT "gym bro" or flashy.

**Target users:** Personal use by the developer/user themselves (this is explicitly a personal app, not built for App Store distribution — no Apple Developer Program account, uses free personal Apple ID signing which expires every 7 days). Portfolio/demonstration value matters — the user has said quality bar should stay high since this differentiates their portfolio.

**Overall architecture:** Fully offline-first, single-user, local-only SQLite database. No backend server, no auth/login, no user accounts. The **only** feature that talks to the internet is AI photo food logging, which calls Google's Gemini API directly from the client with a user-supplied, free-tier API key stored in `expo-secure-store` (originally built against Claude/Anthropic, switched to Gemini in a later session so users get a free provider instead of needing a paid Anthropic key). Everything else — all workout data, nutrition data, templates, settings — lives in one local SQLite file (`gymtracker.db`) on the device.

---

========================================================
## TECH STACK
========================================================

| Layer | Choice | Version |
|---|---|---|
| Framework | Expo (managed workflow, using `expo prebuild`/`expo run:ios` for native builds) | SDK `^54.0.0` |
| Language | TypeScript | strict mode on (see `tsconfig.json`) |
| UI framework | React Native | `0.81.5` |
| Navigation | Expo Router (file-based routing) | `~6.0.24` |
| Database | `expo-sqlite` (new async API: `getAllAsync`, `getFirstAsync`, `runAsync`, `execAsync`) | `~16.0.10` |
| Charts | `react-native-chart-kit` + `react-native-svg` | `^6.12.0` / `15.12.1` |
| Animations | `react-native-reanimated` + `react-native-worklets` | `~4.1.1` / `0.5.1` |
| Image picking | `expo-image-picker` | `~17.0.11` |
| Image resizing | `expo-image-manipulator` | `~14.0.8` |
| Secure storage | `expo-secure-store` (used only for the Gemini API key) | `~15.0.8` |
| Icons | `@expo/vector-icons` (Ionicons) | bundled with Expo |
| AI integration | **Google Gemini vision API** (`gemini-3.5-flash`, free tier), called directly via `fetch()` to `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` — no SDK dependency, raw HTTP with the API key as a `?key=` query param, using `generationConfig.responseSchema` for enforced structured JSON output. **Switched from Claude/Anthropic to Gemini in a later session** (the "Model used: claude-sonnet-5" line below in earlier history reflects the original build, not the current provider). | n/a (raw fetch) |
| Build tooling | `npx expo run:ios --device` (Debug, needs Metro) or `npx expo run:ios --device --configuration Release` (standalone, no Mac needed after install) | — |

**Important architecture decision:** OpenAI was originally scaffolded for the AI vision feature, then explicitly switched to **Claude/Anthropic** per user request mid-session. `src/utils/aiVision.ts` and `src/utils/apiKeyStore.ts` are Claude-specific (function names `getClaudeKey`/`setClaudeKey`, not generic).

**New Architecture:** `newArchEnabled: true` in `app.json` (Fabric/TurboModules on).

---

========================================================
## CURRENT APP STATE
========================================================

### Workout features (fully built, stable, not touched in recent sessions)

- **Home tab** (`app/(tabs)/index.tsx`): today's workout, last finished workout, weekly workout count, current streak, recent PRs, quick-start button.
- **Workout tab** (`app/(tabs)/workout.tsx`): start an empty workout, create a named one, repeat a previous workout (dedup'd by name), **and** a "My Templates" section (see Templates below) with a link to manage templates.
- **Active workout screen** (`app/workout/active.tsx`): add exercises (from library or custom), log weight/reps/RPE/notes per set, mark sets complete (with haptic + spring-pop animation via Reanimated), live **digital clock timer** (`mm:ss` / `h:mm:ss`, ticks every second — this was fixed from an earlier buggy `formatDuration` that only showed "0m"/"1m"). Wrapped in `KeyboardAvoidingView` so the keyboard doesn't cover the set-entry UI. Finish/Cancel flow with haptic feedback (`haptics.success()` on finish).
- **Exercise picker** (`app/exercise/picker.tsx`): search/filter by muscle group, create custom exercises, favorite toggling. Also doubles as the "add food to a reusable meal" picker when a `mealId` param is passed, and the "replace exercise in template" picker when `replaceTemplateExerciseId` is passed — **this file is shared across three different flows**, gated by which optional param is present.
- **History tab**: calendar view of workout days.
- **Progress tab**: weight/volume charts, exercise history, bodyweight tracking, best-lift table.
- **Workout Templates** (`app/templates/index.tsx`, `create.tsx`, `[id].tsx`): full CRUD for reusable workout templates (e.g. "Push Day"). Each template has named exercises with **real per-set weight/reps rows** (not just a set-count stepper — this was explicitly requested after an initial simpler version). Per-exercise "•••" menu (native `ActionSheetIOS`) with: Add Note, Add Sticky Note (prominent banner), Add Warm-up Set (sorts above working sets via a lower `set_number`, no renumbering needed), Replace Exercise, Remove Exercise. Tapping a template from the Workout tab opens it for review — **starting the actual workout requires an explicit "Start Workout" tap inside the template screen**, it does NOT auto-start (this was a specific fix requested by the user).
- **Exercise library**: ~130 seeded exercises across all muscle groups (`src/constants/exercises.ts`), seeded idempotently by name (re-seeding logic checks existing names, so growing the list later won't duplicate rows or require a fresh install).

### Nutrition features (built this session, "Phase 1" of the nutrition expansion — mostly complete, some rough edges fixed iteratively)

- **Nutrition tab** (`app/(tabs)/nutrition.tsx`): date navigator (prev/next day), calorie/macro summary card with progress bars (protein/carbs/fat), water tracker with +/- 250mL buttons and a unit display, log of today's entries grouped by meal type, 7-day calorie trend chart (reusing `LineChartCard`).
- **Log Food** (`app/nutrition/log.tsx`): search ~60 seeded common foods (`src/constants/foods.ts`), favorite foods, or create a custom food. **Calories are NOT manually entered** — they're auto-derived live from Protein/Carbs/Fat via the 4/4/9 rule (4 kcal/g protein, 4 kcal/g carbs, 9 kcal/g fat) and shown as a read-only "auto" field. This was an explicit user requirement applied consistently everywhere macros are entered (custom food creation, AI photo results, and the Settings nutrition goals).
- **Reusable Meals** (`app/nutrition/meals/index.tsx`, `create.tsx`, `[id].tsx`): save a combo of foods (e.g. "Protein Shake") once, log the whole thing in one tap. Quantity per food item adjustable via +/- 0.5 serving steppers.
- **AI Photo Food Logging** (`app/nutrition/photo.tsx`): take/pick a photo → resized client-side to a 1024px long edge (`src/utils/imageResize.ts`, using `expo-image-manipulator`) before sending to Claude → Claude identifies distinguishable food components with per-item macro estimates (`src/utils/aiVision.ts`) → results shown as **editable** cards (remove items, adjust protein/carbs/fat, calories auto-recompute) → user picks a meal type → explicit "Confirm & Log" required, **nothing auto-saves**. Each confirmed item becomes a new custom `foods` row then gets logged via `logFood`.
  - Requires a Claude API key entered in Settings → AI Photo Logging (masked `TextInput`, stored via `expo-secure-store`, never touches SQLite).
  - **Cost awareness was explicitly discussed and addressed**: the image-resize step exists specifically because unresized full-resolution phone photos were costing ~10x more per API call (~$0.05 vs ~$0.005) due to Claude's vision pricing scaling with pixel count.
- **Nutrition goals** (Settings): Protein/Carbs/Fat entered directly in grams; **Daily Calories is auto-derived (read-only) from those three via 4/4/9** — this was a deliberate fix after the user found a bug where Carbs could be set to 10000g while Calories stayed at 2000 (they were previously independent fields). Water goal + unit are merged into a single row where the unit *inside* the label text (e.g. "Water Goal (mL)") is itself a tappable dropdown (`ActionSheetIOS`) supporting mL/L/fl oz/gal — this was a specific UX request ("no separate dropdown row, the unit text itself should be the dropdown").
- **What's NOT done for nutrition:** Receipt scanning/OCR was explicitly **dropped from scope** early on (see Recent Changes) because it required cloud AI and conflicted with the offline-first goal at the time — this may be worth revisiting now that AI photo logging (Claude vision) is already wired up, since the same Claude vision pipeline could plausibly parse a receipt photo too if the user wants that later.

### Pantry / Grocery / Shopping List — **NOT STARTED**

This is "Phase 2" of the plan agreed with the user and has not been built at all. See Next Steps.

### UI / Design System

- **6 bottom tabs** (order is now user-configurable — see below): Home, Workout, Nutrition, History, Progress, Settings.
- **Theme system** (`src/constants/theme.ts` + `src/context/ThemeContext.tsx`): fully dynamic, reactive light/dark mode + user-selectable accent color, persisted in the `usersettings` table. This required a significant refactor early in the nutrition work — originally every screen imported a **static** `colors` object from `theme.ts` baked in at module-load time (so changing the theme setting had no visual effect without an app restart). This was refactored so every screen/component now calls `useTheme()` and computes its `StyleSheet.create(...)` inside a `useMemo(() => ..., [colors])` in the component body, making theme changes apply live. **If you add a new screen, follow this pattern** — do not import the static `colors` export from `theme.ts` directly in a screen (it still exists as a fallback default for use before settings load, e.g. the root loading spinner, but should not be used for regular screens).
- **Accent color**: user-customizable via 8 preset swatches in Settings (`ACCENT_PRESETS` in `theme.ts`), default is now gold (`#D4AF37`, see Recent Changes/Brand Guidelines below).
- **Haptics** (`src/utils/haptics.ts`): a small wrapper around `expo-haptics` (`tap`, `select`, `success`, `warning`) used throughout for tactile feedback — this was an explicit "make it feel more native/Apple-like" pass requested by the user (they compared it unfavorably to other workout-tracking apps initially, citing lack of haptics/animation).
- **Shared components** (`src/components/`): `Card`, `EmptyState`, `ExerciseListItem`, `LineChartCard`, `PrimaryButton` (has spring-scale press animation + haptic tap baked in), `SectionHeader`, `SetRow`, `StatTile`.
- **Tab reordering** (new, last thing built before this handoff): Settings → "Tab Order" section with ↑/↓ buttons per tab row (deliberately NOT drag-and-drop, to avoid adding another native dependency and risking another rebuild cycle). Persisted as a JSON array in `usersettings.tab_order`, read by `app/(tabs)/_layout.tsx` which renders `<Tabs.Screen>` dynamically in that order via `src/constants/tabs.ts`'s `TAB_CONFIG`/`normalizeTabOrder` (tolerant of a stored order missing a newly-added tab).

---

========================================================
## DATABASE
========================================================

Single SQLite file, `gymtracker.db`, created via `SCHEMA_SQL` in `src/db/schema.ts` and migrated via the `MIGRATIONS_SQL` array (see below). All queries live in `src/db/queries.ts` (workout-related) and `src/db/nutritionQueries.ts` (nutrition-related) — this split was deliberate to keep `queries.ts` from becoming unmanageably large.

### Existing tables (workout domain — stable, pre-dates this session mostly)

| Table | Purpose | Key fields |
|---|---|---|
| `usersettings` | Singleton row (`id=1` via `CHECK`) for all app settings | `units`, `default_rest_seconds`, `theme`, `accent_color`, `daily_calorie_goal`, `protein_goal_g`, `carb_goal_g`, `fat_goal_g`, `water_goal_ml`, `water_unit`, `tab_order` (JSON string array) |
| `exercises` | Exercise library (built-in + custom) | `name`, `muscle_group`, `equipment`, `is_custom`, `is_favorite` |
| `workouts` | One row per workout session | `name`, `date`, `started_at`, `finished_at` (NULL = in progress), `notes` |
| `workout_exercises` | Join: exercises performed in a workout | `workout_id`, `exercise_id`, `order_index`, `notes` |
| `sets` | Every logged set | `workout_exercise_id`, `set_number`, `weight`, `reps`, `rpe`, `notes`, `completed`, `rest_seconds` |
| `personal_records` | Best set per exercise (Epley 1RM) | `exercise_id`, `weight`, `reps`, `estimated_1rm`, `date`, `workout_id` |
| `bodyweight_entries` | Bodyweight log | `date`, `weight` |
| `workout_templates` | Named reusable workout templates | `name`, `created_at` |
| `template_exercises` | Exercises within a template | `template_id`, `exercise_id`, `order_index`, `target_sets` (legacy, mostly superseded by `template_sets`), `notes`, `sticky_note` |
| `template_sets` | **Real per-set weight/reps** within a template exercise (added this session, replacing the earlier simplistic "target sets count" model) | `template_exercise_id`, `set_number` (can be ≤0 for warm-up sets so they sort first without renumbering), `weight`, `reps`, `is_warmup` |

### New tables (nutrition domain — added this session)

| Table | Purpose | Key fields |
|---|---|---|
| `food_brands` | Optional brand names for foods | `name` (UNIQUE) |
| `foods` | Food/nutrition library (built-in seed + custom + AI-photo-derived) | `name`, `brand_id`, `serving_size`, `serving_unit`, `calories`, `protein`, `carbs`, `fat`, `fiber`, `sugar`, `sodium`, `is_custom`, `is_favorite` |
| `meals` | Reusable named combos of foods | `name`, `created_at` |
| `meal_items` | Foods within a reusable meal | `meal_id`, `food_id`, `quantity` (servings multiplier), `order_index` |
| `nutrition_entries` | The actual daily log — one row per logged food or meal | `date`, `logged_at`, `meal_type` (`breakfast`\|`lunch`\|`dinner`\|`snack`\|`drink`), `food_id` (nullable), `meal_id` (nullable — exactly one of these two is set), `quantity`, plus **denormalized** `calories`/`protein`/`carbs`/`fat`/`fiber`/`sugar`/`sodium` snapshotted at log time (so later edits to a food's base macros don't retroactively change historical logs) |
| `daily_logs` | Per-day water intake (and a spare `notes` column) | `date` (UNIQUE), `water_ml`, `notes` |

Relationships: `foods.brand_id → food_brands.id`; `meal_items.meal_id → meals.id` (CASCADE), `meal_items.food_id → foods.id`; `nutrition_entries.food_id → foods.id` and `.meal_id → meals.id` (both nullable, mutually exclusive in practice); `template_sets.template_exercise_id → template_exercises.id` (CASCADE).

### Migrations

All schema changes to *existing* tables go through `MIGRATIONS_SQL` in `src/db/schema.ts` — a flat array of `ALTER TABLE ... ADD COLUMN` (and occasionally `UPDATE`) statements, run in `app/_layout.tsx`'s `initDatabase()` inside a per-statement `try/catch` (SQLite has no `ADD COLUMN IF NOT EXISTS`, so "duplicate column" errors are deliberately swallowed). **New tables** just go in `SCHEMA_SQL` directly with `CREATE TABLE IF NOT EXISTS` (safe for both fresh installs and existing ones). **If you add a new column to an existing table, you MUST add it to `MIGRATIONS_SQL`, not just `SCHEMA_SQL`** — existing installs won't get it otherwise, since `CREATE TABLE IF NOT EXISTS` is a no-op when the table already exists.

Current full migration list (in order, for reference — do not reorder, they're applied sequentially every launch and are idempotent):
```
ALTER TABLE usersettings ADD COLUMN accent_color ...
ALTER TABLE template_exercises ADD COLUMN notes TEXT;
ALTER TABLE template_exercises ADD COLUMN sticky_note TEXT;
ALTER TABLE usersettings ADD COLUMN daily_calorie_goal ...
ALTER TABLE usersettings ADD COLUMN protein_goal_g ...
ALTER TABLE usersettings ADD COLUMN carb_goal_g ...
ALTER TABLE usersettings ADD COLUMN fat_goal_g ...
ALTER TABLE usersettings ADD COLUMN water_goal_ml ...
ALTER TABLE usersettings ADD COLUMN water_unit ...
ALTER TABLE usersettings ADD COLUMN tab_order TEXT;
UPDATE usersettings SET accent_color = '#D4AF37' WHERE id = 1 AND accent_color = '#FF6B35';  -- rebrand migration
```

**Seeding** (`src/db/seed.ts`): both the exercise library and the food library are seeded **idempotently by name** — on every app start, it diffs existing names against the seed constant arrays and inserts only what's missing. This means you can freely grow `SEED_EXERCISES` (`src/constants/exercises.ts`) or `SEED_FOODS` (`src/constants/foods.ts`) at any time without needing a fresh install or losing user data. The old "only seed if table is empty" logic was explicitly replaced with this because the user's existing installed app didn't pick up new exercises otherwise.

---

========================================================
## RECENT CHANGES (most recent session, chronological)
========================================================

This session covered a LOT of ground. In order:

1. **Disk space crisis (resolved, but be aware it can recur)**: The Mac's disk repeatedly filled to 0 bytes free during iOS native builds (Xcode `DerivedData`, CocoaPods caches, etc. balloon fast). Freed space multiple times via `rm -rf ~/Library/Developer/Xcode/DerivedData`, clearing `~/Library/Caches/*`, and eventually the user cleared ~45GB manually. **If disk space issues resurface, this is a known recurring problem for this user's machine** — the Mac has a large amount of personal files (~473GB used of ~494GB total was seen at one point).
2. Fixed provisioning/signing issues (`Developer Mode` needed enabling on the physical iPhone; free personal-team signing expires every 7 days).
3. **Built the entire Nutrition system from scratch** (Phase 1 — see "Current App State" above for full detail). Iterated several times on bugs found via user testing: keyboard covering UI (`KeyboardAvoidingView` added to `nutrition/log.tsx`, `templates/[id].tsx`, `workout/active.tsx`), a food-list layout bug (unbounded `FlatList` pushing content off-screen — fixed with `flex: 1` on the list style), calories/macros disagreeing (fixed via the 4/4/9 auto-derivation pattern), water unit UX (merged into one row, made a proper persisted setting with `ActionSheetIOS` dropdown instead of a local tap-to-cycle).
4. **Added AI photo food logging.** Originally scaffolded for OpenAI, then **explicitly switched to Claude/Anthropic** mid-build per user request — `src/utils/aiVision.ts` calls Claude's Messages API directly with an image content block; `src/utils/apiKeyStore.ts` stores the key via `expo-secure-store`. Discussed real per-photo cost (~$0.01–0.06 depending on resolution) and added client-side image resizing (`src/utils/imageResize.ts`, using newly-installed `expo-image-manipulator`) to cap the long edge at 1024px, cutting typical cost ~10x.
5. **Added Workout Templates with real per-set data** (upgraded from an earlier simpler "target sets count" version) plus the per-exercise "•••" action menu (notes, sticky notes, warm-up sets, replace exercise, remove exercise) — this matched a reference screenshot the user showed of a similar workout-tracking app's template UI.
6. Fixed a UX bug where tapping a template from the Workout tab **immediately started the workout** — changed so tapping opens the template for review, and starting requires an explicit button tap inside.
7. **Git was initialized this session** (the project had no version control before). Committed incrementally throughout — see `git log` for the full history, it's a reasonably clean/atomic commit trail.
8. **Established the standalone-build workflow**: `npx expo run:ios --device --configuration Release` produces a build with the JS bundle embedded, so once installed it runs fully offline with no Mac/Metro dependency (as opposed to the Debug build via plain `--device`, which always needs Metro running). The free-Apple-ID signing still expires every ~7 days, requiring reconnect + rerun. **Twice during this session, adding a new native dependency (or new `app.json` icon/permission config) silently had no effect because the `ios/` native folder already existed** — `expo run:ios` does NOT re-run `expo prebuild`'s config-plugin application if `ios/`/`android/` already exist. **The fix, every time, was `rm -rf ios android` before rebuilding.** This will very likely bite you again if you change `app.json`, add a native module, or change permission strings — **always delete `ios/`/`android/` and let them regenerate after any such change.**
9. **App icon added** (first version): a simple orange dumbbell/barbell silhouette on the dark background, matching the-then default accent color. Wired via `app.json`'s `icon` and `android.adaptiveIcon.foregroundImage` fields, generated via a Python/Pillow script (no `rsvg-convert`/`imagemagick`/`inkscape` available on this Mac — Pillow via `python3 -c "from PIL import Image..."` was the working approach).
10. **Full rebrand to Atlas** (the last major piece of work, see Brand Guidelines below for full detail): renamed display strings, overhauled the color palette to black/charcoal/gold, and **completely redesigned the icon** — the user explicitly said the first icon "looked like a stretched-out H" and demanded a brand-new concept, not a recolor. New icon: two white circles (weight plates) connected by bars that bend upward to meet at a small **gold** circle at the peak — reads simultaneously as a barbell, a mountain summit (the "Atlas" reference), and an upward-progress chevron. Verified legibility down to 40×40px.
11. **Added Tab Order setting** (Settings → up/down reorder buttons for the 6 bottom tabs) in the same session as the rebrand, per user request alongside the icon redesign ask.

### Known TypeScript errors that already existed before this session (task #11, unresolved, low priority)

```
src/utils/exportImport.ts(34,33): Property 'documentDirectory' does not exist on type ...expo-file-system...
src/utils/exportImport.ts(36,26): Property 'EncodingType' does not exist on type ...expo-file-system...
src/utils/exportImport.ts(63,26): Property 'EncodingType' does not exist on type ...expo-file-system...
```
This is an **API surface mismatch from an Expo SDK 54 `expo-file-system` breaking change** (the package's TypeScript types no longer export `documentDirectory`/`EncodingType` the same way an older SDK did — the export/import feature was written before this upgrade). **The export/import feature likely does not currently compile-check cleanly and may be broken at runtime** — this has never been fixed or even fully investigated this session; it's been running with `npx tsc --noEmit | grep -v "exportImport.ts"` to filter these three known errors out of every other typecheck run. **This is the single most concrete "must fix" item outstanding.**

---

========================================================
## BRAND GUIDELINES
========================================================

**App name:** Atlas

**Brand feeling:** Premium, Apple-quality, strength, progress, precision, discipline, performance, simplicity. Explicitly modeled after Apple Fitness, Apple Health, Notion, Linear, Arc Browser, Tesla's app. Explicitly **NOT** "flashy, gamer-like, or overly gym bro."

**Design style:** Minimal, elegant, confident, crisp edges, geometric, perfect symmetry, timeless. Avoid: cartoon, 3D, skeuomorphic, bodybuilder silhouettes, flames, lightning bolts, aggressive gym branding, neon colors, gradients (except extremely subtle ones), drop shadows, glossy effects, clip art.

**Color system** (`src/constants/theme.ts`, `darkBase`/`lightBase` in `getColors()`):

| Token | Dark mode | Light mode | Usage |
|---|---|---|---|
| `background` | `#0B0B0C` (deep matte black) | `#F5F5F5` | Screen background |
| `surface` | `#161618` (dark charcoal) | `#FFFFFF` | Cards |
| `surfaceElevated` | `#1D1D20` | `#F0F0F1` | Inputs, elevated elements (not explicitly specced by the user — this was my own derived choice, a step lighter than `surface`) |
| `border` | `#242428` (subtle graphite) | `#E4E4E7` | Card/input borders |
| `textPrimary` | `#FFFFFF` | `#0B0B0C` | Primary text |
| `textSecondary` | `#B8B8C0` (soft gray) | `#6B6B76` | Secondary text |
| `textTertiary` | `#6E6E76` (my derived choice, dimmer than secondary) | `#9A9AA2` | Tertiary/meta text |
| `accent` | **`#D4AF37`** (premium metallic gold) — user-customizable, this is just the default | same | Progress indicators, PRs, achievements, highlights, buttons — **used sparingly, per explicit instruction "do NOT make the entire interface gold"** |
| `success`/`danger`/`warning` | `#3DDC84`/`#FF5A5F`/`#D97706` | `#1FAA5F`/`#E23F45`/`#B5790A` | Functional semantic colors, deliberately left alone (not part of brand identity per the brief) — `warning` was shifted from a yellow-ish `#FFC24B` to a more orange `#D97706` specifically so it doesn't visually compete with/get confused with the new gold accent |

**How colors should be used:** Interface should read as mostly black-and-white/charcoal, with gold appearing only as accent — buttons, progress bars, completed-set checkmarks, PR highlights, the app icon's "summit" dot. Never a gold background wash across large surfaces.

`ACCENT_PRESETS` (in `theme.ts`) is the user-facing swatch picker in Settings — gold (`#D4AF37`) is now preset index 0 / the default; the other 7 presets (blue, green, red, purple, pink, yellow, teal) were **left unchanged** since the user didn't ask to remove that customization feature, just to make gold the *brand default*.

**Migration note:** Existing installs that had never customized their accent color away from the old default orange (`#FF6B35`) get silently migrated to gold via a `MIGRATIONS_SQL` `UPDATE` statement (see Database section). Anyone who'd already picked a custom color keeps it.

**Theme dynamism:** All of the above is reactive at runtime via `useTheme()` / `ThemeContext.tsx` — not just static constants. See "UI / Design System" above for the pattern every screen must follow.

---

========================================================
## ICON REQUIREMENTS
========================================================

**Status: base icon done, multi-appearance variants NOT done — see below.**

**Old icon (replaced):** A flat, symmetric orange barbell — literally a thick horizontal bar with two rounded rectangular "plates" at each end, which the user correctly described as "looking like a stretched-out H." This has been fully deleted/replaced, not recolored.

**New icon concept (implemented):** A minimalist mark combining:
- Two white circles (weight plates) at the bottom-left and bottom-right
- Two bars bending **upward** from each plate to meet at a peak in the center-top
- A small **gold** circle at that peak (the "summit")

This simultaneously reads as: a barbell (plates + bar), a mountain peak (the "Atlas" name reference — Atlas mountains / Atlas holding up the world), and an upward-progress chevron/arrow. It was verified to stay legible down to 40×40px (checked via Pillow resize + read-back).

**Generation method:** Pure Python + Pillow (`PIL.Image`/`PIL.ImageDraw`), no SVG tooling was available on this Mac (`rsvg-convert`, `imagemagick`/`convert`, `inkscape`, `resvg` are all NOT installed; `cairosvg` python package also not installed). `sips`/`qlmanage` exist but weren't used for generation, only Pillow. If you need to regenerate or iterate on the icon, **use this same Pillow approach** — draw circles/lines/polygons directly with `ImageDraw`, no rotation-dependent shapes (rotating rounded-rectangles in Pillow is awkward; circles were chosen partly because they're rotation-invariant and simplified the geometry).

Current asset files: `assets/icon.png` (1024×1024, solid `#0B0B0C` background, no alpha — required for iOS) and `assets/adaptive-icon.png` (1024×1024, transparent background, scaled to ~60% and centered for Android's adaptive-icon safe zone). Wired into `app.json` via top-level `"icon"` and `android.adaptiveIcon.foregroundImage`.

**NOT yet implemented — iOS 26 multi-appearance icon support:**

The user's brief explicitly requires:
- iOS 26 **Light** appearance icon (white/light background, black symbol, gold accent)
- iOS 26 **Dark** appearance icon (what's built now)
- iOS 26 **Tinted** appearance icon (pure single-color template, must read correctly when the OS applies an arbitrary user-selected tint)
- **Liquid Glass** compatibility (avoid thin details that vanish under iOS 26's translucency/depth rendering — the current design's shapes are already fairly bold/thick, which should hold up reasonably, but this hasn't been specifically tested against actual Liquid Glass rendering)

**This was deliberately NOT attempted this session.** Reasoning documented to the user: Expo's `app.json` schema support for per-appearance icons (`ios.icon` as an object with `light`/`dark`/`tinted` sub-keys) may or may not be reliably supported in the exact Expo SDK 54 config-plugin version installed here — I was not confident enough in the exact schema shape to risk it, given how much of this session was already spent on rebuild/config debugging (the `rm -rf ios android` gotcha happened twice already). Getting this wrong risks another broken `app.json` and another full rebuild cycle burned on debugging it. **If you tackle this next:**
1. Check current Expo docs/schema for `ios.icon` object support (light/dark/tinted sub-keys) for the installed Expo SDK version.
2. If supported, generate three more Pillow-drawn variants: a light-background version (white/light bg, black symbol, gold accent) and a pure single-color template version (transparent bg, single foreground color, iOS applies the tint) for "tinted" mode.
3. Test carefully — **always `rm -rf ios android` after any `app.json` icon config change**, per the established gotcha.
4. If NOT reliably supported by the installed tooling, the fallback is to wait for/verify official Expo support, or hand-edit the generated `Assets.xcassets/AppIcon.appiconset/Contents.json` after prebuild (fragile, would need to be reapplied after every `ios/` regeneration — not recommended as a standing solution).

---

========================================================
## ENGINEERING NOTES
========================================================

### Project location & structure

Working directory: `/Users/neiltapita/Downloads/gym-tracker` (yes, the folder is still named `gym-tracker` — the user's brief said "do NOT rename internal variables or file names unless necessary," so the directory name, `package.json`'s `"name"` field, the Expo `slug`, `scheme`, `bundleIdentifier` (`com.neiltapita.gymtracker`), and Android `package` were all **deliberately left unchanged**. Only user-facing display strings were renamed to Atlas. This was a conscious decision to avoid the iOS bundle-identifier-change trap, which would make iOS treat it as a brand-new app and **wipe all local SQLite data** on reinstall.

```
gym-tracker/                          (directory name unchanged, app displays as "Atlas")
├── app/                              # Expo Router screens (file-based routing)
│   ├── _layout.tsx                   # Root: SQLite provider + migrations, Settings/Theme/ActiveWorkout providers, Stack
│   ├── (tabs)/
│   │   ├── _layout.tsx               # Tab navigator — renders tabs in user-configured order (see src/constants/tabs.ts)
│   │   ├── index.tsx                 # Home
│   │   ├── workout.tsx               # Workout tab (start/repeat/templates)
│   │   ├── nutrition.tsx             # Nutrition tab (NEW this session)
│   │   ├── history.tsx
│   │   ├── progress.tsx
│   │   └── settings.tsx              # Units, theme, accent, tab order, nutrition goals, AI API key, export/import, about
│   ├── workout/
│   │   ├── create.tsx, active.tsx, [id].tsx
│   ├── exercise/
│   │   ├── picker.tsx                # SHARED: workout exercise add / template exercise add / template exercise replace (branches on which optional param is passed)
│   │   └── [id].tsx
│   ├── templates/                    # Workout templates (NEW-ish this session — upgraded from a simpler prior version)
│   │   ├── index.tsx, create.tsx, [id].tsx
│   └── nutrition/                    # NEW this session
│       ├── log.tsx                   # Food search/log AND "add food to meal" (shared, branches on `mealId` param)
│       ├── photo.tsx                 # AI photo food logging
│       └── meals/
│           ├── index.tsx, create.tsx, [id].tsx
├── src/
│   ├── components/                   # Card, EmptyState, ExerciseListItem, LineChartCard, PrimaryButton, SectionHeader, SetRow, StatTile
│   ├── constants/
│   │   ├── theme.ts                  # Colors, spacing, radii, typography, ACCENT_PRESETS, getColors()
│   │   ├── exercises.ts              # SEED_EXERCISES (~130 entries)
│   │   ├── foods.ts                  # SEED_FOODS (~60 entries) — NEW this session
│   │   └── tabs.ts                   # TAB_CONFIG, DEFAULT_TAB_ORDER, normalizeTabOrder — NEW this session
│   ├── context/
│   │   ├── ActiveWorkoutContext.tsx  # In-progress workout state + startFromTemplate()
│   │   ├── SettingsContext.tsx       # All usersettings CRUD wrappers (setUnits, setTheme, setAccentColor, setWaterUnit, setTabOrder, setNutritionGoals, ...)
│   │   └── ThemeContext.tsx          # useTheme() — reactive colors based on settings.theme + settings.accentColor
│   ├── db/
│   │   ├── schema.ts                 # SCHEMA_SQL (CREATE TABLE) + MIGRATIONS_SQL (ALTER TABLE, run every launch, idempotent)
│   │   ├── seed.ts                   # Idempotent-by-name seeding for exercises AND foods
│   │   ├── queries.ts                # Workout/template/settings queries (~950 lines)
│   │   └── nutritionQueries.ts       # Nutrition-domain queries — NEW this session, kept separate from queries.ts deliberately
│   ├── types/index.ts                # All shared TS types/interfaces
│   └── utils/
│       ├── calculations.ts, dateHelpers.ts, exportImport.ts (has known bugs, see above), haptics.ts
│       ├── aiVision.ts               # NEW: Claude vision API call + response parsing
│       ├── apiKeyStore.ts            # NEW: expo-secure-store wrapper for Claude key
│       ├── imageResize.ts            # NEW: resize photo to 1024px long edge before sending to Claude
│       └── water.ts                  # NEW: mL/L/fl oz/gal conversion helpers, shared between Settings and Nutrition tab
├── assets/
│   ├── icon.png                      # 1024x1024, solid dark bg, iOS icon — NEW/redesigned this session
│   └── adaptive-icon.png             # 1024x1024, transparent bg, Android adaptive icon foreground
├── app.json                          # Expo config — name "Atlas", icon paths, plugins (expo-router, expo-secure-store, expo-image-picker w/ permission strings)
├── HANDOFF.md                        # This file
└── README.md                         # User-facing docs — title updated to Atlas, but feature list is STALE (written before templates/nutrition/theming existed — see Next Steps)
```

**Note:** `ios/` and `android/` directories are `.gitignore`'d (added to `.gitignore` this session) since they're fully regenerated by `expo prebuild`/`expo run:ios` — **do not commit them, and remember they must be deleted (`rm -rf ios android`) and regenerated after any `app.json` native-config change or new native dependency**, per the recurring gotcha described above.

### Git

Git was **initialized this session** (`git init`) — there was no version control before. All work is committed with descriptive messages; `git log --oneline` gives a clean chronological view of everything built. No remote is configured (this is fully local).

### Commands used to run/build this project

```bash
# Fast iteration (needs Metro running, phone + Mac same Wi-Fi, or Expo Go):
cd /Users/neiltapita/Downloads/gym-tracker
npx expo start
# then scan QR with Expo Go, or press appropriate key for a connected dev-client build

# Standalone build (phone works fully offline afterward, Mac only needed for the build/install itself):
cd /Users/neiltapita/Downloads/gym-tracker
rm -rf ios android   # ALWAYS do this if app.json native config or native deps changed
npx expo run:ios --device --configuration Release
# (phone must be connected via USB for the install step; can disconnect once it completes)

# Typecheck (always filter the 3 known pre-existing exportImport.ts errors):
npx tsc --noEmit 2>&1 | grep -v "exportImport.ts"
```

### Known bugs / issues to be aware of

1. **`src/utils/exportImport.ts` has 3 real TypeScript errors** (SDK 54 `expo-file-system` API mismatch — `documentDirectory`/`EncodingType` no longer exported the same way). Never fixed, never fully investigated. Likely broken at runtime too — **should be verified and fixed**. This is task #11 in the task list, still pending after many sessions.
2. **No true drag-and-drop for tab reordering** — deliberately implemented as up/down buttons instead, to avoid adding a new native dependency and risking another rebuild cycle. This is a UX compromise, not a bug, but worth knowing if the user later asks for "real" drag reordering.
3. **iOS icon only supports one (dark) appearance** — no light/tinted/Liquid Glass variants yet (see Icon Requirements above).
4. **README.md feature list is stale** — it still describes the app as it was before templates, nutrition, AI photo logging, and the theme system existed. Only the title was updated to Atlas this session; a full content rewrite was explicitly deferred as out-of-scope for the rebranding task.
5. **Receipt scanning/OCR was dropped from the original nutrition-expansion request** early in this session (before AI photo logging was built) due to the offline-first conflict. Worth revisiting now that the Claude vision pipeline already exists and works — the same `aiVision.ts` pattern could plausibly be adapted for receipt parsing if the user wants Pantry/Grocery (Phase 2) to include it.
6. **Disk space on this Mac is a recurring problem** for iOS builds specifically (Xcode DerivedData, CocoaPods caches). If builds start failing with `ENOSPC` or similar, check `df -h /` first before debugging anything else.

### Dependency/environment gotchas encountered and their fixes

- **New native modules require a rebuild, and `expo run:ios` won't pick up `app.json` config-plugin changes (permission strings, icon assets) if `ios/`/`android/` already exist.** Fix: `rm -rf ios android` then rebuild. This bit the project twice (once for `expo-image-picker` camera/photo permission strings causing an instant crash without them, once for the icon not updating).
- **`expo-image-picker`, `expo-secure-store`, `expo-image-manipulator`** are all Expo-Go-compatible (work immediately via `npx expo start` + Expo Go scan) but need a full rebuild for the standalone dev-client/Release build.
- **Free personal Apple ID signing expires every ~7 days** — the standalone Release build will need periodic reinstall (reconnect Mac, rerun the same `run:ios --device --configuration Release` command). This is an Apple platform limitation, not something fixable in code (would require a paid $99/year Apple Developer Program membership to avoid).
- **No SVG rasterization tools installed** on this Mac (checked: `rsvg-convert`, `convert`/imagemagick, `inkscape`, `resvg` all absent; `cairosvg` Python package absent). **Pillow (`PIL`) IS installed** and was used for all icon generation — draw shapes directly with `ImageDraw` rather than attempting SVG-based workflows.

---

========================================================
## NEXT STEPS
========================================================

### Critical (should finish before considering this "done" for the user's stated goals)

1. **Fix the `expo-file-system` TypeScript errors in `src/utils/exportImport.ts`** and verify export/import actually works at runtime on-device. This has been silently broken/unverified for multiple sessions.
2. **Build Phase 2: Pantry + Shopping List** (explicitly the next planned phase, agreed with the user, never started):
   - Pantry screen: manual add/edit/delete/search/sort/filter of pantry items (product, brand, quantity, unit, calories/macros, purchase date, optional expiration date).
   - Auto-decrement pantry inventory when logging meals that match pantry items (with a setting to disable this).
   - Low-stock warnings.
   - Shopping List: manual items + auto-generated from low-stock pantry items, checkboxes to mark purchased, checking off can move items into Pantry.
   - New DB tables needed: `pantry_items`, `shopping_list` (not yet created — will need both `SCHEMA_SQL` additions and likely a new `pantryQueries.ts` file following the `nutritionQueries.ts` precedent).
3. **iOS 26 multi-appearance icon variants** (light/tinted/Liquid Glass) — see full detail in "Icon Requirements" above. Proceed carefully given the config-plugin re-application gotcha.

### Important (should improve quality/completeness)

4. **Rewrite README.md properly** — it's stale (pre-dates templates, nutrition, theming, AI photo logging entirely). A full content pass reflecting current features would help anyone (including a future Claude session) understand the app quickly without needing this handoff doc.
5. **Phase 3 from the original plan: unified Dashboard + rule-based AI Insights** (also previously agreed with the user, not started): a Dashboard tab/section aggregating today's workout, streak, calories, protein, water, recent PRs, weight trend, pantry low-stock, shopping reminders — plus a rule-based (NOT LLM-call-based, purely computed from real local data) insights generator producing observations like "You've averaged 168g of protein over the past 7 days" or "Bench press has increased 12% over the past 8 weeks."
6. **Consider whether Receipt Scanning is now feasible** given the Claude vision pipeline already exists and works well for food photos — revisit the earlier decision to drop it, now that the "AI needs internet" concern has already been accepted by the user for food photo logging.
7. **Verify the AI photo logging feature actually works end-to-end on-device** with a real Claude API key — it was built and typechecked but the user's live confirmation of a successful end-to-end photo → results → confirm → logged flow was not explicitly captured in this session's visible transcript (they confirmed the *crash* was fixed after the permissions fix, and confirmed the *app works standalone*, but a full nutrition-photo-logging success confirmation should be double-checked).

### Optional (future ideas, not committed to)

8. True drag-and-drop tab reordering (would require a new native or JS drag-list dependency).
9. Dynamic/alternate app icons that change based on the user's selected accent color at runtime (iOS supports this via `UIApplication.setAlternateIconName`, but would require pre-generating one icon per accent preset plus additional native wiring — explicitly flagged to the user as a bigger undertaking, not started).
10. EAS Build / paid Apple Developer account to escape the 7-day free-signing reinstall cycle (user explicitly chose the free path over paying $99/year when this tradeoff was discussed).
11. AI Insights could eventually be upgraded from rule-based to actual Claude API calls if the user wants more sophisticated pattern recognition (currently planned as purely local/offline per the original phased plan).

---

**End of handoff. Read `git log --oneline` for the exact chronological commit history if more granular detail on any specific change is needed — commit messages in this project are deliberately descriptive (often 1-2 full sentences) precisely for this kind of continuity purpose.**
