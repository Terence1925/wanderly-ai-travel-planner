import { describe, expect, it } from "vitest";
import { cleanPlaceQuery, pickPhoto } from "@/lib/place-photo";

describe("cleanPlaceQuery", () => {
  it.each([
    ["Lunch at Nishiki Market", "Nishiki Market"],
    ["Sunset stroll on Pontocho", "Pontocho"],
    ["Coffee at % Arabica Arashiyama", "% Arabica Arashiyama"],
    ["Kinkaku-ji (Golden Pavilion)", "Kinkaku-ji"],
    ["Hanamikoji & Pontocho evening", "Hanamikoji Pontocho evening"],
    ["Fushimi Inari Taisha", "Fushimi Inari Taisha"],
  ])("%s → %s", (input, expected) => {
    expect(cleanPlaceQuery(input)).toBe(expected);
  });
});

describe("pickPhoto", () => {
  const page = (title: string, index: number, hasPhoto = true) => ({
    title,
    index,
    thumbnail: hasPhoto ? { source: `https://img/${title}.jpg` } : undefined,
  });

  it("returns the best-ranked match that has a photo", () => {
    const result = pickPhoto(
      [page("Nishiki Market", 2), page("Nishiki", 1, false), page("Kyoto", 3)],
      "Nishiki Market",
      "Kyoto",
    );
    expect(result?.pageTitle).toBe("Nishiki Market");
  });

  it("rejects results that only match the destination name", () => {
    expect(pickPhoto([page("Kyoto", 1)], "Dinner in Kyoto", "Kyoto")).toBeNull();
  });

  it("rejects unrelated results", () => {
    expect(pickPhoto([page("Tokyo Tower", 1)], "Nishiki Market", "Kyoto")).toBeNull();
  });

  it("ignores accents and case when matching", () => {
    expect(pickPhoto([page("Café de Flore", 1)], "cafe de flore", "Paris")?.pageTitle).toBe("Café de Flore");
  });
});
