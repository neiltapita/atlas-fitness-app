import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import {
  getInProgressWorkout,
  createWorkout,
  finishWorkout,
  deleteWorkout,
  startWorkoutFromTemplate,
} from "@/db/queries";

interface ActiveWorkoutContextValue {
  activeWorkoutId: number | null;
  startWorkout: (name: string) => Promise<number>;
  startFromTemplate: (templateId: number, defaultRestSeconds: number) => Promise<number>;
  finishActiveWorkout: () => Promise<void>;
  cancelActiveWorkout: () => Promise<void>;
  refreshActiveWorkout: () => Promise<void>;
}

const ActiveWorkoutContext = createContext<ActiveWorkoutContextValue | null>(null);

export function ActiveWorkoutProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [activeWorkoutId, setActiveWorkoutId] = useState<number | null>(null);

  const refreshActiveWorkout = useCallback(async () => {
    const id = await getInProgressWorkout(db);
    setActiveWorkoutId(id);
  }, [db]);

  useEffect(() => {
    refreshActiveWorkout();
  }, [refreshActiveWorkout]);

  const startWorkout = useCallback(
    async (name: string) => {
      const id = await createWorkout(db, name);
      setActiveWorkoutId(id);
      return id;
    },
    [db]
  );

  const startFromTemplate = useCallback(
    async (templateId: number, defaultRestSeconds: number) => {
      const id = await startWorkoutFromTemplate(db, templateId, defaultRestSeconds);
      setActiveWorkoutId(id);
      return id;
    },
    [db]
  );

  const finishActiveWorkout = useCallback(async () => {
    if (activeWorkoutId == null) return;
    await finishWorkout(db, activeWorkoutId);
    setActiveWorkoutId(null);
  }, [activeWorkoutId, db]);

  const cancelActiveWorkout = useCallback(async () => {
    if (activeWorkoutId == null) return;
    await deleteWorkout(db, activeWorkoutId);
    setActiveWorkoutId(null);
  }, [activeWorkoutId, db]);

  return (
    <ActiveWorkoutContext.Provider
      value={{
        activeWorkoutId,
        startWorkout,
        startFromTemplate,
        finishActiveWorkout,
        cancelActiveWorkout,
        refreshActiveWorkout,
      }}
    >
      {children}
    </ActiveWorkoutContext.Provider>
  );
}

export function useActiveWorkout(): ActiveWorkoutContextValue {
  const ctx = useContext(ActiveWorkoutContext);
  if (!ctx) throw new Error("useActiveWorkout must be used within ActiveWorkoutProvider");
  return ctx;
}
