import type { SQLiteDatabase } from "expo-sqlite";
import {
  DailyNutritionSummary,
  Food,
  Macros,
  MacroTotalsByDate,
  Meal,
  MealDetail,
  MealItem,
  MealType,
  NutritionEntry,
} from "@/types";

// ---------- Row shapes coming back from SQLite (snake_case) ----------

interface FoodRow {
  id: number;
  name: string;
  brand_id: number | null;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  is_custom: number;
  is_favorite: number;
  brand_name?: string | null;
}

function mapFood(row: FoodRow): Food {
  return {
    id: row.id,
    name: row.name,
    brandId: row.brand_id,
    brandName: row.brand_name ?? undefined,
    servingSize: row.serving_size,
    servingUnit: row.serving_unit,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    fiber: row.fiber,
    sugar: row.sugar,
    sodium: row.sodium,
    isCustom: !!row.is_custom,
    isFavorite: !!row.is_favorite,
  };
}

const FOOD_SELECT = `
  SELECT f.*, fb.name as brand_name
  FROM foods f
  LEFT JOIN food_brands fb ON fb.id = f.brand_id
`;

// ================= Foods =================

export async function searchFoods(db: SQLiteDatabase, query: string): Promise<Food[]> {
  const rows = await db.getAllAsync<FoodRow>(
    `${FOOD_SELECT} WHERE f.name LIKE ? ORDER BY f.is_favorite DESC, f.name ASC LIMIT 100;`,
    [`%${query}%`]
  );
  return rows.map(mapFood);
}

export async function getFavoriteFoods(db: SQLiteDatabase): Promise<Food[]> {
  const rows = await db.getAllAsync<FoodRow>(
    `${FOOD_SELECT} WHERE f.is_favorite = 1 ORDER BY f.name ASC;`
  );
  return rows.map(mapFood);
}

export async function getFoodById(db: SQLiteDatabase, id: number): Promise<Food | null> {
  const row = await db.getFirstAsync<FoodRow>(`${FOOD_SELECT} WHERE f.id = ?;`, [id]);
  return row ? mapFood(row) : null;
}

export async function toggleFavoriteFood(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`UPDATE foods SET is_favorite = NOT is_favorite WHERE id = ?;`, [id]);
}

export async function createCustomFood(
  db: SQLiteDatabase,
  food: {
    name: string;
    brandName?: string;
    servingSize: number;
    servingUnit: string;
  } & Macros
): Promise<number> {
  let brandId: number | null = null;
  if (food.brandName && food.brandName.trim()) {
    const existing = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM food_brands WHERE name = ?;`,
      [food.brandName.trim()]
    );
    if (existing) {
      brandId = existing.id;
    } else {
      const result = await db.runAsync(`INSERT INTO food_brands (name) VALUES (?);`, [
        food.brandName.trim(),
      ]);
      brandId = result.lastInsertRowId;
    }
  }
  const result = await db.runAsync(
    `INSERT INTO foods (name, brand_id, serving_size, serving_unit, calories, protein, carbs, fat, fiber, sugar, sodium, is_custom, is_favorite)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0);`,
    [
      food.name,
      brandId,
      food.servingSize,
      food.servingUnit,
      food.calories,
      food.protein,
      food.carbs,
      food.fat,
      food.fiber,
      food.sugar,
      food.sodium,
    ]
  );
  return result.lastInsertRowId;
}

export async function deleteFood(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM foods WHERE id = ?;`, [id]);
}

// ================= Meals (reusable combos of foods) =================

