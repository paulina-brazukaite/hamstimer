import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings } from "./settings";

describe("settings", () => {
  it("defaults to sound on, notifications off", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toEqual({ sound: true, notify: false });
  });

  it("keeps valid values and ignores junk", () => {
    expect(parseSettings({ sound: false, notify: true })).toEqual({ sound: false, notify: true });
    expect(parseSettings({ sound: "no", extra: 1 })).toEqual(DEFAULT_SETTINGS);
  });
});
