# Atlas

A personal, offline-first fitness platform for iPhone. Built with
Expo, React Native, TypeScript, Expo Router, and a local SQLite database. There is no
backend, no login, and no network calls — everything lives on your phone.

## Features

- **Home** — today's workout, last workout, weekly workout count, current streak,
  recent personal records, and a Quick Start button.
- **Workout** — start an empty workout, create a named one, or repeat a previous
  workout with the same exercises pre-loaded.
- **Active workout** — add exercises from a built-in library or your own custom ones,
  log weight/reps/RPE/notes per set, mark sets complete, and get a rest timer (with a
  local notification) between sets. Automatically computes total volume, best set,
  and personal records when you finish.
- **History** — a calendar view of every day you've trained, with a list of workouts
  for the selected day/month.
- **Progress** — weight progression and volume progression charts, exercise history
  by exercise, bodyweight tracking, and a "best lift" table for every exercise
  (including a Bench/Squat/Deadlift big-three callout).
- **Nutrition** — log food from a searchable library or your own custom entries,
  save reusable meals, and track daily calories/macros/water against goals you set.
- **AI photo food logging** — snap or pick a photo of a meal and get an editable
  per-item calorie/macro breakdown before logging it. This feature calls the Claude
  API directly from your device and **requires your own Anthropic API key**, entered
  in Settings → AI Photo Logging and stored locally in the device's secure storage.
  It's the only feature in the app that makes a network call; everything else is
  fully offline. You'll need your own Anthropic account with API credits — see
  [console.anthropic.com](https://console.anthropic.com) to generate a key.
- **Settings** — switch units (lb/kg), set your default rest timer, and export/import
  all of your data as a single JSON file.

## Tech stack

- Expo SDK 51 (managed workflow, works in Expo Go)
- Expo Router (file-based navigation)
- TypeScript
- `expo-sqlite` (new async API) for local storage
- `expo-notifications` for rest timer alerts
- `react-native-chart-kit` + `react-native-svg` for charts

## Requirements

- Node.js 18+ and npm installed on your computer
- The **Expo Go** app installed on your iPhone (free, from the App Store)
- Your computer and iPhone on the same Wi-Fi network
- **Optional**: an [Anthropic API key](https://console.anthropic.com) if you want to
  use AI photo food logging. Everything else in the app works fully offline with no
  key at all.

## Install & run

```bash
cd gym-tracker
npm install
npx expo start
```

This prints a QR code in your terminal. Open the **Camera** app on your iPhone, point
it at the QR code, and tap the notification to open the project in Expo Go. (If it
doesn't open Expo Go automatically, open Expo Go first and scan the code from inside
the app.)

The first launch creates a local SQLite database (`gymtracker.db`) on your phone and
seeds it with the full exercise library plus a few sample workouts so the app isn't
empty. You can delete the sample workouts from the workout detail screen at any time
— they don't affect your real data.

### If the QR code doesn't connect

- Make sure your phone and computer are on the same network.
- If your network blocks local traffic between devices (common on some office/school
  Wi-Fi), run `npx expo start --tunnel` instead — it's slower to load but works over
  any network.

## Project structure

```
gym-tracker/
├── app/                        # Expo Router screens (file-based routing)
│   ├── _layout.tsx             # Root layout: SQLite provider, contexts, stack
│   ├── +not-found.tsx
│   ├── (tabs)/                 # Bottom tab navigator
│   │   ├── _layout.tsx
│   │   ├── index.tsx           # Home
│   │   ├── workout.tsx         # Workout tab (start/repeat)
│   │   ├── history.tsx         # Calendar + workout list
│   │   ├── progress.tsx        # Charts, PRs, bodyweight
│   │   └── settings.tsx        # Units, rest timer, export/import
│   ├── workout/
│   │   ├── create.tsx          # Name a new workout (modal)
│   │   ├── active.tsx          # Live workout logging screen
│   │   └── [id].tsx            # Read-only past workout detail
│   └── exercise/
│       ├── picker.tsx          # Search/filter/create exercise (modal)
│       └── [id].tsx            # Exercise detail: PRs + history chart
├── src/
│   ├── components/             # Reusable UI (Card, SetRow, charts, etc.)
│   ├── constants/               # Theme tokens + seed exercise library
│   ├── context/                 # ActiveWorkoutContext (rest timer, session),
│   │                            # SettingsContext (units, rest duration)
│   ├── db/
│   │   ├── schema.ts            # CREATE TABLE statements
│   │   ├── seed.ts              # Exercise library + sample workout seeding
│   │   └── queries.ts           # All SQL access (typed)
│   ├── types/                   # Shared TypeScript types
│   └── utils/                   # Calculations, date formatting, export/import
├── app.json
├── babel.config.js
├── metro.config.js
├── tsconfig.json
└── package.json
```

## Database schema

All tables live in a single local SQLite database file on your device:

- `usersettings` — units (lb/kg), default rest timer length
- `exercises` — the exercise library (built-in + custom), muscle group, equipment,
  favorite flag
- `workouts` — one row per workout session (name, date, start/finish time, notes)
- `workout_exercises` — join table linking a workout to the exercises performed in it
- `sets` — every logged set (weight, reps, RPE, notes, completed flag, rest seconds)
- `personal_records` — best set per exercise (by estimated 1-rep max), recorded when
  a workout is finished
- `bodyweight_entries` — bodyweight log over time

Personal records use the Epley formula (`weight × (1 + reps / 30)`) to estimate
1-rep max so that, say, a heavy 5-rep set can still beat a lighter 1-rep set.

## Export / import

Settings → Export Data writes a JSON file with everything in your database and opens
the iOS share sheet (AirDrop it to yourself, save to Files, email it, etc. — it's
just a file). Settings → Import Data lets you pick a previously exported JSON file
and restores it, matching exercises by name so your existing built-in library isn't
duplicated. Importing replaces your current workout history, so it will ask you to
confirm first.

## Notes on this build

- This is a personal-use app, not configured for App Store distribution — no Apple
  Developer account or build step is required, just Expo Go.
- Node.js/npm were not available in the environment this app was generated in, so the
  install/build could not be executed or screenshotted here. Everything has been
  written and cross-checked by hand for consistency (imports, types, query
  signatures, route names), but you should run `npm install && npx expo start` as the
  first real test. If anything surfaces, the most likely spots are third-party
  package version mismatches for whatever Expo SDK is current when you install —
  run `npx expo install --check` after `npm install` to have Expo align dependency
  versions automatically.