interface MealItemRow {
  id: number;
  meal_id: number;
  food_id: number;
  quantity: number;
  order_index: number;
  food_name: string;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

function mapMealItem(row: MealItemRow): MealItem {
  return {
    id: row.id,
    mealId: row.meal_id,
    foodId: row.food_id,
    quantity: row.quantity,
    orderIndex: row.order_index,
    foodName: row.food_name,
    servingSize: row.serving_size,
    servingUnit: row.serving_unit,
  };
}

export async function createMeal(db: SQLiteDatabase, name: string): Promise<number> {
  const result = await db.runAsync(`INSERT INTO meals (name, created_at) VALUES (?, ?);`, [
    name,
    new Date().toISOString(),
  ]);
  return result.lastInsertRowId;
}

export async function deleteMeal(db: SQLiteDatabase, mealId: number): Promise<void> {
  await db.runAsync(`DELETE FROM meals WHERE id = ?;`, [mealId]);
}

export async function renameMeal(db: SQLiteDatabase, mealId: number, name: string): Promise<void> {
  await db.runAsync(`UPDATE meals SET name = ? WHERE id = ?;`, [name, mealId]);
}

export async function getMeals(db: SQLiteDatabase): Promise<Meal[]> {
  const rows = await db.getAllAsync<{ id: number; name: string; created_at: string }>(
    `SELECT * FROM meals ORDER BY created_at DESC;`
  );
  return rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at }));
}

export async function addFoodToMeal(
  db: SQLiteDatabase,
  mealId: number,
  foodId: number,
  quantity = 1
): Promise<number> {
  const countRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM meal_items WHERE meal_id = ?;`,
    [mealId]
  );
  const result = await db.runAsync(
    `INSERT INTO meal_items (meal_id, food_id, quantity, order_index) VALUES (?, ?, ?, ?);`,
    [mealId, foodId, quantity, countRow?.count ?? 0]
  );
  return result.lastInsertRowId;
}

export async function removeMealItem(db: SQLiteDatabase, mealItemId: number): Promise<void> {
  await db.runAsync(`DELETE FROM meal_items WHERE id = ?;`, [mealItemId]);
}

export async function updateMealItemQuantity(
  db: SQLiteDatabase,
  mealItemId: number,
  quantity: number
): Promise<void> {
  await db.runAsync(`UPDATE meal_items SET quantity = ? WHERE id = ?;`, [quantity, mealItemId]);
}

export async function getMealDetail(
  db: SQLiteDatabase,
  mealId: number
): Promise<MealDetail | null> {
  const meal = await db.getFirstAsync<{ id: number; name: string; created_at: string }>(
    `SELECT * FROM meals WHERE id = ?;`,
    [mealId]
  );
  if (!meal) return null;

  const rows = await db.getAllAsync<MealItemRow>(
    `SELECT mi.*, f.name as food_name, f.serving_size, f.serving_unit, f.calories, f.protein, f.carbs, f.fat, f.fiber, f.sugar, f.sodium
     FROM meal_items mi
     JOIN foods f ON f.id = mi.food_id
     WHERE mi.meal_id = ?
     ORDER BY mi.order_index ASC;`,
    [mealId]
  );

  const totals: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
  for (const r of rows) {
    totals.calories += r.calories * r.quantity;
    totals.protein += r.protein * r.quantity;
    totals.carbs += r.carbs * r.quantity;
    totals.fat += r.fat * r.quantity;
    totals.fiber += r.fiber * r.quantity;
    totals.sugar += r.sugar * r.quantity;
    totals.sodium += r.sodium * r.quantity;
  }

  return {
    id: meal.id,
    name: meal.name,
    createdAt: meal.created_at,
    items: rows.map(mapMealItem),
    totals,
  };
}

// ================= Nutrition entries (the actual daily log) =================

interface NutritionEntryRow {
  id: number;
  date: string;
  logged_at: string;
  meal_type: string;
  food_id: number | null;
  meal_id: number | null;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  label: string;
}

function mapNutritionEntry(row: NutritionEntryRow): NutritionEntry {
  return {
    id: row.id,
    date: row.date,
    loggedAt: row.logged_at,
    mealType: row.meal_type as MealType,
    foodId: row.food_id,
    mealId: row.meal_id,
    quantity: row.quantity,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    fiber: row.fiber,
    sugar: row.sugar,
    sodium: row.sodium,
    label: row.label,
  };
}

const NUTRITION_ENTRY_SELECT = `
  SELECT ne.*, COALESCE(f.name, m.name) as label
  FROM nutrition_entries ne
  LEFT JOIN foods f ON f.id = ne.food_id
  LEFT JOIN meals m ON m.id = ne.meal_id
`;

export async function logFood(
  db: SQLiteDatabase,
  date: string,
  mealType: MealType,
  foodId: number,
  quantity: number
): Promise<number> {
  const food = await getFoodById(db, foodId);
  if (!food) throw new Error("Food not found");
  const result = await db.runAsync(
    `INSERT INTO nutrition_entries (date, logged_at, meal_type, food_id, meal_id, quantity, calories, protein, carbs, fat, fiber, sugar, sodium)
     VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      date,
      new Date().toISOString(),
      mealType,
      foodId,
      quantity,
      food.calories * quantity,
      food.protein * quantity,
      food.carbs * quantity,
      food.fat * quantity,
      food.fiber * quantity,
      food.sugar * quantity,
      food.sodium * quantity,
    ]
  );
  return result.lastInsertRowId;
}

