import { expect, test } from "vitest";
import { firstSentence } from "@/lib/sentence";

test("a turn cut at a semicolon ends with a full stop", () => {
  expect(firstSentence("BTC/USDT is 77,470.00; 24h range 77,350.05 to 77,489.97.")).toBe(
    "BTC/USDT is 77,470.00.",
  );
  expect(firstSentence("خبر مهمی نیست؛ تیم فقط با قیمت معامله می‌کند.")).toBe("خبر مهمی نیست.");
});

test("a turn cut at a full stop stays as it is", () => {
  expect(firstSentence("BTC looks weak. RSI is 35.")).toBe("BTC looks weak.");
  expect(firstSentence("Hold for now")).toBe("Hold for now");
});
