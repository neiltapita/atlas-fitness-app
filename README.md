# Atlas

A personal, offline-first fitness platform for iPhone. A full workout tracker with
per-set weight/reps/RPE logging and reusable templates, plus a nutrition and macro
tracker with AI photo food recognition, in one app. Built solo with Claude, Expo, React
Native, and TypeScript, backed by a single local SQLite database. There is no backend,
no login, and no account system — everything lives on your phone. The only feature
that ever touches the network is AI photo food logging, which is opt-in and uses your
own free Gemini API key.

## Features

### Workouts

- **Home** — today's workout, last finished workout, weekly workout count, current
  streak, recent personal records, and a Quick Start button.
- **Workout tab** — start an empty workout, create a named one, repeat a previous
  workout with the same exercises pre-loaded, or start from a saved template.
- **Active workout** — add exercises from a ~130-exercise built-in library or your own
  custom ones, log weight/reps/RPE/notes per set (decimal weights supported), mark
  sets complete with haptic feedback, and track elapsed time with a live timer.
  Automatically computes total volume, best set, and personal records when you finish.
- **Templates** — full CRUD for reusable workout templates (e.g. "Push Day"), each
  with real per-set weight/reps rows, not just a set-count. Per-exercise menu for
  notes, sticky notes (shown as a banner), warm-up sets, replacing an exercise, or
  removing it. Starting a workout from a template requires an explicit tap, so opening
  one to review it doesn't accidentally start a session.
- **History** — a calendar view of every day you've trained.
- **Progress** — weight and volume progression charts, exercise history, bodyweight
  tracking, and a best-lift table (including a Bench/Squat/Deadlift callout). Personal
  records use the Epley formula to estimate 1-rep max.

### Nutrition

- **Nutrition tab** — date navigator, calorie/macro summary with progress bars, a
  water tracker (mL/L/fl oz/gal, configurable), a log of the day's entries grouped by
  meal, and a 7-day calorie trend chart.
- **Log food** — search a ~60-item built-in food library, favorite foods, or create
  your own custom entries. Calories are never entered directly — they're always
  derived live from protein/carbs/fat via the 4/4/9 rule, so the two can never
  disagree.
- **Reusable meals** — save a combination of foods once (e.g. "Protein Shake") and log
  the whole thing in a tap, with adjustable per-food serving quantities.
