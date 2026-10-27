import { describe, expect, it } from "vitest";
import { getZaloUrl, normalizeZaloPhone } from "../zalo";

describe("normalizeZaloPhone", () => {
  it("keeps a local Vietnamese number as-is", () => {
    expect(normalizeZaloPhone("0912345678")).toBe("0912345678");
  });

  it("strips spaces, dots and dashes", () => {
    expect(normalizeZaloPhone("0912 345 678")).toBe("0912345678");
    expect(normalizeZaloPhone("091.234.5678")).toBe("0912345678");
    expect(normalizeZaloPhone("091-234-5678")).toBe("0912345678");
  });

  it("converts +84 and 0084 prefixes to the local 0 form", () => {
    expect(normalizeZaloPhone("+84912345678")).toBe("0912345678");
    expect(normalizeZaloPhone("84912345678")).toBe("0912345678");
    expect(normalizeZaloPhone("0084912345678")).toBe("0912345678");
  });

  it("rejects empty or implausible input", () => {
    expect(normalizeZaloPhone(undefined)).toBeNull();
    expect(normalizeZaloPhone(null)).toBeNull();
    expect(normalizeZaloPhone("")).toBeNull();
    expect(normalizeZaloPhone("abc")).toBeNull();
    expect(normalizeZaloPhone("123")).toBeNull();
    expect(normalizeZaloPhone("1234567890123")).toBeNull();
  });
});

describe("getZaloUrl", () => {
  it("builds the zalo.me deep link", () => {
    expect(getZaloUrl("+84 912 345 678")).toBe(
      "https://zalo.me/0912345678",
    );
  });

  it("returns null without a usable number", () => {
    expect(getZaloUrl("")).toBeNull();
    expect(getZaloUrl(undefined)).toBeNull();
  });
});
