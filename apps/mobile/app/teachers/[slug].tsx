import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import type { JSX } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";

import {
  Body,
  Card,
  CoverImage,
  EmptyState,
  Screen,
  Title
} from "@/src/components/ui";
import { LinkPressable } from "@/src/components/link-pressable";
import { Avatar, PriceText, StatCard } from "@/src/components/ui-display";
import { HtmlContent } from "@/src/components/html-content";
import { getPublicTeacherBySlug } from "@/src/lib/api/profiles";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { fonts, radius, spacing } from "@/src/theme/tokens";
import { SkeletonCard, SkeletonHero, SkeletonScreen } from "@/src/components/skeletons";
import { makeStyles } from "@/src/theme/theme";

export default function TeacherProfileScreen(): JSX.Element {
  const styles = useStyles();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const t = useT();
  const format = useFormat();
  const { data: profile, isPending } = useQuery({
    queryFn: () => getPublicTeacherBySlug(slug),
    queryKey: queryKeys.teacher(slug)
  });

  if (isPending) {
    return (
      <SkeletonScreen>
        <SkeletonCard lines={2} />
        <SkeletonCard lines={1} />
        <SkeletonHero coverHeight={140} />
      </SkeletonScreen>
    );
  }

  if (!profile) {
    return (
      <Screen>
        <EmptyState message={t("teachers.empty")} />
      </Screen>
    );
  }

  const teacherPhoto = profile.teacherProfile?.profilePhoto ?? profile.user.image;
  const phone = profile.teacherProfile?.phone ?? null;

  return (
    <Screen>
      <Stack.Screen options={{ title: profile.user.name }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Identity on one plate, the way the account screen does it. */}
        <Card style={styles.hero}>
          <Avatar name={profile.user.name} photo={teacherPhoto} size={84} />
          <View style={styles.heroText}>
            <Text numberOfLines={2} style={styles.heroName}>
              {profile.user.name}
            </Text>
            {profile.teacherProfile?.specializations ? (
              <HtmlContent html={profile.teacherProfile.specializations} muted />
            ) : null}
          </View>
        </Card>

        <View style={styles.metrics}>
          <StatCard
            icon="book"
            label={t("common.courses")}
            tint="brand"
            value={format.number(profile.metrics.publishedCourseCount)}
          />
          <StatCard
            icon="chatbubbles"
            label={t("common.reviews")}
            tint="mint"
            value={format.number(profile.metrics.reviewCount)}
          />
          {profile.metrics.reviewAverage === null ? null : (
            <StatCard
              icon="star"
              label={t("common.rating")}
              tint="gold"
              value={format.rating(profile.metrics.reviewAverage)}
            />
          )}
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

        {phone ? (
          <Card>
            <Title>{t("teacher.phone")}</Title>
            <View style={{ height: spacing.sm }} />
            <Pressable
              accessibilityLabel={`${t("teacher.phone")} ${format.digits(phone)}`}
              accessibilityRole="link"
              onPress={() => void Linking.openURL(`tel:${phone}`)}
              style={styles.phoneRow}
            >
              <Text style={styles.phoneText}>{format.digits(phone)}</Text>
            </Pressable>
          </Card>
        ) : null}

        <Title>{t("common.courses")}</Title>
        {profile.courses.length === 0 ? (
          <EmptyState message={t("teachers.empty")} />
        ) : (
          profile.courses.map((course) => (
            <LinkPressable
              accessibilityLabel={course.title}
              href={{ params: { courseId: course.slug }, pathname: "/courses/[courseId]" }}
              key={course.id}
              pressedStyle={styles.coursePressed}
              style={styles.courseCard}
            >
              <Card flush>
                <CoverImage bleed height={140} uri={course.coverImageUrl} />
                <View style={styles.courseText}>
                  <Title numberOfLines={2}>{course.title}</Title>
                  <Body muted numberOfLines={2}>
                    {course.description.replace(/<[^>]*>/g, "")}
                  </Body>
                  <PriceText amount={course.price} />
                </View>
              </Card>
            </LinkPressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xxxl },
  courseCard: { marginBottom: spacing.md },
  coursePressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  courseText: { gap: spacing.sm, padding: spacing.lg },
  hero: { alignItems: "center", flexDirection: "row", gap: spacing.lg },
  heroName: { color: colors.ink, fontFamily: fonts.display, fontSize: 23, lineHeight: 30 },
  heroText: { flex: 1, gap: spacing.xs },
  metrics: { flexDirection: "row", gap: spacing.sm },
  phoneRow: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.lg
  },
  phoneText: { color: colors.accent, fontFamily: fonts.displaySemiBold, fontSize: 15 }
}));

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
