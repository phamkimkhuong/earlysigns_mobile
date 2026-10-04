import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Lock, Play, Flag, Trophy, ChevronRight } from "lucide-react-native";
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

  return (
    <View className="items-center gap-1.5 py-1">
      {/* Floating active badge for current module */}
      {isCurrent ? (
        <Pressable
          onPress={onStartLesson}
          disabled={lessonLoading}
          style={{ backgroundColor: "#4f46e5" }}
          className="flex-row items-center gap-1 px-3.5 py-1.5 rounded-full shadow-sm active:opacity-85 mb-0.5"
        >
          <Play size={11} color="#ffffff" fill="#ffffff" />
          <Text className="text-white font-bold text-xs">
            {lessonLoading ? t("home.mission.starting") : t("home.journey.startLesson")}
          </Text>
        </Pressable>
      ) : null}

      {/* Main Node Circle with multi-layer styling */}
      <Pressable
        onPress={isCurrent || isCompleted ? onStartLesson : undefined}
        disabled={(!isCurrent && !isCompleted) || lessonLoading}
        style={{
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: isCompleted ? "#ecfdf5" : isCurrent ? "#4f46e5" : "#f1f5f9",
          borderColor: isCompleted ? "#10b981" : isCurrent ? "#818cf8" : "#cbd5e1",
          borderWidth: isCurrent ? 3 : 2,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: isCurrent ? "#4f46e5" : "transparent",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isCurrent ? 0.3 : 0,
          shadowRadius: 8,
          elevation: isCurrent ? 4 : 0,
        }}
        className="active:opacity-90"
      >
        {isCompleted ? (
          <CheckCircle2 size={26} color="#059669" strokeWidth={2.5} />
        ) : isCurrent ? (
          <Play size={22} color="#ffffff" fill="#ffffff" />
        ) : (
          <Lock size={18} color="#94a3b8" />
        )}
      </Pressable>

      {/* Module Title & Label */}
      <View
        style={{ backgroundColor: isCurrent ? "#e0e7ff" : "#F7F6F2" }}
        className="px-2.5 py-0.5 rounded-full border border-slate-200"
      >
        <Text
          style={{ color: isCurrent ? "#4338ca" : "#64748b" }}
          className="text-xs font-bold"
        >
          {t("home.journey.module", { n: mod.index })}
        </Text>
      </View>
    </View>
  );
}

export interface JourneyPathItemProps {
  item: any;
  onStartLesson?: () => void;
  lessonLoading?: boolean;
  t: (key: string, opts?: any) => string;
}

export const JourneyPathItem = React.memo(function JourneyPathItem({
  item,
  onStartLesson,
  lessonLoading,
  t,
}: JourneyPathItemProps) {
  if (item.type === "milestone") {
    return (
      <View
        style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
        className="rounded-2xl p-4 border shadow-sm my-1 flex-row items-center justify-between"
      >
        <View className="flex-1 pr-3">
          <View className="flex-row items-center gap-1.5 mb-1">
            <Flag size={13} color="#4f46e5" />
            <Text style={{ color: "#4f46e5" }} className="text-xs font-extrabold uppercase tracking-wider">
              {t("home.journey.milestone", { n: item.index })}
            </Text>
          </View>
          <Text className="text-base font-extrabold text-[#0f172a]">
            {milestoneDisplayName(item.index, t)}
          </Text>
        </View>
        <View
          style={{ backgroundColor: "#eef2ff" }}
          className="w-10 h-10 rounded-xl items-center justify-center border border-indigo-100"
        >
          <Trophy size={18} color="#4f46e5" />
        </View>
      </View>
    );
  }

  const isLeft = item.side === "left";
  return (
    <View
      style={{
        width: "100%",
        alignItems: isLeft ? "flex-start" : "flex-end",
        paddingHorizontal: 24,
      }}
    >
      <NodeCircle
        mod={item}
        onStartLesson={onStartLesson}
        lessonLoading={lessonLoading}
        t={t}
      />
    </View>
  );
});

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
    <View className="gap-3 py-2 relative">
      {items.map((item, index) => (
        <JourneyPathItem
          key={item.type === "milestone" ? `ms-${item.index}` : `node-${item.index}-${index}`}
          item={item}
          onStartLesson={onStartLesson}
          lessonLoading={lessonLoading}
          t={t}
        />
      ))}
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
  const items = buildItems(milestones, 4);

  return (
    <View
      style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
      className="rounded-3xl p-5 border shadow-sm gap-3.5 mb-2"
    >
      {/* Top Header Information & Stats */}
      <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
        <View className="gap-0.5">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {t("home.journey.adaptive")}
          </Text>
          <Text className="text-base font-extrabold text-[#0f172a]">
            {t("home.journey.moduleOf", { current: currentModule, total: totalModulesShown })}
          </Text>
        </View>

        <View className="flex-row items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full">
          <Text style={{ color: "#4f46e5" }} className="text-xs font-bold">
            {t("home.journey.lessonOf", { current: currentLessonInModule, total: lessonsPerModule })}
          </Text>
        </View>
      </View>

      {/* Completed Milestones Badge (if any) */}
      {completedMilestones > 0 ? (
        <View
          style={{ backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }}
          className="flex-row items-center gap-2 px-3 py-2 rounded-xl border"
        >
          <Trophy size={14} color="#16a34a" />
          <Text className="text-[13px] font-semibold text-emerald-800">
            {t("home.journey.milestonesCompleted", { count: completedMilestones })}
          </Text>
        </View>
      ) : null}

      {/* Error alert if lesson fails to load */}
      {lessonError ? (
        <View
          style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}
          className="p-3 rounded-xl border"
        >
          <Text className="text-xs text-rose-600 font-medium">{lessonError}</Text>
        </View>
      ) : null}

      {/* Interactive Visual Quest Path */}
      <WindingPath
        items={items}
        onStartLesson={onStartLesson}
        lessonLoading={lessonLoading}
        t={t}
      />

      {/* View All Journey Link */}
      {onViewAll ? (
        <Pressable
          onPress={onViewAll}
          style={{ backgroundColor: "#F7F6F2", borderColor: "#e2e8f0" }}
          className="flex-row items-center justify-center gap-1.5 py-3 rounded-2xl border active:opacity-75 mt-1"
        >
          <Text style={{ color: "#4f46e5" }} className="text-sm font-bold">
            {t("home.journey.viewAll")}
          </Text>
          <ChevronRight size={16} color="#4f46e5" />
        </Pressable>
      ) : null}
    </View>
  );
}
