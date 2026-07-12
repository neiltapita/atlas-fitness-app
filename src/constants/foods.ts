export interface SeedFood {
  name: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

// Values are per serving (mostly per 100g unless noted), rounded to common
// reference figures. Good enough for personal tracking, not lab-grade.
export const SEED_FOODS: SeedFood[] = [
  // Proteins
  { name: "Chicken Breast (cooked)", servingSize: 100, servingUnit: "g", calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74 },
  { name: "Chicken Thigh (cooked)", servingSize: 100, servingUnit: "g", calories: 209, protein: 26, carbs: 0, fat: 10.9, fiber: 0, sugar: 0, sodium: 84 },
  { name: "Ground Beef 90/10 (cooked)", servingSize: 100, servingUnit: "g", calories: 176, protein: 20, carbs: 0, fat: 10, fiber: 0, sugar: 0, sodium: 66 },
  { name: "Ground Turkey (cooked)", servingSize: 100, servingUnit: "g", calories: 189, protein: 27, carbs: 0, fat: 8, fiber: 0, sugar: 0, sodium: 79 },
  { name: "Salmon (cooked)", servingSize: 100, servingUnit: "g", calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, sugar: 0, sodium: 59 },
  { name: "Tuna (canned, in water)", servingSize: 100, servingUnit: "g", calories: 116, protein: 26, carbs: 0, fat: 1, fiber: 0, sugar: 0, sodium: 247 },
  { name: "Shrimp (cooked)", servingSize: 100, servingUnit: "g", calories: 99, protein: 24, carbs: 0.2, fat: 0.3, fiber: 0, sugar: 0, sodium: 111 },
  { name: "Egg (whole)", servingSize: 50, servingUnit: "g", calories: 78, protein: 6, carbs: 0.6, fat: 5, fiber: 0, sugar: 0.6, sodium: 62 },
  { name: "Egg Whites", servingSize: 100, servingUnit: "g", calories: 52, protein: 11, carbs: 0.7, fat: 0.2, fiber: 0, sugar: 0.7, sodium: 166 },
  { name: "Tofu (firm)", servingSize: 100, servingUnit: "g", calories: 144, protein: 15, carbs: 3, fat: 8, fiber: 2, sugar: 0.6, sodium: 12 },
  { name: "Whey Protein Powder", servingSize: 32, servingUnit: "g", calories: 120, protein: 24, carbs: 3, fat: 1.5, fiber: 0, sugar: 2, sodium: 130 },
  { name: "Pork Chop (cooked)", servingSize: 100, servingUnit: "g", calories: 231, protein: 25, carbs: 0, fat: 14, fiber: 0, sugar: 0, sodium: 62 },
  { name: "Bacon", servingSize: 100, servingUnit: "g", calories: 541, protein: 37, carbs: 1.4, fat: 42, fiber: 0, sugar: 0, sodium: 1717 },
  { name: "Steak (sirloin, cooked)", servingSize: 100, servingUnit: "g", calories: 206, protein: 29, carbs: 0, fat: 9, fiber: 0, sugar: 0, sodium: 58 },

  // Carbs / grains
  { name: "White Rice (cooked)", servingSize: 100, servingUnit: "g", calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1, sodium: 1 },
  { name: "Brown Rice (cooked)", servingSize: 100, servingUnit: "g", calories: 123, protein: 2.7, carbs: 26, fat: 1, fiber: 1.6, sugar: 0.4, sodium: 4 },
  { name: "Oats (dry)", servingSize: 40, servingUnit: "g", calories: 150, protein: 5.3, carbs: 27, fat: 2.6, fiber: 4, sugar: 0.5, sodium: 0 },
  { name: "Quinoa (cooked)", servingSize: 100, servingUnit: "g", calories: 120, protein: 4.4, carbs: 21, fat: 1.9, fiber: 2.8, sugar: 0.9, sodium: 7 },
  { name: "Whole Wheat Bread", servingSize: 28, servingUnit: "g", calories: 69, protein: 3.6, carbs: 12, fat: 1, fiber: 1.9, sugar: 1.4, sodium: 132 },
  { name: "White Bread", servingSize: 28, servingUnit: "g", calories: 75, protein: 2.6, carbs: 14, fat: 1, fiber: 0.8, sugar: 1.5, sodium: 152 },
  { name: "Pasta (cooked)", servingSize: 100, servingUnit: "g", calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, sugar: 0.6, sodium: 1 },
  { name: "Sweet Potato (baked)", servingSize: 100, servingUnit: "g", calories: 90, protein: 2, carbs: 21, fat: 0.1, fiber: 3.3, sugar: 6.5, sodium: 36 },
  { name: "Potato (baked)", servingSize: 100, servingUnit: "g", calories: 93, protein: 2.5, carbs: 21, fat: 0.1, fiber: 2.2, sugar: 1.2, sodium: 6 },
  { name: "Tortilla (flour)", servingSize: 45, servingUnit: "g", calories: 140, protein: 4, carbs: 24, fat: 3.5, fiber: 1, sugar: 1, sodium: 310 },
  { name: "Bagel", servingSize: 95, servingUnit: "g", calories: 245, protein: 10, carbs: 48, fat: 1.5, fiber: 2, sugar: 5, sodium: 430 },
  { name: "Granola", servingSize: 50, servingUnit: "g", calories: 220, protein: 5, carbs: 34, fat: 8, fiber: 4, sugar: 10, sodium: 60 },

  // Fats / nuts
  { name: "Peanut Butter", servingSize: 32, servingUnit: "g", calories: 190, protein: 8, carbs: 6, fat: 16, fiber: 2, sugar: 3, sodium: 140 },
  { name: "Almonds", servingSize: 28, servingUnit: "g", calories: 164, protein: 6, carbs: 6, fat: 14, fiber: 3.5, sugar: 1.2, sodium: 0 },
  { name: "Walnuts", servingSize: 28, servingUnit: "g", calories: 185, protein: 4.3, carbs: 3.9, fat: 18.5, fiber: 1.9, sugar: 0.7, sodium: 1 },
  { name: "Olive Oil", servingSize: 14, servingUnit: "g", calories: 119, protein: 0, carbs: 0, fat: 13.5, fiber: 0, sugar: 0, sodium: 0 },
  { name: "Avocado", servingSize: 100, servingUnit: "g", calories: 160, protein: 2, carbs: 8.5, fat: 14.7, fiber: 6.7, sugar: 0.7, sodium: 7 },
  { name: "Butter", servingSize: 14, servingUnit: "g", calories: 102, protein: 0.1, carbs: 0, fat: 11.5, fiber: 0, sugar: 0, sodium: 82 },

  // Dairy
  { name: "Greek Yogurt (plain, nonfat)", servingSize: 170, servingUnit: "g", calories: 100, protein: 17, carbs: 6, fat: 0.7, fiber: 0, sugar: 4, sodium: 61 },
  { name: "Milk (whole)", servingSize: 244, servingUnit: "ml", calories: 149, protein: 7.7, carbs: 12, fat: 8, fiber: 0, sugar: 12, sodium: 105 },
  { name: "Milk (skim)", servingSize: 244, servingUnit: "ml", calories: 83, protein: 8.3, carbs: 12, fat: 0.2, fiber: 0, sugar: 12, sodium: 103 },
  { name: "Cottage Cheese", servingSize: 113, servingUnit: "g", calories: 98, protein: 11, carbs: 3.4, fat: 4.3, fiber: 0, sugar: 3.4, sodium: 364 },
  { name: "Cheddar Cheese", servingSize: 28, servingUnit: "g", calories: 113, protein: 7, carbs: 0.4, fat: 9.3, fiber: 0, sugar: 0.1, sodium: 174 },

  // Fruits / vegetables
  { name: "Banana", servingSize: 118, servingUnit: "g", calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sugar: 14, sodium: 1 },
  { name: "Apple", servingSize: 182, servingUnit: "g", calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, sugar: 19, sodium: 2 },
  { name: "Orange", servingSize: 131, servingUnit: "g", calories: 62, protein: 1.2, carbs: 15.4, fat: 0.2, fiber: 3.1, sugar: 12, sodium: 0 },
  { name: "Blueberries", servingSize: 148, servingUnit: "g", calories: 84, protein: 1.1, carbs: 21, fat: 0.5, fiber: 3.6, sugar: 15, sodium: 1 },
  { name: "Strawberries", servingSize: 152, servingUnit: "g", calories: 49, protein: 1, carbs: 12, fat: 0.5, fiber: 3, sugar: 7, sodium: 2 },
  { name: "Broccoli (cooked)", servingSize: 100, servingUnit: "g", calories: 35, protein: 2.4, carbs: 7, fat: 0.4, fiber: 3.3, sugar: 1.4, sodium: 41 },
  { name: "Spinach (raw)", servingSize: 100, servingUnit: "g", calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugar: 0.4, sodium: 79 },
  { name: "Carrots (raw)", servingSize: 100, servingUnit: "g", calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, sugar: 4.7, sodium: 69 },
  { name: "Mixed Salad Greens", servingSize: 85, servingUnit: "g", calories: 15, protein: 1.3, carbs: 2.9, fat: 0.2, fiber: 1.4, sugar: 0.9, sodium: 15 },

  // Drinks
  { name: "Black Coffee", servingSize: 240, servingUnit: "ml", calories: 2, protein: 0.3, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 5 },
  { name: "Orange Juice", servingSize: 248, servingUnit: "ml", calories: 112, protein: 1.7, carbs: 26, fat: 0.5, fiber: 0.5, sugar: 21, sodium: 2 },
  { name: "Protein Shake (ready-to-drink)", servingSize: 330, servingUnit: "ml", calories: 160, protein: 30, carbs: 5, fat: 3, fiber: 1, sugar: 2, sodium: 190 },
  { name: "Soda (cola)", servingSize: 355, servingUnit: "ml", calories: 140, protein: 0, carbs: 39, fat: 0, fiber: 0, sugar: 39, sodium: 45 },
  { name: "Beer (regular)", servingSize: 355, servingUnit: "ml", calories: 153, protein: 1.6, carbs: 13, fat: 0, fiber: 0, sugar: 0, sodium: 14 },

  // Snacks / other
  { name: "Protein Bar", servingSize: 60, servingUnit: "g", calories: 210, protein: 20, carbs: 22, fat: 7, fiber: 9, sugar: 2, sodium: 200 },
  { name: "Potato Chips", servingSize: 28, servingUnit: "g", calories: 152, protein: 2, carbs: 15, fat: 10, fiber: 1, sugar: 0.1, sodium: 149 },
  { name: "Dark Chocolate (70%)", servingSize: 28, servingUnit: "g", calories: 170, protein: 2.2, carbs: 13, fat: 12, fiber: 3.1, sugar: 7, sodium: 6 },
  { name: "Rice Cakes", servingSize: 9, servingUnit: "g", calories: 35, protein: 0.7, carbs: 7.3, fat: 0.3, fiber: 0.4, sugar: 0.1, sodium: 15 },
];
