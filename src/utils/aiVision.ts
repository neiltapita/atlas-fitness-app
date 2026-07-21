import { Macros } from "@/types";

export interface AIFoodItem extends Macros {
  name: string;
  quantityDescription: string;
}

const PROMPT = `You are a nutrition estimation assistant. You will be shown a photo of a meal.
Identify each distinguishable food component (e.g. a Chipotle bowl might be "White Rice", "Black Beans", "Grilled Chicken", "Cheese", "Guacamole"). If the dish truly can't be broken down, return it as a single item.
For each item, estimate a realistic serving quantity and its macros as consumed.
These are estimates from a photo, not lab measurements — use your best judgment and common nutrition data for similar foods.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          quantityDescription: { type: "STRING", description: 'e.g. "1 cup (150g)"' },
          calories: { type: "NUMBER" },
          protein: { type: "NUMBER", description: "grams" },
          carbs: { type: "NUMBER", description: "grams" },
          fat: { type: "NUMBER", description: "grams" },
          fiber: { type: "NUMBER", description: "grams" },
          sugar: { type: "NUMBER", description: "grams" },
          sodium: { type: "NUMBER", description: "milligrams" },
        },
        required: ["name", "quantityDescription", "calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"],
      },
    },
  },
  required: ["items"],
};

const MODEL = "gemini-3.5-flash";

export class AIVisionError extends Error {}

/**
 * Sends a meal photo to Gemini's vision API and returns estimated,
 * per-component macro breakdowns. Never persists anything itself — callers
 * must show the results for user confirmation before saving.
 */
export async function identifyFoodPhoto(base64Image: string, apiKey: string): Promise<AIFoodItem[]> {
  if (!apiKey) {
    throw new AIVisionError("No Gemini API key set. Add one in Settings to use photo logging.");
  }

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `${PROMPT}\n\nIdentify the foods in this photo and estimate their macros.` },
                { inline_data: { mime_type: "image/jpeg", data: base64Image } },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      }
    );
  } catch {
    throw new AIVisionError("Couldn't reach Gemini. Check your internet connection and try again.");
  }

  if (!response.ok) {
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      throw new AIVisionError("Gemini rejected the API key. Check it in Settings.");
    }
    throw new AIVisionError(`Gemini request failed (status ${response.status}).`);
  }

  const json = await response.json();
  const content: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new AIVisionError("Gemini returned an empty response.");
  }

  let parsed: { items?: unknown[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new AIVisionError("Couldn't parse Gemini's response.");
  }

  if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
    throw new AIVisionError("No foods were recognized in that photo.");
  }

  return parsed.items.map((raw) => {
    const item = raw as Record<string, unknown>;
    return {
      name: String(item.name ?? "Unknown food"),
      quantityDescription: String(item.quantityDescription ?? ""),
      calories: Number(item.calories) || 0,
      protein: Number(item.protein) || 0,
      carbs: Number(item.carbs) || 0,
      fat: Number(item.fat) || 0,
      fiber: Number(item.fiber) || 0,
      sugar: Number(item.sugar) || 0,
      sodium: Number(item.sodium) || 0,
    };
  });
}