export async function logMeal(
  db: SQLiteDatabase,
  date: string,
  mealType: MealType,
  mealId: number,
  quantity = 1
): Promise<number> {
  const detail = await getMealDetail(db, mealId);
  if (!detail) throw new Error("Meal not found");
  const result = await db.runAsync(
    `INSERT INTO nutrition_entries (date, logged_at, meal_type, food_id, meal_id, quantity, calories, protein, carbs, fat, fiber, sugar, sodium)
     VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      date,
      new Date().toISOString(),
      mealType,
      mealId,
      quantity,
      detail.totals.calories * quantity,
      detail.totals.protein * quantity,
      detail.totals.carbs * quantity,
      detail.totals.fat * quantity,
      detail.totals.fiber * quantity,
      detail.totals.sugar * quantity,
      detail.totals.sodium * quantity,
    ]
  );
  return result.lastInsertRowId;
}

export async function deleteNutritionEntry(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM nutrition_entries WHERE id = ?;`, [id]);
}

export async function getNutritionEntriesForDate(
  db: SQLiteDatabase,
  date: string
): Promise<NutritionEntry[]> {
  const rows = await db.getAllAsync<NutritionEntryRow>(
    `${NUTRITION_ENTRY_SELECT} WHERE ne.date = ? ORDER BY ne.logged_at ASC;`,
    [date]
  );
  return rows.map(mapNutritionEntry);
}

export async function getDailySummary(
  db: SQLiteDatabase,
  date: string
): Promise<DailyNutritionSummary> {
  const entries = await getNutritionEntriesForDate(db, date);
  const totals: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
  for (const e of entries) {
    totals.calories += e.calories;
    totals.protein += e.protein;
    totals.carbs += e.carbs;
    totals.fat += e.fat;
    totals.fiber += e.fiber;
    totals.sugar += e.sugar;
    totals.sodium += e.sodium;
  }
  const water = await getWaterForDate(db, date);
  return { date, ...totals, waterMl: water, entries };
}

/** Daily macro totals for a date range (inclusive), for charting. Dates with no logs are omitted. */
export async function getDailyTotalsRange(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string
): Promise<MacroTotalsByDate[]> {
  const rows = await db.getAllAsync<{
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
  }>(
    `SELECT date,
       SUM(calories) as calories,
       SUM(protein) as protein,
       SUM(carbs) as carbs,
       SUM(fat) as fat,
       SUM(fiber) as fiber,
       SUM(sugar) as sugar,
       SUM(sodium) as sodium
     FROM nutrition_entries
     WHERE date >= ? AND date <= ?
     GROUP BY date
     ORDER BY date ASC;`,
    [startDate, endDate]
  );
  return rows;
}

// ================= Water / daily_logs =================

export async function getWaterForDate(db: SQLiteDatabase, date: string): Promise<number> {
  const row = await db.getFirstAsync<{ water_ml: number }>(
    `SELECT water_ml FROM daily_logs WHERE date = ?;`,
    [date]
  );
  return row?.water_ml ?? 0;
}

export async function addWater(db: SQLiteDatabase, date: string, deltaMl: number): Promise<void> {
  await db.runAsync(
    `INSERT INTO daily_logs (date, water_ml) VALUES (?, ?)
     ON CONFLICT(date) DO UPDATE SET water_ml = MAX(0, water_ml + excluded.water_ml);`,
    [date, deltaMl]
  );
}
