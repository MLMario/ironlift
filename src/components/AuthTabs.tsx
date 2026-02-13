import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

type AuthTab = 'login' | 'register';

interface AuthTabsProps {
  activeTab: AuthTab;
  onTabChange: (tab: AuthTab) => void;
}

export function AuthTabs({ activeTab, onTabChange }: AuthTabsProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => onTabChange('login')}
        style={[
          styles.tab,
          activeTab === 'login' ? styles.tabActive : styles.tabInactive,
        ]}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === 'login'
              ? styles.tabTextActive
              : styles.tabTextInactive,
          ]}
        >
          Login
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onTabChange('register')}
        style={[
          styles.tab,
          activeTab === 'register' ? styles.tabActive : styles.tabInactive,
        ]}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === 'register'
              ? styles.tabTextActive
              : styles.tabTextInactive,
          ]}
        >
          Register
        </Text>
      </Pressable>
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderDim,
    },
    tab: {
      flex: 1,
      minHeight: theme.layout.minTapTarget,
      justifyContent: 'center',
      alignItems: 'center',
      borderBottomWidth: 3,
    },
    tabActive: {
      borderBottomColor: theme.colors.accent,
    },
    tabInactive: {
      borderBottomColor: 'transparent',
    },
    tabText: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
    },
    tabTextActive: {
      color: theme.colors.textPrimary,
    },
    tabTextInactive: {
      color: theme.colors.textSecondary,
    },
  });
}
