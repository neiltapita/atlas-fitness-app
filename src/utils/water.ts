import { WaterUnit } from "@/types";

const ML_PER_UNIT: Record<WaterUnit, number> = {
  mL: 1,
  L: 1000,
  "fl oz": 29.5735,
  gal: 3785.41,
};

export function mlToUnit(ml: number, unit: WaterUnit): number {
  return ml / ML_PER_UNIT[unit];
}

export function unitToMl(value: number, unit: WaterUnit): number {
  return value * ML_PER_UNIT[unit];
}

export function formatWater(ml: number, unit: WaterUnit): string {
  const value = mlToUnit(ml, unit);
  const decimals = unit === "mL" ? 0 : unit === "gal" ? 2 : 1;
  return `${value.toFixed(decimals)} ${unit}`;
}
