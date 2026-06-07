// Force-exit reporter — workaround for a vitest 2.1.x / tinypool fork-pool
// teardown hang.
//
// Symptom: after ALL test files pass, the runner never exits. tinypool's
// graceful pool.close() waits on a pending OS handle that a happy-dom
// environment test file leaves alive in its worker; `teardownTimeout` does
// not reliably reap it, so `vitest run` becomes a multi-minute zombie on
// Linux CI (and an indefinite one on Windows). The run summary prints, then
// the process hangs forever — CI only ends it via the 15-minute job timeout.
//
// Fix: vitest awaits every reporter's `onFinished(files, errors)` AFTER all
// results are aggregated but BEFORE it calls pool.close(). Exiting the main
// process here yields the correct pass/fail code without ever reaching the
// hang. `setImmediate` lets the 'default' reporter's synchronous summary
// flush first. This only force-exits the top-level runner once the run is
// fully decided; it never masks a failure (a failed file or unhandled error
// still exits non-zero).
// Vitest instantiates path-referenced reporters with `new`, so this must be a
// class (a plain object throws "CustomReporter is not a constructor").
export default class ForceExitReporter {
  onFinished(files = [], errors = []) {
    const anyFailed =
      (errors?.length ?? 0) > 0 ||
      files.some((f) => f?.result?.state === 'fail');
    setImmediate(() => process.exit(anyFailed ? 1 : 0));
  }
}
