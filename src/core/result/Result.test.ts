import { describe, expect, it } from "vitest";
import {
  failure,
  flatMap,
  isFailure,
  isSuccess,
  map,
  mapError,
  success,
  unwrapOr,
} from "./Result.js";

describe("Result", () => {
  it("creates a Success value", () => {
    const result = success(42);
    expect(result.ok).toBe(true);
    expect(isSuccess(result)).toBe(true);
    expect(isFailure(result)).toBe(false);
  });

  it("creates a Failure value", () => {
    const result = failure("boom");
    expect(result.ok).toBe(false);
    expect(isFailure(result)).toBe(true);
    expect(isSuccess(result)).toBe(false);
  });

  it("narrows to the value via isSuccess", () => {
    const result = success(42);
    if (isSuccess(result)) {
      expect(result.value).toBe(42);
    } else {
      throw new Error("expected success");
    }
  });

  it("narrows to the error via isFailure", () => {
    const result = failure("boom");
    if (isFailure(result)) {
      expect(result.error).toBe("boom");
    } else {
      throw new Error("expected failure");
    }
  });

  it("map transforms the value inside Success", () => {
    expect(map(success(2), (v) => v * 10)).toEqual(success(20));
  });

  it("map leaves Failure untouched", () => {
    expect(map(failure<number, string>("err"), (v) => v * 10)).toEqual(failure("err"));
  });

  it("mapError transforms the error inside Failure", () => {
    expect(mapError(failure("err"), (e) => e.toUpperCase())).toEqual(failure("ERR"));
  });

  it("mapError leaves Success untouched", () => {
    expect(mapError(success<number, string>(5), (e) => e.toUpperCase())).toEqual(success(5));
  });

  it("flatMap chains Success results", () => {
    expect(flatMap(success(2), (v) => success(v + 1))).toEqual(success(3));
  });

  it("flatMap short-circuits on Failure", () => {
    expect(flatMap(failure<number, string>("err"), (v) => success(v + 1))).toEqual(failure("err"));
  });

  it("unwrapOr returns the value on Success", () => {
    expect(unwrapOr(success(7), 0)).toBe(7);
  });

  it("unwrapOr returns the fallback on Failure", () => {
    expect(unwrapOr(failure<number, string>("err"), 0)).toBe(0);
  });
});
