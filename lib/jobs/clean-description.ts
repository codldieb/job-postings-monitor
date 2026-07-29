const FOOTER_CUT_PATTERNS: RegExp[] = [
  /\bEEO and Accommodations\b/i,
  /\bequal opportunity employer\b/i,
  /\ball qualified applicants will receive consideration for employment without regard to\b/i,
  /\bwithout regard to race, color, religion, sex\b/i,
  /\bprotected veterans['']? status\b/i,
  /\bReasonable accommodations are available for candidates during all aspects of the selection process\b/i,
  /\b(?:please )?(?:advise|contact).{0,40}accommodation/i,
  /\bIf you have questions or concerns about the pay range\b/i,
  /\bpeopleone@slalom\.com\b/i,
  /\b(?:use|uses|using) (?:artificial intelligence|AI|machine learning|automated (?:tools?|technology|systems?)).{0,120}(?:hiring|recruitment|recruiting|selection|screening|application|interview|talent acquisition)/i,
  /\b(?:artificial intelligence|AI|machine learning|ML).{0,100}(?:assist|support|help|used|utilized).{0,80}(?:hiring|recruitment|application|candidate selection|employment decisions?)/i,
  /\bautomated employment decision tools?\b/i,
  /\bnext steps in (?:the )?(?:hiring|recruitment|selection|interview) process\b/i,
  /\bGo back Apply Share this job\b/i,
  /\bShare this job LinkedIn Email Similar jobs\b/i,
  /\bSimilar jobs View all\b/i,
  /\bApply now\s*[»›]\s*Find similar jobs\b/i,
  /\bFind similar jobs:\s*/i,
  /\bTELUS\.com Privacy\s*\/\s*Cookies\b/i,
  /\bPrivacy\s*\/\s*Cookies\s*Accessibility\b/i,
  /\bAccessibilityTELUS is proud\b/i,
  /\bWhen you join our team, you(?:'re| are) helping us make the future friendly\b/i,
  /\bNote for Quebec candidates\b/i,
  /\bA bit about us(?:We['']?re|We are)/i,
  /\bAbout Us(?:Slalom|Capital One)/i,
  /\bCompensation and Benefits(?:Slalom|Capital One)/i,
];

function trimLeadingBoilerplate(text: string): string {
  let cleaned = text.trim();

  if (/By continuing to use and navigate this website/i.test(cleaned)) {
    const applyIdx = cleaned.search(/Apply now\s*[»›]\s*/i);
    if (applyIdx !== -1) {
      cleaned = cleaned.slice(applyIdx);
    }
  }

  if (/^Home\s*(?:\.\.\.|›|\u203a)/i.test(cleaned)) {
    const idx = cleaned.search(
      /(?:Description and Requirements|Job Description)\s/i
    );
    if (idx !== -1) {
      cleaned = cleaned.slice(idx);
    }
  }

  const capOneAt = cleaned.match(
    /\bOverview\b[\s\S]{0,400}?\bAt Capital One\b/i
  );
  if (capOneAt?.index !== undefined) {
    const start = cleaned.indexOf("At Capital One", capOneAt.index);
    if (start !== -1) {
      cleaned = cleaned.slice(start);
    }
  }

  cleaned = cleaned.replace(
    /^(?:Description and Requirements\s*)?Job Description\s*/i,
    ""
  );

  return cleaned.trim();
}

function truncateFooterBoilerplate(text: string): string {
  const minIndex = Math.floor(text.length * 0.3);

  let cutAt = text.length;
  for (const pattern of FOOTER_CUT_PATTERNS) {
    const match = text.match(pattern);
    if (
      match?.index !== undefined &&
      match.index >= minIndex &&
      match.index < cutAt
    ) {
      cutAt = match.index;
    }
  }

  return text.slice(0, cutAt).trim();
}

export function cleanJobDescription(text: string): string {
  if (!text.trim()) return text;

  let cleaned = trimLeadingBoilerplate(text);
  cleaned = truncateFooterBoilerplate(cleaned);
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned.length > 0 ? cleaned : text.trim();
}
