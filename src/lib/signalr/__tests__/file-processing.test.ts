import { describe, expect, it } from "vitest";
import { fileMatchesUpload } from "../file-processing";

describe("fileMatchesUpload", () => {
  it("matches by fileId", () => {
    expect(
      fileMatchesUpload(
        {
          originalKey: "users/1/chat/g1/raw.jpg",
          thumbKey: "users/1/chat/g1/thumb.webp",
          originalUrl: "https://cdn/x/raw.jpg",
          thumbUrl: "https://cdn/x/thumb.webp",
          fileId: "abc",
        },
        { fileId: "abc", key: "something/else.jpg" },
      ),
    ).toBe(true);
  });

  it("matches by exact key", () => {
    expect(
      fileMatchesUpload(
        {
          originalKey: "users/1/chat/g1/raw.jpg",
          thumbKey: "users/1/chat/g1/thumb.webp",
          originalUrl: "https://cdn/x/raw.jpg",
          thumbUrl: "https://cdn/x/thumb.webp",
        },
        { fileId: "other", key: "users/1/chat/g1/raw.jpg" },
      ),
    ).toBe(true);
  });

  it("matches CDN urls against keys by folder suffix", () => {
    expect(
      fileMatchesUpload(
        {
          originalKey: "users/1/chat/g1/raw.jpg",
          thumbKey: "users/1/chat/g1/thumb.webp",
          originalUrl: "https://cdn.example.com/users/1/chat/g1/original.webp",
          thumbUrl: "https://cdn.example.com/users/1/chat/g1/thumb.webp",
        },
        { fileId: "other", key: "users/1/chat/g1/raw.jpg" },
      ),
    ).toBe(true);
  });

  it("rejects unrelated files", () => {
    expect(
      fileMatchesUpload(
        {
          originalKey: "users/2/chat/g9/raw.jpg",
          thumbKey: "users/2/chat/g9/thumb.webp",
          originalUrl: "https://cdn.example.com/users/2/chat/g9/original.webp",
          thumbUrl: "https://cdn.example.com/users/2/chat/g9/thumb.webp",
          fileId: "zzz",
        },
        { fileId: "abc", key: "users/1/chat/g1/raw.jpg" },
      ),
    ).toBe(false);
  });
});
