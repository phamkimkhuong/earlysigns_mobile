import { RefreshControl, ScrollView, Text } from "react-native";
import { WindingPath } from "@/components/practice/HomeJourney";
import IPAChecking from "@/components/practice/IPAChecking";
import { JourneyPathSkeleton } from "@/components/ui/Skeleton";
import { useJourneyViewModel } from "@/hooks/useJourneyViewModel";

export default function JourneyScreen({ navigation }: { navigation?: any }) {
  const {
    t,
    dialect,
    loading,
    refreshing,
    onRefresh,
    error,
    lessonError,
    displayJourney,
    items,
    streakDays,
    lessonSession,
    lessonSessionKey,
    lessonLoading,
    startPersonalizedLesson,
    closeLessonSession,
    loadNextLesson,
    handleLessonAllCompleted,
    userTier,
    userKey,
    usageStatus,
  } = useJourneyViewModel(navigation);

  return (
    <ScrollView
      className="flex-1 bg-appBg"
      contentContainerClassName="p-4 gap-2.5 pb-10"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#f59e0b"
        />
      }
    >
      <Text className="text-2xl font-extrabold text-appText">{t("journeyPage.title")}</Text>
      {displayJourney ? (
        <Text className="text-appTextSecondary">
          {t("home.journey.moduleOf", {
            current: displayJourney.current_module,
            total: displayJourney.milestones.reduce((acc: number, ms: any) => acc + ms.modules.length, 0),
          })}
          {" · "}
          {t("home.streak.active", { count: streakDays })}
        </Text>
      ) : null}
      <Text className="text-appTextSecondary">{t("home.journey.adaptive")}</Text>
      {loading && !displayJourney ? <JourneyPathSkeleton /> : null}
      {error ? <Text className="text-danger">{error}</Text> : null}
      {lessonError ? <Text className="text-danger">{lessonError}</Text> : null}
      {displayJourney ? (
        <WindingPath
          items={items}
          onStartLesson={startPersonalizedLesson}
          lessonLoading={lessonLoading}
          t={t}
        />
      ) : null}
      <IPAChecking
        open={Boolean(lessonSession)}
        onClose={closeLessonSession}
        sentences={lessonSession?.sentences || []}
        dialect={lessonSession?.dialect || dialect}
        sessionKey={lessonSessionKey}
        autoRecordKey={lessonSessionKey}
        lessonTitle={lessonSession?.title}
        userTier={userTier}
        userKey={userKey}
        usageStatus={usageStatus}
        loadNextLesson={loadNextLesson}
        onLessonAllCompleted={handleLessonAllCompleted}
        journeyData={displayJourney}
      />
    </ScrollView>
  );
}
