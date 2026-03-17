import { beforeEach, describe, expect, it, vi } from "vitest";

import { createReminder, getDueReminders, markReminderSent } from "../misc/reminders.server";
import { db } from "../../client.server";

vi.mock("../../client.server", () => ({
  db: vi.fn(),
}));

vi.mock("../../../lib/utils.server", () => ({
  nanoid: vi.fn(() => "reminder-fixed-id"),
}));

function createQuery(result: unknown) {
  const query = {
    from: vi.fn(() => query),
    where: vi.fn(() => query),
    limit: vi.fn(async () => result),
    orderBy: vi.fn(async () => result),
  };

  return query;
}

function createDatabaseMock(selectResults: unknown[]) {
  const queue = [...selectResults];
  const select = vi.fn(() => createQuery(queue.shift() ?? []));
  const insertValues = vi.fn(async () => undefined);
  const updateWhere = vi.fn(async () => undefined);

  return {
    select,
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: updateWhere })) })),
    _spies: {
      insertValues,
      updateWhere,
    },
  };
}

describe("reminders query", () => {
  const d1 = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("create -> getDue -> markSent -> getDue(0건) 흐름이 동작한다", async () => {
    const dueReminder = {
      id: "reminder-fixed-id",
      questionId: "q-001",
      learnerId: "hana",
      remindAt: 100,
      sentAt: null,
      createdAt: 100,
    };

    const mockDb = createDatabaseMock([[dueReminder], [dueReminder], []]);
    vi.mocked(db).mockReturnValue(mockDb as never);

    const created = await createReminder(d1, {
      questionId: "q-001",
      learnerId: "hana",
      remindAt: 100,
    });
    expect(created.id).toBe("reminder-fixed-id");

    const dueBefore = await getDueReminders(d1, "hana");
    expect(dueBefore).toHaveLength(1);

    await markReminderSent(d1, "reminder-fixed-id");

    const dueAfter = await getDueReminders(d1, "hana");
    expect(dueAfter).toHaveLength(0);
    expect(mockDb._spies.insertValues).toHaveBeenCalledTimes(1);
    expect(mockDb._spies.updateWhere).toHaveBeenCalledTimes(1);
  });
});
