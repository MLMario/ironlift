import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { SubmitButton } from '@/components/SubmitButton';

interface EmailVerificationModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export function EmailVerificationModal({
  visible,
  onDismiss,
}: EmailVerificationModalProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.body}>
            We've sent a confirmation link to your email address.
          </Text>
          <Text style={styles.body}>
            Please click the link in the email to activate your account before
            logging in.
          </Text>
          <SubmitButton title="Got it" onPress={onDismiss} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    card: {
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.lg,
      width: '100%',
      maxWidth: theme.layout.containerMaxWidth,
      gap: theme.spacing.md,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.weights.semibold,
      textAlign: 'center',
    },
    body: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.sizes.base,
      textAlign: 'center',
    },
  });
}
