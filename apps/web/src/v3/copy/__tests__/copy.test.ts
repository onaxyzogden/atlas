import { describe, it, expect } from "vitest";
import { UNIVERSAL_DOMAINS } from "@ogden/shared";
import { PlanStratumId } from "@ogden/shared";
import {
  domainUnansweredQuestion,
  revisionHeadline,
  revisionSupporting,
  feedsFallback,
  decisionCount,
  unlockSurveyLine,
  lockReason,
  observeSignalConfirmation,
  joinReadable,
} from "../index.js";

describe("observe copy", () => {
  it("has a non-empty unanswered question for every universal domain", () => {
    for (const domain of UNIVERSAL_DOMAINS) {
      expect(domainUnansweredQuestion(domain).length).toBeGreaterThan(0);
    }
  });

  it("revisionHeadline omits the cycle title when null", () => {
    const headline = revisionHeadline("high", null);
    expect(headline).not.toContain("--");
  });

  it("revisionHeadline echoes the cycle title when present", () => {
    const headline = revisionHeadline("high", "Year 1 Establishment");
    expect(headline).toContain("Year 1 Establishment");
  });

  it("revisionSupporting omits the cycle clause when title is null", () => {
    const supporting = revisionSupporting({ eventCount: 1, domains: [], cycleTitle: null });
    expect(supporting).not.toContain("cycle");
    expect(supporting).toContain("1");
    expect(supporting).toContain("reading");
  });

  it("revisionSupporting echoes the cycle title and pluralises", () => {
    const supporting = revisionSupporting({
      eventCount: 2,
      domains: ["soil", "hydrology"],
      cycleTitle: "Soil Recovery",
    });
    expect(supporting).toContain("Soil Recovery");
    expect(supporting).toContain("readings");
    expect(supporting).toContain("and");
  });
});

describe("plan copy", () => {
  it("has a non-empty lock reason for every plan stratum", () => {
    for (const stratumId of PlanStratumId.options) {
      expect(lockReason(stratumId).length).toBeGreaterThan(0);
    }
  });

  it("unlockSurveyLine differs by site variant and defaults safely", () => {
    expect(unlockSurveyLine("hilly")).not.toBe(unlockSurveyLine("flat"));
    expect(unlockSurveyLine()).toBe(unlockSurveyLine("default"));
  });
});

describe("act copy", () => {
  it("decisionCount renders progress", () => {
    expect(decisionCount(3, 7)).toBe("3 / 7 decisions made");
  });

  it("feedsFallback is empty for no targets and prefixed otherwise", () => {
    expect(feedsFallback([])).toBe("");
    expect(feedsFallback(["Water Strategy"])).toBe("Feeds Water Strategy");
  });

  it("observeSignalConfirmation names the domain when known", () => {
    expect(observeSignalConfirmation(null)).not.toContain("under");
    expect(observeSignalConfirmation("Hydrology & Water")).toContain("Hydrology & Water");
  });
});

describe("shared copy", () => {
  it("joinReadable builds readable lists", () => {
    expect(joinReadable([])).toBe("");
    expect(joinReadable(["a"])).toBe("a");
    expect(joinReadable(["a", "b"])).toBe("a and b");
    expect(joinReadable(["a", "b", "c"])).toBe("a, b, and c");
  });
});
