import { useRef } from "react";
import { Animated, Pressable, type ViewStyle, type StyleProp } from "react-native";

/** Wraps a card so pressing it springs a subtle scale-down (feel + feedback). */
export function PressScale({
  children,
  onPress,
  style,
  scaleTo = 0.96,
  disabled,
}: {
  children: any;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  disabled?: boolean;
}) {
  const v = useRef(new Animated.Value(1)).current;
  const go = (to: number) =>
    Animated.spring(v, { toValue: to, useNativeDriver: true, friction: 7, tension: 120 }).start();
  return (
    <Animated.View style={[{ transform: [{ scale: v }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => go(scaleTo)}
        onPressOut={() => go(1)}
        disabled={disabled}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
