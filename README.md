# Job Postings Monitor

A Next.js app that monitors a list of company career pages and checks them daily for new job postings.

## Features

- Add and remove career page URLs to monitor
- Scrape pages for job-related links using Cheerio
- Track newly discovered postings vs. previously seen ones
- Run checks manually or on a daily schedule
- JSON file storage (no database setup required)

## Tech stack

- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Cheerio** for HTML parsing
- **Playwright** for JavaScript-rendered career pages (optional fallback)

## Getting started

### Prerequisites

Install [Node.js](https://nodejs.org/) (LTS recommended, v18+).

### Setup

```bash
cd C:\Code\job-postings-monitor
npm install
copy .env.example .env
```

Edit `.env` and set a random `CRON_SECRET` value.

`npm install` also downloads Chromium for Playwright (used when a site loads jobs via JavaScript).

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production

```bash
npm run build
npm start
```

## Daily scheduling

### Option 1: Vercel Cron (recommended for deployment)

Deploy to Vercel and set `CRON_SECRET` in project environment variables. The included `vercel.json` runs a check every day at 8:00 AM UTC.

### Option 2: Windows Task Scheduler (local)

1. Keep the app running (`npm start`) or run it as a service.
2. Open **Task Scheduler** → **Create Basic Task**.
3. Set the trigger to **Daily** at your preferred time.
4. Action: **Start a program**
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "C:\Code\job-postings-monitor\scripts\daily-check.ps1"`

Ensure `.env` contains `CRON_SECRET` and optionally `APP_URL`.

## How it works

1. You add career page URLs (e.g. `https://company.com/careers`).
2. On each check, the app fetches the page HTML and finds links that look like job postings (URLs or text containing keywords like "job", "career", "position", etc.).
3. Each posting is fingerprinted by site + URL. New ones are flagged as **New**.
4. Results are stored in `data/jobs.json` and `data/sites.json`.

## Scraping strategy

Checks use a hybrid pipeline:

1. **ATS JSON APIs** for Greenhouse and Ashby boards (fast, reliable)
2. **Static HTML** via Cheerio for server-rendered career pages
3. **Playwright browser fallback** for JavaScript-rendered pages (Workday, ApplicantPro, marketing `/careers` pages)

For best results, add the direct job board URL (e.g. `jobs.ashbyhq.com/company`) rather than a company marketing page when possible.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sites` | List monitored sites |
| POST | `/api/sites` | Add a site (`{ name, url }`) |
| DELETE | `/api/sites/[id]` | Remove a site |
| GET | `/api/jobs` | List job postings (`?new=true` for new only) |
| POST | `/api/jobs/mark-seen` | Mark all jobs as seen |
| POST | `/api/check` | Run a check immediately |
| GET | `/api/cron/check` | Daily cron endpoint (requires `Authorization: Bearer CRON_SECRET`) |

## Notes

- Scraping works best on static career pages. Sites that load jobs via JavaScript may need custom integration later.
- Respect robots.txt and rate limits when monitoring third-party sites.
- Site and job data in `data/*.json` is tracked in git so your monitored companies and discovered postings sync when you pull on another machine.
