import { DEFAULT_RECORD_TYPE, RECORD_TYPES } from "@divelog/domain/record-types";
import { z } from "zod";

import { getPlainText } from "./content.server";
import { extractRecordRefs, extractUserMentions } from "./extract-references.server";

function normalizeUrl(val: unknown): unknown {
  if (typeof val !== "string" || val === "") return val;
  if (!val.startsWith("http://") && !val.startsWith("https://")) {
    return "https://" + val;
  }
  return val;
}

export const createRecordSchema = z
  .object({
    title: z.string().min(1, "제목을 입력해주세요").max(200, "제목이 너무 깁니다"),
    content: z.string().min(1, "내용을 입력해주세요").max(50000),
    contentText: z.string().max(50000).optional(),
    format: z.enum(["note", "article"]).default("note"),
    type: z.enum(RECORD_TYPES).default(DEFAULT_RECORD_TYPE),
    rhythm: z.enum(["moment", "weekly", "monthly", "stage", "free"]).default("free"),
    visibility: z.enum(["draft", "private", "cohort", "public"]).default("public"),
    responsePreference: z.enum(["open", "question_only", "closed"]).default("open"),
    searchIndexingOptOut: z.boolean().default(false),
    challengeId: z.string().optional(),
    collaborationUnitId: z.string().optional(),
    recordedAt: z.string().optional(),
    recordedEndAt: z.string().optional(),
    originalUrl: z.preprocess(
      normalizeUrl,
      z.string().url().max(2048).optional().or(z.literal("")),
    ),
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
  })
  .superRefine((data, ctx) => {
    const requiresDateRange = ["weekly", "monthly", "stage"].includes(
      data.rhythm,
    );

    if (requiresDateRange && !data.recordedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recordedAt"],
        message: "날짜를 선택해주세요",
      });
    }
  });

export type CreateRecordInput = z.infer<typeof createRecordSchema>;

export const autosaveDraftSchema = z.object({
  format: z.enum(["note", "article"]),
  title: z.string().optional(),
  content: z.string().default(""),
  contentJson: z.string().optional(),
  rhythm: z.string().default("free"),
  visibility: z.enum(["draft", "private", "cohort", "public"]).default("public"),
  responsePreference: z.enum(["open", "question_only", "closed"]).default("open"),
  originalUrl: z.preprocess(
    normalizeUrl,
    z.string().url().max(2048).optional().or(z.literal("")),
  ),
});

export type AutosaveDraftInput = z.infer<typeof autosaveDraftSchema>;

export const createNoteSchema = z.object({
  content: z.string().min(1, "내용을 입력해주세요").max(50000),
  rhythm: z.enum(["moment", "weekly", "monthly", "stage", "free"]).default("free"),
  visibility: z.enum(["draft", "private", "cohort", "public"]).default("public"),
  responsePreference: z.enum(["open", "question_only", "closed"]).default("open"),
  searchIndexingOptOut: z.boolean().default(false),
  captureQuestion: z.string().optional(),
  captureDirection: z.enum(["inward", "outward", "next_stage"]).default("inward"),
  originalUrl: z.preprocess(
    normalizeUrl,
    z.string().url().max(2048).optional().or(z.literal("")),
  ),
  references: z.array(
    z.object({
      url: z.preprocess(normalizeUrl, z.string().url().max(2048)),
      title: z.string().max(200).optional().or(z.literal("")),
    }),
  ).max(50).optional().default([]).refine(
    (refs) => {
      const urls = refs.map((r) => r.url);
      return urls.length === new Set(urls).size;
    },
    { message: "참조 링크에 중복된 URL이 있습니다" },
  ),
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
    rhythm: z.enum(["moment", "weekly", "monthly", "stage", "free"]).default("free"),
    visibility: z.enum(["draft", "private", "cohort", "public"]).default("public"),
    searchIndexingOptOut: z.boolean().default(false),
    recordedAt: z.string().optional(),
    recordedEndAt: z.string().optional(),
    templateId: z.string().optional(),
    captureQuestion: z.string().optional(),
    captureDirection: z.enum(["inward", "outward", "next_stage"]).default("inward"),
    originalUrl: z.preprocess(
      normalizeUrl,
      z.string().url().max(2048).optional().or(z.literal("")),
    ),
    references: z.array(
      z.object({
        url: z.preprocess(normalizeUrl, z.string().url().max(2048)),
        title: z.string().max(200).optional().or(z.literal("")),
      }),
    ).max(50).optional().default([]).refine(
      (refs) => {
        const urls = refs.map((r) => r.url);
        return urls.length === new Set(urls).size;
      },
      { message: "참조 링크에 중복된 URL이 있습니다" },
    ),
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
  })
  .superRefine((data, ctx) => {
    const requiresDateRange = ["weekly", "monthly", "stage"].includes(
      data.rhythm,
    );

    if (requiresDateRange && !data.recordedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recordedAt"],
        message: "날짜를 선택해주세요",
      });
    }
  });

