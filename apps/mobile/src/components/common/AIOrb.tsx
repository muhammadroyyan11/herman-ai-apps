import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Easing } from "react-native";
import { colors } from "../../styles/theme";

const orbColor = "#e53935";
const orbGlow = "rgba(229, 57, 53, 0.6)";

interface AIOrbProps {
  size?: number;
  isActive?: boolean;
  isListening?: boolean;
}

export function AIOrb({ size = 80, isActive = false, isListening = false }: AIOrbProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.6, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isActive]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const glowSize = size * 2.5;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Glow background */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            opacity: glowAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* Rotating ring */}
      {isActive && (
        <Animated.View
          style={[
            styles.ring,
            {
              width: size + 12,
              height: size + 12,
              borderRadius: (size + 12) / 2,
              borderColor: orbGlow,
              transform: [{ rotate }],
            },
          ]}
        />
      )}

      {/* Core orb */}
      <Animated.View
        style={[
          styles.core,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: pulseAnim }],
            backgroundColor: isActive
              ? orbColor
              : orbGlow,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.coreInner,
            {
              width: size * 0.5,
              height: size * 0.5,
              borderRadius: (size * 0.5) / 2,
              backgroundColor: isActive
                ? "rgba(255, 255, 255, 0.4)"
                : "rgba(255, 255, 255, 0.2)",
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  glow: {
    position: "absolute",
    backgroundColor: orbGlow,
  },
  ring: {
    position: "absolute",
    borderWidth: 1.5,
    borderStyle: "solid",
  },
  core: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#e53935",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  coreInner: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
});
