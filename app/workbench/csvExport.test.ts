// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadCsv, toCsv } from "./csvExport.js";

describe("toCsv — pure formatting", () => {
  it("uses the first row's key order as the header", () => {
    const csv = toCsv([{ x: 0.1, Scc0: 0.07 }, { x: 0.2, Scc0: 0.09 }]);
    expect(csv).toBe("x,Scc0\r\n0.1,0.07\r\n0.2,0.09");
  });

  it("returns an empty string for zero rows", () => {
    expect(toCsv([])).toBe("");
  });

  it("quotes and escapes a value containing a comma, quote, or newline", () => {
    const csv = toCsv([{ note: 'has, a comma' }, { note: 'has "quotes"' }, { note: "has\na newline" }]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe('"has, a comma"');
    expect(lines[2]).toBe('"has ""quotes"""');
    expect(lines[3]).toBe('"has\na newline"');
  });

  it("renders undefined/null cells as an empty field", () => {
    const csv = toCsv([{ a: 1, b: undefined }, { a: null, b: 2 }]);
    expect(csv).toBe("a,b\r\n1,\r\n,2");
  });
});

describe("downloadCsv — DOM wiring", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates an object URL, clicks a download anchor, then revokes the URL", () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadCsv("results.csv", "a,b\r\n1,2");

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    expect(document.querySelectorAll("a[download]")).toHaveLength(0); // removed after click
  });

  it("sets the anchor's download attribute to the given filename", () => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn().mockReturnValue("blob:mock-url"), revokeObjectURL: vi.fn() });
    let downloadedName = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloadedName = this.download;
    });

    downloadCsv("sweep.csv", "x,y\r\n1,2");

    expect(downloadedName).toBe("sweep.csv");
  });
});
