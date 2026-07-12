import { Macros } from "@/types";

export interface AIFoodItem extends Macros {
  name: string;
  quantityDescription: string;
}

const SYSTEM_PROMPT = `You are a nutrition estimation assistant. You will be shown a photo of a meal.
Identify each distinguishable food component (e.g. a Chipotle bowl might be "White Rice", "Black Beans", "Grilled Chicken", "Cheese", "Guacamole"). If the dish truly can't be broken down, return it as a single item.
For each item, estimate a realistic serving quantity and its macros as consumed.
Respond with ONLY a JSON object and nothing else — no markdown code fences, no prose before or after — of this exact shape:
{
  "items": [
    {
      "name": string,
      "quantityDescription": string,  // e.g. "1 cup (150g)"
      "calories": number,
      "protein": number,   // grams
      "carbs": number,     // grams
      "fat": number,       // grams
      "fiber": number,     // grams
      "sugar": number,     // grams
      "sodium": number     // milligrams
    }
  ]
}
These are estimates from a photo, not lab measurements — use your best judgment and common nutrition data for similar foods.`;

export class AIVisionError extends Error {}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return fenced ? fenced[1].trim() : text.trim();
}

/**
 * Sends a meal photo to Claude's vision API and returns estimated,
 * per-component macro breakdowns. Never persists anything itself — callers
 * must show the results for user confirmation before saving.
 */
export async function identifyFoodPhoto(base64Image: string, apiKey: string): Promise<AIFoodItem[]> {
  if (!apiKey) {
    throw new AIVisionError("No Claude API key set. Add one in Settings to use photo logging.");
  }

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: "image/jpeg", data: base64Image },
              },
              { type: "text", text: "Identify the foods in this photo and estimate their macros." },
            ],
          },
        ],
      }),
    });
  } catch {
    throw new AIVisionError("Couldn't reach Claude. Check your internet connection and try again.");
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new AIVisionError("Claude rejected the API key. Check it in Settings.");
    }
    throw new AIVisionError(`Claude request failed (status ${response.status}).`);
  }

  const json = await response.json();
  const content: string | undefined = json?.content?.[0]?.text;
  if (!content) {
    throw new AIVisionError("Claude returned an empty response.");
  }

  let parsed: { items?: unknown[] };
  try {
    parsed = JSON.parse(extractJson(content));
  } catch {
    throw new AIVisionError("Couldn't parse Claude's response.");
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
