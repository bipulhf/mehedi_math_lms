import { useQuery } from "@tanstack/react-query";
import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
  Avatar,
  Body,
  Caption,
  Card,
  CoverImage,
  EmptyState,
  Heading,
  PriceText,
  Screen,
  ScreenSkeleton,
  Title
} from "@/src/components/ui";
import { HtmlContent } from "@/src/components/html-content";
import { getPublicTeacherBySlug } from "@/src/lib/api";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { colors, spacing } from "@/src/theme/tokens";

export default function TeacherProfileScreen(): JSX.Element {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const t = useT();
  const format = useFormat();
  const { data: profile, isPending } = useQuery({
    queryFn: () => getPublicTeacherBySlug(slug),
    queryKey: queryKeys.teacher(slug)
  });

  if (isPending) {
    return <ScreenSkeleton rows={4} />;
  }

  if (!profile) {
    return (
      <Screen>
        <EmptyState message={t("teachers.empty")} />
      </Screen>
    );
  }

  const teacherPhoto = profile.teacherProfile?.profilePhoto ?? profile.user.image;

  return (
    <Screen>
      <Stack.Screen options={{ title: profile.user.name }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Caption>{"‹ "}{t("action.back")}</Caption>
        </Pressable>
        <View style={styles.hero}>
          <Avatar name={profile.user.name} photo={teacherPhoto} size={112} />
          <View style={styles.heroText}>
            <Heading>{profile.user.name}</Heading>
            {profile.teacherProfile?.specializations ? (
              <HtmlContent html={profile.teacherProfile.specializations} muted />
            ) : null}
          </View>
        </View>

        {profile.teacherProfile?.bio ? (
          <Card>
            <Title>{t("teachers.lead")}</Title>
            <View style={{ height: spacing.sm }} />
            <HtmlContent html={profile.teacherProfile.bio} muted />
          </Card>
        ) : null}

        {profile.teacherProfile?.qualifications ? (
          <Card>
            <Title>{t("detail.qualifications")}</Title>
            <View style={{ height: spacing.sm }} />
            <HtmlContent html={profile.teacherProfile.qualifications} muted />
          </Card>
        ) : null}

        {profile.teacherProfile?.socialLinks ? (
          <Card>
            <Title>{t("teacher.links")}</Title>
            <View style={{ height: spacing.sm }} />
            <HtmlContent html={profile.teacherProfile.socialLinks} muted />
          </Card>
        ) : null}

        {profile.teacherProfile?.phone ? (
          <Card>
            <Title>{t("teacher.phone")}</Title>
            <View style={{ height: spacing.sm }} />
            <Pressable onPress={() => void Linking.openURL(`tel:${profile.teacherProfile?.phone}`)}>
              <Body muted>{format.digits(profile.teacherProfile.phone)}</Body>
            </Pressable>
          </Card>
        ) : null}

        <View style={styles.metrics}>
          <Metric label={t("common.courses")} value={format.number(profile.metrics.publishedCourseCount)} />
          <Metric label={t("common.reviews")} value={format.number(profile.metrics.reviewCount)} />
          {profile.metrics.reviewAverage === null ? null : (
            <Metric label={t("common.rating")} value={format.rating(profile.metrics.reviewAverage)} />
          )}
        </View>

        <Title>{t("common.courses")}</Title>
        {profile.courses.length === 0 ? (
          <EmptyState message={t("teachers.empty")} />
        ) : (
          profile.courses.map((course) => (
            <Link asChild href={{ params: { courseId: course.slug }, pathname: "/courses/[courseId]" }} key={course.id}>
              <Pressable>
                <Card style={styles.courseCard}>
                  <CoverImage height={120} uri={course.coverImageUrl} />
                  <View style={styles.courseText}>
                    <Title>{course.title}</Title>
                    <Body muted numberOfLines={2}>{course.description.replace(/<[^>]*>/g, "")}</Body>
                    <PriceText amount={course.price} />
                  </View>
                </Card>
              </Pressable>
            </Link>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <View style={styles.metric}>
      <Title>{value}</Title>
      <Caption>{label}</Caption>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, padding: spacing.lg },
  courseCard: { gap: spacing.md, marginBottom: spacing.md, padding: spacing.md },
  courseText: { gap: spacing.sm },
  hero: { alignItems: "center", flexDirection: "row", gap: spacing.lg },
  heroText: { flex: 1, gap: spacing.sm },
  metric: { flex: 1, gap: spacing.xs },
  metrics: { borderBottomColor: colors.hairline, borderBottomWidth: 1, borderTopColor: colors.hairline, borderTopWidth: 1, flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
