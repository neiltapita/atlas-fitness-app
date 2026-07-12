import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useSettings } from "@/context/SettingsContext";
import { getTabConfig, normalizeTabOrder } from "@/constants/tabs";

function TabIcon({ name, color, size }: { name: keyof typeof Ionicons.glyphMap; color: string; size: number }) {
  return <Ionicons name={name} color={color} size={size} />;
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const order = normalizeTabOrder(settings.tabOrder);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
      }}
    >
      {order.map((key) => {
        const tab = getTabConfig(key);
        return (
          <Tabs.Screen
            key={tab.key}
            name={tab.key}
            options={{
              title: tab.title,
              tabBarIcon: ({ color, size }) => <TabIcon name={tab.icon} color={color} size={size} />,
            }}
          />
        );
      })}
    </Tabs>
  );
}
