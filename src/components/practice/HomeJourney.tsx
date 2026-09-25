import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { JourneyPathSkeleton } from "@/components/ui/Skeleton";

const NAMED_MILESTONE_COUNT = 5;

export interface JourneyModule {
  index: number;
  status: "completed" | "current" | "locked" | string;
  [key: string]: any;
}

export interface JourneyMilestone {
  index: number;
  status: "completed" | "current" | "locked" | string;
  modules: JourneyModule[];
  [key: string]: any;
}

export interface JourneyData {
  current_module: number;
  current_lesson_in_module: number;
  lessons_per_module: number;
  milestones: JourneyMilestone[];
  [key: string]: any;
}

export function milestoneDisplayName(index: number, t: (key: string, opts?: any) => string): string {
  if (index >= 1 && index <= NAMED_MILESTONE_COUNT) {
    return t(`home.journey.milestoneNames.${index}`);
  }
  return t("home.journey.milestoneNames.fallback", { n: index });
}

export function buildItems(milestones: JourneyMilestone[], windowSize: number | null = null): any[] {
  const allItems: any[] = [];
  milestones.forEach((ms) => {
    allItems.push({ type: "milestone", index: ms.index, status: ms.status });
    ms.modules.forEach((mod) => {
      const side = mod.index % 2 === 1 ? "right" : "left";
      allItems.push({ type: "node", side, ...mod });
    });
  });
  if (!windowSize) return allItems;
  const nodes = allItems.filter((x) => x.type === "node");
  const currentIdx = nodes.findIndex((n) => n.status === "current");
  if (currentIdx === -1) return allItems;
  const half = Math.floor(windowSize / 2);
  const start = Math.max(0, currentIdx - half);
  const end = Math.min(nodes.length - 1, currentIdx + (windowSize - 1 - (currentIdx - start)));
  const visibleNodes = new Set(nodes.slice(start, end + 1).map((n) => n.index));
  const result: any[] = [];
  let pendingBanner: any = null;
  for (const item of allItems) {
    if (item.type === "milestone") pendingBanner = item;
    else if (visibleNodes.has(item.index)) {
      if (pendingBanner) {
        result.push(pendingBanner);
        pendingBanner = null;
      }
      result.push(item);
    }
  }
  return result;
}

function NodeCircle({
  mod,
  onStartLesson,
  lessonLoading,
  t,
}: {
  mod: any;
  onStartLesson?: () => void;
  lessonLoading?: boolean;
  t: (key: string, opts?: any) => string;
}) {
  const isCompleted = mod.status === "completed";
  const isCurrent = mod.status === "current";
  const isLocked = mod.status === "locked";
  return (
    <View className="items-center gap-1.5">
      {isCurrent ? (
        <Pressable className="bg-accent rounded-full px-3 py-1.5" onPress={onStartLesson} disabled={lessonLoading}>
          <Text className="text-white font-bold text-xs">
            {lessonLoading ? t("home.mission.starting") : t("home.journey.startLesson")}
          </Text>
        </Pressable>
      ) : null}
      <View
        className={`w-[52px] h-[52px] rounded-full items-center justify-center border-2 ${
          isCompleted
            ? "bg-accentMuted border-accent"
            : isCurrent
              ? "bg-accent border-accent"
              : isLocked
                ? "bg-appMuted border-appBorderStrong opacity-55"
                : "bg-appMuted border-appBorderStrong"
        }`}
      >
        <Text className={`text-lg ${isCurrent ? "text-white" : "text-appText"}`}>
          {isCompleted ? "✓" : isLocked ? "🔒" : "▶"}
        </Text>
      </View>
      <Text className="text-appTextSecondary text-xs">{t("home.journey.module", { n: mod.index })}</Text>
    </View>
  );
}

export function WindingPath({
  items,
  onStartLesson,
  lessonLoading,
  t,
}: {
  items: any[];
  onStartLesson?: () => void;
  lessonLoading?: boolean;
  t: (key: string, opts?: any) => string;
}) {
  return (
    <View className="gap-2.5 py-2">
      {items.map((item) => {
        if (item.type === "milestone") {
          return (
            <View key={`ms-${item.index}`} className="bg-accentMuted rounded-md p-2.5">
              <Text className="text-accent text-xs font-bold">{t("home.journey.milestone", { n: item.index })}</Text>
              <Text className="text-appText font-bold">{milestoneDisplayName(item.index, t)}</Text>
            </View>
          );
        }
        return (
          <View
            key={`node-${item.index}`}
            className={`w-full ${item.side === "left" ? "items-start" : "items-end"}`}
          >
            <NodeCircle
              mod={item}
              onStartLesson={onStartLesson}
              lessonLoading={lessonLoading}
              t={t}
            />
          </View>
        );
      })}
    </View>
  );
}

export interface HomeJourneyProps {
  journey?: JourneyData | null;
  loading?: boolean;
  streakDays?: number;
  lessonLoading?: boolean;
  lessonError?: string;
  onStartLesson?: () => void;
  onViewAll?: () => void;
}

export default function HomeJourney({
  journey,
  loading,
  streakDays = 0,
  lessonLoading,
  lessonError,
  onStartLesson,
  onViewAll,
}: HomeJourneyProps) {
  const { t } = useTranslation();
  if (loading) {
    return <JourneyPathSkeleton />;
  }
  if (!journey) return null;
  const {
    current_module: currentModule,
    current_lesson_in_module: currentLessonInModule,
    lessons_per_module: lessonsPerModule,
    milestones,
  } = journey;
  const totalModulesShown = milestones.reduce((acc, ms) => acc + ms.modules.length, 0);
  const completedMilestones = milestones.filter((ms) => ms.status === "completed").length;
  const items = buildItems(milestones, 3);
  const streakCopy =
    streakDays > 0
      ? t("home.journey.heroStreakActive", {
          streak: streakDays,
          module: currentModule,
          lesson: currentLessonInModule,
        })
      : t("home.journey.heroStreakZero");

  return (
    <View className="gap-2.5 mb-4">
      <View className="flex-row flex-wrap gap-2">
        <Text className="text-appTextSecondary text-[13px]">
          {t("home.journey.moduleOf", { current: currentModule, total: totalModulesShown })}
        </Text>
        <Text className="text-appTextSecondary text-[13px]">
          {t("home.journey.lessonOf", { current: currentLessonInModule, total: lessonsPerModule })}
        </Text>
        {completedMilestones > 0 ? (
          <Text className="text-appTextSecondary text-[13px]">
            {t("home.journey.milestonesCompleted", { count: completedMilestones })}
          </Text>
        ) : null}
      </View>
      <Text className="text-appText font-semibold">{streakCopy}</Text>
      {lessonError ? <Text className="text-danger">{lessonError}</Text> : null}
      <WindingPath
        items={items}
        onStartLesson={onStartLesson}
        lessonLoading={lessonLoading}
        t={t}
      />
      {onViewAll ? (
        <Pressable onPress={onViewAll}>
          <Text className="text-accent font-bold mt-2">{t("home.journey.viewAll")} →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