export type CreateArticleInput = z.infer<typeof createArticleSchema>;

export const updateRecordMetadataSchema = z.object({
  question: z.string().max(500).optional(),
  questionDirection: z.enum(["outward", "inward", "next_stage"]).optional(),
  responsePreference: z.enum(["open", "question_only", "closed"]).optional(),
  searchIndexingOptOut: z.boolean().optional(),
  tagIds: z.array(z.string()).optional(),
  originalUrl: z.preprocess(
    normalizeUrl,
    z.string().url().max(2048).optional().or(z.literal("")),
  ),
  references: z.array(
    z.object({
      url: z.preprocess(normalizeUrl, z.string().url().max(2048)),
      title: z.string().max(200).optional().or(z.literal("")),
    }),
  ).max(50).optional().default([]).refine(
    (refs) => {
      const urls = refs.map((r) => r.url);
      return urls.length === new Set(urls).size;
    },
    { message: "참조 링크에 중복된 URL이 있습니다" },
  ),
});

export const createQuestionSchema = z.object({
  content: z.string().min(1, "질문을 입력해주세요").max(500),
  direction: z.enum(["outward", "inward", "next_stage"]).default("outward"),
  recordId: z.string().min(1),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

export const createResponseSchema = z.object({
  content: z.string().min(1, "내용을 입력해주세요").max(200000),
  type: z.enum(["resonance", "question", "connection", "suggestion", "self_answer"]),
  visibility: z.enum(["cohort", "public"]).default("public"),
  recordId: z.string().min(1),
  questionId: z.string().optional(),
  parentResponseId: z.string().optional(),
});

export type CreateResponseInput = z.infer<typeof createResponseSchema>;

export const updateResponseSchema = z.object({
  responseId: z.string().min(1),
  content: z.string().min(1, "내용을 입력해주세요").max(200000).optional(),
  type: z.enum(["resonance", "question", "connection", "suggestion", "self_answer"]).optional(),
  visibility: z.enum(["cohort", "public"]).optional(),
});

export type UpdateResponseInput = z.infer<typeof updateResponseSchema>;

export const saveSentenceSchema = z.object({
  content: z.string().min(1).max(1000),
  reason: z.string().max(500).optional(),
  paragraphIndex: z.number().int().optional(),
  recordId: z.string().min(1),
});

export type SaveSentenceInput = z.infer<typeof saveSentenceSchema>;

export const personalReflectionSchema = z.object({
  letGo: z.string().optional().nullable(),
  carryQuestion: z.string().optional().nullable(),
  lastingSentence: z.string().optional().nullable(),
});

export type PersonalReflectionInput = z.infer<typeof personalReflectionSchema>;

export const updateSettingsSchema = z.object({
  defaultVisibility: z.enum(["draft", "private", "cohort", "public"]).optional(),
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
  format: z.enum(["note", "article"]).optional(),
  type: z.enum(RECORD_TYPES).optional(),
  rhythm: z.enum(["moment", "weekly", "monthly", "stage", "free"]).optional(),
  visibility: z.enum(["draft", "private", "cohort", "public"]).optional(),
  cohort: z.string().optional(),
  sort: z.enum(["recent", "oldest"]).optional(),
  page: z.coerce.number().int().positive().default(1),
});

export type RecordFilterInput = z.infer<typeof recordFilterSchema>;

export function parseReferencesFromFormData(
  formData: FormData,
): { url: string; title?: string }[] {
  const references: { url: string; title?: string }[] = [];
  let index = 0;
  while (true) {
    const url = formData.get(`references[${index}][url]`);
    if (url === null) break;
    const urlStr = String(url).trim();
    if (urlStr !== "") {
      const title = formData.get(`references[${index}][title]`);
      references.push({
        url: urlStr,
        title: title ? String(title).trim() || undefined : undefined,
      });
    }
    index++;
  }
  return references;
}

export function validateResponseContentLength(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.type === "doc") {
      const plainText = getPlainText(jsonStr, "article");
      return plainText.length <= 10000;
    }
  } catch {
    return jsonStr.length <= 10000;
  }
  return jsonStr.length <= 10000;
}

export function validateMentionLimits(jsonStr: string): {
  userMentions: number;
  recordRefs: number;
  valid: boolean;
} {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.type === "doc") {
      const mentions = extractUserMentions(jsonStr);
      const refs = extractRecordRefs(jsonStr);
      return {
        userMentions: mentions.length,
        recordRefs: refs.length,
        valid: mentions.length <= 10 && refs.length <= 10,
      };
    }
  } catch {
    return { userMentions: 0, recordRefs: 0, valid: true };
  }
  return { userMentions: 0, recordRefs: 0, valid: true };
}
