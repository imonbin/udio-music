export type Success<T> = { readonly ok: true; readonly value: T };
export type Failure<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Success<T> | Failure<E>;

export function success<T, E = never>(value: T): Result<T, E> {
  return { ok: true, value };
}

export function failure<T = never, E = unknown>(error: E): Result<T, E> {
  return { ok: false, error };
}

export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.ok;
}

export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return !result.ok;
}

export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return isSuccess(result) ? success(fn(result.value)) : result;
}

export function mapError<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  return isFailure(result) ? failure(fn(result.error)) : result;
}

export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  return isSuccess(result) ? fn(result.value) : result;
}

export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return isSuccess(result) ? result.value : fallback;
}
