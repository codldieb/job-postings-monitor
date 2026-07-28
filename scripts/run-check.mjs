#!/usr/bin/env node

/**
 * Standalone script for scheduling daily checks outside the app.
 * Usage: node scripts/run-check.mjs
 *
 * Requires APP_URL and CRON_SECRET environment variables, or a local .env file
 * loaded by your scheduler.
 */

const appUrl = process.env.APP_URL || "http://localhost:3000";
const cronSecret = process.env.CRON_SECRET;

if (!cronSecret) {
  console.error("CRON_SECRET environment variable is required.");
  process.exit(1);
}

async function main() {
  const response = await fetch(`${appUrl}/api/cron/check`, {
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  });

  const body = await response.text();

  if (!response.ok) {
    console.error(`Check failed (${response.status}): ${body}`);
    process.exit(1);
  }

  console.log(body);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