- **AI photo food logging** — take or pick a photo of a meal and get an editable
  per-item calorie/macro breakdown before confirming and logging it. This is the only
  feature that calls out to the internet (Google's Gemini vision API, called directly
  from the device) and **requires your own free Gemini API key** — see
  [Requirements](#requirements) below. Photos are resized client-side before sending
  to keep requests small.
- **Nutrition goals** — set protein/carb/fat targets in Settings; daily calorie goal
  auto-derives from those via 4/4/9 so it can't drift out of sync.

### Settings & personalization

- Units (lb/kg), default rest timer, nutrition goals, water goal/unit.
- Full light/dark theme with a user-selectable accent color (8 presets, gold by
  default) — reactive everywhere, no restart required.
- Reorderable bottom tabs (up/down controls).
- AI photo logging API key entry (stored in `expo-secure-store`, never touches the
  SQLite database).
- Export/import all data as a single JSON file (workouts, templates, nutrition —
  everything) via the iOS share sheet.

## Design

Atlas is styled as a minimal, premium black/charcoal/gold interface, deliberately
modeled after Apple Fitness, Apple Health, Notion, and Linear rather than typical
"gym bro" fitness app branding — no gradients, neon colors, or skeuomorphism. The app
icon is a single hero barbell mark (white bar, gold plates) with dedicated light,
dark, and tinted variants for iOS 26.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 54 (managed workflow; `expo prebuild` / `expo run:ios` for native builds) |
| UI | React Native 0.81, TypeScript (strict mode) |
| Navigation | Expo Router (file-based routing) |
| Database | `expo-sqlite` (async API), single local file, no backend |
| Charts | `react-native-chart-kit` + `react-native-svg` |
| Animation | `react-native-reanimated` + `react-native-worklets` |
| Photos | `expo-image-picker` + `expo-image-manipulator` |
| Secure storage | `expo-secure-store` (Gemini API key only) |
| AI | Google Gemini vision API, called directly via `fetch()` — no SDK dependency |

## Requirements

- Node.js 18+ and npm installed on your computer
- Either the **Expo Go** app on your iPhone for quick iteration, or a Mac with Xcode
  for a standalone on-device build (see below)
- Your computer and iPhone on the same Wi-Fi network (Expo Go path only)
- **Optional**: a free [Gemini API key](https://aistudio.google.com/apikey) if you
  want to use AI photo food logging. Every other feature works fully offline with no key.

## Install & run

### Quick iteration (Expo Go)

```bash
cd gym-tracker
npm install
npx expo start
```

Scan the printed QR code with your iPhone's Camera app, or open it from inside Expo
Go. If your network blocks local device-to-device traffic, use `npx expo start --tunnel`
instead.

### Standalone on-device build (works fully offline afterward, no Mac needed once installed)

```bash
cd gym-tracker
npx expo run:ios --device --configuration Release
```

Requires your iPhone connected via USB and Developer Mode enabled on the device
(Settings → Privacy & Security → Developer Mode). This app isn't distributed via the
App Store, so it's signed with a free personal Apple ID, which means the install
**expires after about 7 days** — just reconnect and rerun the command to refresh it.

If you change `app.json` (icons, permissions, native config) or add a native
dependency, delete the generated native folders first so the change actually takes
effect:

```bash
rm -rf ios android
```

The first launch creates a local SQLite database (`gymtracker.db`) on your phone and
seeds the exercise and food libraries. Seeding is idempotent by name, so it's safe to
grow the seed lists later without wiping existing data.

## Project structure

```
gym-tracker/
├── app/                          # Expo Router screens (file-based routing)
│   ├── _layout.tsx               # Root: SQLite provider + migrations, contexts, stack
│   ├── (tabs)/                   # Bottom tab navigator (order is user-configurable)
│   │   ├── index.tsx             # Home
│   │   ├── workout.tsx           # Start/repeat/templates
│   │   ├── nutrition.tsx         # Nutrition tab
│   │   ├── history.tsx
│   │   ├── progress.tsx
│   │   └── settings.tsx
│   ├── workout/                  # create.tsx, active.tsx, [id].tsx
│   ├── exercise/                 # picker.tsx (shared across 3 flows), [id].tsx
│   ├── templates/                # index.tsx, create.tsx, [id].tsx
│   └── nutrition/                # log.tsx, photo.tsx, meals/
├── src/
│   ├── components/                # Card, SetRow, PrimaryButton, LineChartCard, etc.
│   ├── constants/                 # theme.ts, exercises.ts, foods.ts, tabs.ts
│   ├── context/                   # ActiveWorkout, Settings, Theme
│   ├── db/
│   │   ├── schema.ts              # CREATE TABLE + migrations
│   │   ├── seed.ts                # Idempotent exercise/food seeding
│   │   ├── queries.ts             # Workout/template/settings queries
│   │   └── nutritionQueries.ts    # Nutrition-domain queries
│   ├── types/                     # Shared TypeScript types
│   └── utils/                     # aiVision, apiKeyStore, imageResize, exportImport, etc.
├── assets/                        # icon.png, icon-light/dark/tinted.png, adaptive-icon.png
└── app.json
```

## Database

A single local SQLite file holds everything, split across two domains:

**Workouts**: `usersettings`, `exercises`, `workouts`, `workout_exercises`, `sets`,
`personal_records`, `bodyweight_entries`, `workout_templates`, `template_exercises`,
`template_sets`.

**Nutrition**: `food_brands`, `foods`, `meals`, `meal_items`, `nutrition_entries`
(macros are denormalized/snapshotted at log time so later edits to a food don't
retroactively change history), `daily_logs` (water).

Schema changes to existing tables go through a migrations list run on every launch
(idempotent — safe to run repeatedly on an existing install).

## Export / import

Settings → Export Data writes a JSON file with your entire database — workouts,
templates, nutrition, everything — and opens the share sheet. Import restores from a
previously exported file, merging exercises/foods by name so the built-in library
isn't duplicated, and asks for confirmation since it replaces your current data.

## Notes on this build

This is a personal-use project, not configured for App Store distribution — no Apple
Developer Program account is required, just a free personal Apple ID (with the 7-day
signing caveat noted above) or Expo Go for quick testing.
