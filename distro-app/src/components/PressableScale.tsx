import { ReactNode } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import {
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";

interface Props {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scale?: number;
  disabled?: boolean;
}

export function PressableScale({
  children,
  onPress,
  style,
  scale = 0.96,
  disabled = false,
}: Props) {
  const pressed = useSharedValue(false);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(pressed.value ? scale : 1, {
          damping: 20,
          stiffness: 300,
          mass: 0.5,
        }),
      },
    ],
    opacity: withTiming(disabled ? 0.5 : pressed.value ? 0.9 : 1, { duration: 100 }),
  }));

  const gesture = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      pressed.value = true;
    })
    .onFinalize((e, success) => {
      pressed.value = false;
      if (success && onPress) {
        runOnJS(onPress)();
      }
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[animStyle, style]}>{children}</Animated.View>
    </GestureDetector>
  );
}
