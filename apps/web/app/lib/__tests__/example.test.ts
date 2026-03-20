import { describe, it, expect } from "vitest";

describe("example smoke test", () => {
  it("should pass basic arithmetic", () => {
    expect(2 + 2).toBe(4);
  });

  it("should handle string concatenation", () => {
    expect("hello" + " " + "world").toBe("hello world");
  });

  it("should work with arrays", () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr[0]).toBe(1);
  });
});
