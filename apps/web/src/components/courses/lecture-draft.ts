/** The in-progress lecture the builder and its form both read. */
export interface LectureDraft {
  content: string;
  description: string;
  isPreview: boolean;
  title: string;
  type: "VIDEO_UPLOAD" | "VIDEO_LINK" | "TEXT";
  videoDuration?: number | null | undefined;
  videoUrl: string;
}

export const initialLectureDraft: LectureDraft = {
  content: "",
  description: "",
  isPreview: false,
  title: "",
  type: "TEXT",
  videoDuration: undefined,
  videoUrl: ""
};
