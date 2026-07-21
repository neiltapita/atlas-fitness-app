import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { UserSettings, WaterUnit } from "@/types";
import { getSettings, updateSettings } from "@/db/queries";
import { DEFAULT_TAB_ORDER } from "@/constants/tabs";

interface SettingsContextValue {
  settings: UserSettings;
  loading: boolean;
  setUnits: (units: "kg" | "lb") => Promise<void>;
  setDefaultRestSeconds: (seconds: number) => Promise<void>;
  setTheme: (theme: "dark" | "light") => Promise<void>;
  setAccentColor: (color: string) => Promise<void>;
  setWaterUnit: (unit: WaterUnit) => Promise<void>;
  setTabOrder: (order: string[]) => Promise<void>;
  setSex: (sex: "male" | "female") => Promise<void>;
  setNutritionGoals: (goals: {
    dailyCalorieGoal: number;
    proteinGoalG: number;
    carbGoalG: number;
    fatGoalG: number;
    waterGoalMl: number;
  }) => Promise<void>;
  refresh: () => Promise<void>;
}

const defaultSettings: UserSettings = {
  id: 1,
  units: "lb",
  defaultRestSeconds: 90,
  theme: "dark",
  accentColor: "#FF6B35",
  dailyCalorieGoal: 2200,
  proteinGoalG: 150,
  carbGoalG: 220,
  fatGoalG: 70,
  waterGoalMl: 2500,
  waterUnit: "mL",
  tabOrder: DEFAULT_TAB_ORDER,
  sex: "male",
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const s = await getSettings(db);
    setSettings(s);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setUnits = useCallback(
    async (units: "kg" | "lb") => {
      await updateSettings(db, { units });
      setSettings((prev) => ({ ...prev, units }));
    },
    [db]
  );

  const setDefaultRestSeconds = useCallback(
    async (seconds: number) => {
      await updateSettings(db, { defaultRestSeconds: seconds });
      setSettings((prev) => ({ ...prev, defaultRestSeconds: seconds }));
    },
    [db]
  );

  const setTheme = useCallback(
    async (theme: "dark" | "light") => {
      await updateSettings(db, { theme });
      setSettings((prev) => ({ ...prev, theme }));
    },
    [db]
  );

  const setAccentColor = useCallback(
    async (accentColor: string) => {
      await updateSettings(db, { accentColor });
      setSettings((prev) => ({ ...prev, accentColor }));
    },
    [db]
  );

  const setWaterUnit = useCallback(
    async (waterUnit: WaterUnit) => {
      await updateSettings(db, { waterUnit });
      setSettings((prev) => ({ ...prev, waterUnit }));
    },
    [db]
  );

  const setTabOrder = useCallback(
    async (tabOrder: string[]) => {
      await updateSettings(db, { tabOrder });
      setSettings((prev) => ({ ...prev, tabOrder }));
    },
    [db]
  );

  const setSex = useCallback(
    async (sex: "male" | "female") => {
      await updateSettings(db, { sex });
      setSettings((prev) => ({ ...prev, sex }));
    },
    [db]
  );

  const setNutritionGoals = useCallback(
    async (goals: {
      dailyCalorieGoal: number;
      proteinGoalG: number;
      carbGoalG: number;
      fatGoalG: number;
      waterGoalMl: number;
    }) => {
      await updateSettings(db, goals);
      setSettings((prev) => ({ ...prev, ...goals }));
    },
    [db]
  );

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        setUnits,
        setDefaultRestSeconds,
        setTheme,
        setAccentColor,
        setWaterUnit,
        setTabOrder,
        setSex,
        setNutritionGoals,
        refresh,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
