import { filterRowsByDate } from "./download-date";

describe("download Nepal-day filtering", () => {
  const rows = [
    { id: "before", date: "2026-10-12T18:14:59.999Z" },
    { id: "first", date: "2026-10-12T18:15:00.000Z" },
    { id: "last", date: "2026-10-13T18:14:59.999Z" },
    { id: "after", date: "2026-10-13T18:15:00.000Z" },
    { id: "bad", date: "not-a-date" },
    { id: "missing", date: null },
  ];

  it("includes both exact edges of one Nepal day", () => {
    const result = filterRowsByDate(
      rows,
      { startDate: "2026-10-13", endDate: "2026-10-13" },
      (row) => row.date
    );

    expect(result.map((row) => row.id)).toEqual(["first", "last"]);
  });

  it("supports start-only and end-only ranges", () => {
    const startOnly = filterRowsByDate(
      rows,
      { startDate: "2026-10-14" },
      (row) => row.date
    );
    const endOnly = filterRowsByDate(
      rows,
      { endDate: "2026-10-12" },
      (row) => row.date
    );

    expect(startOnly.map((row) => row.id)).toEqual(["after"]);
    expect(endOnly.map((row) => row.id)).toEqual(["before"]);
  });

  it("does not drop rows when no range was selected", () => {
    expect(filterRowsByDate(rows, {}, (row) => row.date)).toBe(rows);
  });
});
