/**
 * ProgressRing Component
 *
 * Circular SVG progress indicator showing completed/total sets.
 * Used on collapsed exercise accordion cards in the active workout screen
 * to give at-a-glance workout progress.
 *
 * Uses react-native-svg for the circle rendering. The progress arc
 * starts at 12 o'clock (rotation -90) and fills clockwise.
 * Turns green (success) when all sets are complete.
 */

import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';

interface ProgressRingProps {
  completed: number;
  total: number;
  size?: number;
}

const STROKE_WIDTH = 3;

export function ProgressRing({ completed, total, size = 40 }: ProgressRingProps) {
  const theme = useTheme();
  const styles = getStyles(theme, size);

  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? completed / total : 0;
  const offset = circumference * (1 - progress);
  const isComplete = total > 0 && completed >= total;
  const center = size / 2;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={theme.colors.bgElevated}
          strokeWidth={STROKE_WIDTH}
        />
        {/* Progress arc */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={isComplete ? theme.colors.success : theme.colors.accent}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      {/* Center text overlay */}
      <View style={styles.textOverlay}>
        <Text style={styles.countText}>
          {completed}/{total}
        </Text>
      </View>
    </View>
  );
}

function getStyles(theme: Theme, size: number) {
  return StyleSheet.create({
    container: {
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countText: {
      fontSize: size <= 40 ? 9 : 11,
      fontFamily: theme.typography.fontFamilyMono,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textPrimary,
    },
  });
}
