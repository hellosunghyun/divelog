import { z } from "zod";

export const createRecordSchema = z
  .object({
    title: z.string().min(1, "제목을 입력해주세요").max(200, "제목이 너무 깁니다"),
    content: z.string().min(1, "내용을 입력해주세요").max(50000),
    contentText: z.string().max(50000).optional(),
    format: z.enum(["note", "article"]).default("note"),
    type: z.enum(["personal", "challenge", "collaboration"]).default("personal"),
    rhythm: z.enum(["moment", "sprint", "weekly", "monthly", "stage", "reflection", "free"]).default("free"),
    visibility: z.enum(["draft", "cohort", "public"]).default("cohort"),
    responsePreference: z.enum(["open", "question_only", "closed"]).default("open"),
    stageId: z.string().optional(),
    challengeId: z.string().optional(),
    collaborationUnitId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.format !== "article") {
      return;
    }

    try {
      const parsed = JSON.parse(data.content) as unknown;

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed) ||
        !("type" in parsed) ||
        parsed.type !== "doc"
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["content"],
          message: "글 형식 본문은 올바른 에디터 JSON이어야 합니다",
        });
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["content"],
        message: "글 형식 본문은 올바른 에디터 JSON이어야 합니다",
      });
    }
  });

export type CreateRecordInput = z.infer<typeof createRecordSchema>;

export const autosaveDraftSchema = z.object({
  format: z.enum(["note", "article"]),
  title: z.string().optional(),
  content: z.string().default(""),
  contentJson: z.string().optional(),
  stageId: z.string().optional().nullable(),
  rhythm: z.string().default("free"),
  visibility: z.enum(["draft", "cohort", "public"]).default("draft"),
  responsePreference: z.enum(["open", "question_only", "closed"]).default("open"),
});

export type AutosaveDraftInput = z.infer<typeof autosaveDraftSchema>;

export const createNoteSchema = z.object({
  content: z.string().min(1, "내용을 입력해주세요").max(50000),
  rhythm: z.enum(["moment", "sprint", "weekly", "monthly", "stage", "reflection", "free"]).default("free"),
  visibility: z.enum(["draft", "cohort", "public"]).default("cohort"),
  responsePreference: z.enum(["open", "question_only", "closed"]).default("open"),
  stageId: z.string().optional(),
  captureQuestion: z.string().optional(),
  captureDirection: z.enum(["inward", "outward", "next_stage"]).default("inward"),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export const createArticleSchema = z
  .object({
    title: z.preprocess(
      (value) => {
        if (typeof value !== "string") {
          return value;
        }

        const trimmedValue = value.trim();
        return trimmedValue.length > 0 ? trimmedValue : undefined;
      },
      z.string().max(200, "제목이 너무 깁니다").optional().default("(무제)"),
    ),
    content: z.string().min(1, "내용을 입력해주세요").max(50000),
    visibility: z.enum(["draft", "cohort", "public"]).default("cohort"),
    stageId: z.string().optional(),
    templateId: z.string().optional(),
    captureQuestion: z.string().optional(),
    captureDirection: z.enum(["inward", "outward", "next_stage"]).default("inward"),
  })
  .superRefine((data, ctx) => {
    try {
      const parsed = JSON.parse(data.content) as unknown;
      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed) ||
        !("type" in parsed) ||
        (parsed as Record<string, unknown>).type !== "doc"
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["content"],
          message: "글 형식 본문은 올바른 에디터 JSON이어야 합니다",
        });
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["content"],
        message: "글 형식 본문은 올바른 에디터 JSON이어야 합니다",
      });
    }
  });

export type CreateArticleInput = z.infer<typeof createArticleSchema>;

export const updateRecordMetadataSchema = z.object({
  question: z.string().max(500).optional(),
  questionDirection: z.enum(["outward", "inward", "next_stage"]).optional(),
  responsePreference: z.enum(["open", "question_only", "closed"]).optional(),
  tagIds: z.array(z.string()).optional(),
});

export const createQuestionSchema = z.object({
  content: z.string().min(1, "질문을 입력해주세요").max(500),
  direction: z.enum(["outward", "inward", "next_stage"]).default("outward"),
  recordId: z.string().min(1),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

export const createResponseSchema = z.object({
  content: z.string().min(1, "내용을 입력해주세요").max(10000),
  type: z.enum(["resonance", "question", "connection", "suggestion", "self_answer"]),
  visibility: z.enum(["cohort", "public"]).default("cohort"),
  recordId: z.string().min(1),
  questionId: z.string().optional(),
});

export type CreateResponseInput = z.infer<typeof createResponseSchema>;

export const saveSentenceSchema = z.object({
  content: z.string().min(1).max(1000),
  reason: z.string().max(500).optional(),
  paragraphIndex: z.number().int().optional(),
  recordId: z.string().min(1),
});

export type SaveSentenceInput = z.infer<typeof saveSentenceSchema>;

export const personalReflectionSchema = z.object({
  stageId: z.string().min(1),
  letGo: z.string().optional().nullable(),
  carryQuestion: z.string().optional().nullable(),
  lastingSentence: z.string().optional().nullable(),
});

export type PersonalReflectionInput = z.infer<typeof personalReflectionSchema>;

export const updateSettingsSchema = z.object({
  defaultVisibility: z.enum(["draft", "cohort", "public"]).optional(),
  defaultResponsePreference: z.enum(["open", "question_only", "closed"]).optional(),
  notificationEmailEnabled: z.boolean().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const searchSchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(["all", "records", "questions", "learners", "sentences"]).default("all"),
  cohort: z.string().optional(),
});

export type SearchInput = z.infer<typeof searchSchema>;

export const recordFilterSchema = z.object({
  stage: z.string().optional(),
  format: z.enum(["note", "article"]).optional(),
  type: z.enum(["personal", "challenge", "collaboration"]).optional(),
  rhythm: z.enum(["moment", "sprint", "weekly", "monthly", "stage", "reflection", "free"]).optional(),
  visibility: z.enum(["draft", "cohort", "public"]).optional(),
  cohort: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
});

export type RecordFilterInput = z.infer<typeof recordFilterSchema>;
