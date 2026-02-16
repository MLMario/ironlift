/**
 * Workout History Screen
 *
 * Paginated timeline of past workouts with sticky summary stats bar,
 * decorative timeline dots/lines, and infinite scroll pagination.
 * Tapping a workout card navigates to the workout detail screen.
 */

import { SummaryStatsBar } from "@/components/SummaryStatsBar";
import { WorkoutHistoryCard } from "@/components/WorkoutHistoryCard";
import { formatWorkoutDate } from "@/lib/formatters";
import { logging } from "@/services/logging";
import { useTheme, type Theme } from "@/theme";
import type { WorkoutHistoryItem, WorkoutSummaryStats } from "@/types/services";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PAGE_SIZE = 7;

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bgPrimary,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      minWidth: 44,
      minHeight: 44,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
      flex: 1,
      textAlign: "center",
    },
    headerSpacer: {
      width: 44,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    listContent: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    emptyList: {
      flexGrow: 1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: theme.spacing["2xl"],
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.sizes.base,
    },
    timelineItem: {
      paddingLeft: 28,
      paddingBottom: theme.spacing.md,
      position: "relative" as const,
    },
    timelineDot: {
      position: "absolute" as const,
      left: 2,
      top: 18,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.accent,
    },
    timelineLine: {
      position: "absolute" as const,
      left: 6,
      top: 28,
      bottom: 0,
      width: 2,
      backgroundColor: theme.colors.border,
      borderRadius: 1,
    },
    timelineContent: {
      flex: 1,
    },
    dateText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.sizes.xs,
      fontWeight: theme.typography.weights.medium,
      marginBottom: theme.spacing.xs,
    },
  });
}

export default function HistoryScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();

  const [workouts, setWorkouts] = useState<WorkoutHistoryItem[]>([]);
  const [stats, setStats] = useState<WorkoutSummaryStats>({
    totalWorkouts: 0,
    totalSets: 0,
    totalVolume: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [statsLoaded, setStatsLoaded] = useState(false);

  useEffect(() => {
    loadInitial();
  }, []);

  async function loadInitial() {
    setIsLoading(true);
    try {
      const [paginatedResult, summaryResult] = await Promise.all([
        logging.getWorkoutLogsPaginated(0, PAGE_SIZE),
        logging.getWorkoutSummaryStats(),
      ]);

      if (paginatedResult.data) {
        setWorkouts(paginatedResult.data.data);
        setHasMore(paginatedResult.data.hasMore);
      }

      if (summaryResult.data) {
        setStats(summaryResult.data);
      }
    } catch (err) {
      console.error("Failed to load workout history:", err);
    } finally {
      setIsLoading(false);
      setStatsLoaded(true);
    }
  }

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const result = await logging.getWorkoutLogsPaginated(
        workouts.length,
        PAGE_SIZE,
      );
      if (result.data) {
        setWorkouts((prev) => [...prev, ...result.data!.data]);
        setHasMore(result.data.hasMore);
      }
    } catch (err) {
      console.error("Failed to load more workouts:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, workouts.length]);

  const renderItem = useCallback(
    ({ item, index }: { item: WorkoutHistoryItem; index: number }) => (
      <View style={styles.timelineItem}>
        {index < workouts.length - 1 && <View style={styles.timelineLine} />}
        <View style={styles.timelineDot} />
        <View style={styles.timelineContent}>
          <Text style={styles.dateText}>
            {formatWorkoutDate(item.started_at)}
          </Text>
          <WorkoutHistoryCard
            workout={item}
            onPress={() => router.push(`/settings/${item.id}`)}
          />
        </View>
      </View>
    ),
    [router, styles, workouts.length],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons
            name="chevron-back"
            size={24}
            color={theme.colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Workout History</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : (
        <FlatList
          data={workouts}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            <SummaryStatsBar
              totalWorkouts={stats.totalWorkouts}
              totalSets={stats.totalSets}
              totalVolume={stats.totalVolume}
              isLoading={!statsLoaded}
            />
          }
          /*stickyHeaderIndices={[0]}*/
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.accent}
                style={{ paddingVertical: 16 }}
              />
            ) : null
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No workout history yet</Text>
              </View>
            ) : null
          }
          contentContainerStyle={
            workouts.length === 0 && !isLoading
              ? styles.emptyList
              : styles.listContent
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
