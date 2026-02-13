import { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

interface TextInputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  hint?: string;
  autoComplete?: TextInputProps['autoComplete'];
}

export function TextInputField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  hint,
  autoComplete,
}: TextInputFieldProps) {
  const theme = useTheme();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isPassword = secureTextEntry;

  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry={isPassword && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          autoComplete={autoComplete}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.input,
            isPassword && styles.inputWithToggle,
            isFocused && styles.inputFocused,
          ]}
        />
        {isPassword && (
          <Pressable
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.toggleButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={22}
              color={theme.colors.textMuted}
            />
          </Pressable>
        )}
      </View>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.xs,
    },
    label: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.medium,
    },
    inputWrapper: {
      position: 'relative',
    },
    input: {
      backgroundColor: theme.colors.bgPrimary,
      color: theme.colors.textPrimary,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      fontSize: theme.typography.sizes.base,
    },
    inputWithToggle: {
      paddingRight: 48,
    },
    inputFocused: {
      borderColor: theme.colors.accent,
    },
    toggleButton: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      width: 44,
      minHeight: 44,
    },
    hint: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.sizes.xs,
    },
  });
}
