import { defineConfig } from 'vitest/config';

/**
 * These are integration tests, not unit tests: each file boots its own
 * in-memory MongoDB and every auth path runs bcrypt, which is deliberately
 * slow. Vitest's 5s default is far too tight for that — under full
 * parallelism the suite failed with timeouts that moved around between runs,
 * which reads as a flaky product rather than an under-budgeted test harness.
 */
export default defineConfig({
  test: {
    testTimeout: 30_000,
    hookTimeout: 60_000,

    // Cap concurrent files so six MongoMemoryServer instances plus bcrypt do
    // not saturate the machine. Slower wall-clock, but deterministic.
    maxWorkers: 2,
    minWorkers: 1,
  },
});
