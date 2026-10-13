import { describe, expect, it } from "vitest";
import { whatsappImageUrls } from "./whatsapp-images";

describe("whatsappImageUrls", () => {
  it("keeps public receipt links and drops private or invalid ones", () => {
    const urls = whatsappImageUrls([
      " https://res.cloudinary.com/demo/image/upload/receipt.jpg ",
      "http://127.0.0.1/secret.jpg",
      "not-a-url",
      "file:///tmp/bill.jpg",
      "https://cdn.example.com/second.png",
      "https://cdn.example.com/third.webp",
      "https://cdn.example.com/fourth.gif",
    ]);
    expect(urls).toEqual([
      "https://res.cloudinary.com/demo/image/upload/receipt.jpg",
      "https://cdn.example.com/second.png",
      "https://cdn.example.com/third.webp",
    ]);
  });
});
