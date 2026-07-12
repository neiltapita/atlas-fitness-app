import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { radii, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { haptics } from "@/utils/haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  size?: "large" | "medium";
}

export function PrimaryButton({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
  size = "large",
}: PrimaryButtonProps) {
  const { colors } = useTheme();
  const variantStyles = useMemo(
    () => ({
      primary: { container: { backgroundColor: colors.accent }, textColor: colors.accentText },
      secondary: {
        container: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
        textColor: colors.textPrimary,
      },
      danger: { container: { backgroundColor: colors.danger }, textColor: "#FFFFFF" },
      ghost: { container: { backgroundColor: "transparent" }, textColor: colors.accent },
    }),
    [colors]
  );
  const styles = useMemo(
    () =>
      StyleSheet.create({
  base: {
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  large: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  medium: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.headline,
  },
}),
    [colors]
  );
  const variantStyle = variantStyles[variant];
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      disabled={disabled || loading}
      style={[
        styles.base,
        size === "large" ? styles.large : styles.medium,
        variantStyle.container,
        (disabled || loading) && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.textColor} />
      ) : (
        <Text style={[styles.text, { color: variantStyle.textColor }]}>{title}</Text>
      )}
    </AnimatedPressable>
  );
}
