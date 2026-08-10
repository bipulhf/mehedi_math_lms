import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useLocale } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { getStreakSummary, recordStudyActivity, type StreakSummary } from "@/src/lib/streak";

const emptyStreak: StreakSummary = {
  days: Array.from({ length: 7 }, (_, index) => ({
    date: "",
    isToday: index === 6,
    label: "",
    studied: false
  })),
  streakCount: 0
};

export function useStreak(): StreakSummary {
  const { locale } = useLocale();
  const { data } = useQuery({
    queryFn: () => getStreakSummary(locale),
    queryKey: queryKeys.streak(locale)
  });

  return data ?? emptyStreak;
}

/** Called once per lecture-screen visit — see `learn/[courseId].tsx`. */
export function useRecordStudyActivity(): () => void {
  const queryClient = useQueryClient();
  const { locale } = useLocale();
  const { mutate } = useMutation({
    mutationFn: recordStudyActivity,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.streak(locale) });
    }
  });

  return mutate;
}
