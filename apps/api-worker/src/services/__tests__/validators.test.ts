import { describe, expect, it } from "vitest";
import {
  activityCreateSchema,
  workPlanCreateSchema,
} from "../validators";

describe("validators", () => {
  it("validates work plan create payload", () => {
    const parsed = workPlanCreateSchema.safeParse({
      date: "2026-03-09",
      activity: "Client onboarding and setup",
      expectedOutput: "Configured workspace with user access",
      priority: "high",
      status: "planned",
      category: "Operations",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid activity time range at schema level for date format", () => {
    const parsed = activityCreateSchema.safeParse({
      date: "09-03-2026",
      timeFromUtc: "2026-03-09T09:00:00.000Z",
      timeToUtc: "2026-03-09T10:00:00.000Z",
      taskDescription: "Daily stand-up and planning",
      output: "Action items recorded",
      note: "",
      delivery: "",
      category: "Coordination",
      workplanId: null,
    });
    expect(parsed.success).toBe(false);
  });
});
