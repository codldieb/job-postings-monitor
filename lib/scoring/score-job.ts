import {
  ensurePlainTextDescription,
  fetchJobDetails,
  looksLikeHtml,
} from "@/lib/jobs/description";
import {
  evaluateLocationMatch,
  inferJobLocation,
  sanitizeLocationString,
} from "@/lib/jobs/location";
import { inferLocationTypes } from "@/lib/jobs/location-type";
import {
  DEFAULT_TARGET_DEPARTMENTS,
  evaluateRoleRelevance,
} from "@/lib/jobs/role-relevance";
import { missingRequiredLanguages } from "@/lib/jobs/language-requirements";
import { getResumeProfile, updateJob } from "@/lib/db";
import { judgeJobWithOllama } from "@/lib/scoring/llm-judge";
import {
  combineMatchScores,
  parseJobExperienceRequirement,
  scoreExperienceMatch,
} from "@/lib/skills/experience";
import {
  applyMissingSkillPenalty,
  OFF_TARGET_SCORE_CAP,
  scoreJobMatch,
  skillMentionedInText,
} from "@/lib/skills/matcher";
import { getUserSynonyms } from "@/lib/skills/user-synonyms";
import type { JobPosting } from "@/lib/types";

export async function scoreJob(job: JobPosting): Promise<JobPosting> {
  const profile = await getResumeProfile();

  if (!profile?.skills.length) {
    const scoredAt = new Date().toISOString();
    const updated: JobPosting = {
      ...job,
      matchScore: undefined,
      matchSkillScore: undefined,
      matchExperienceScore: undefined,
      experienceNote: undefined,
      roleRelevant: undefined,
      roleRelevanceNote: undefined,
      locationInTarget: undefined,
      locationNote: undefined,
      locationTypes: undefined,
      matchedSkills: undefined,
      missingSkills: undefined,
      matchSource: undefined,
      matchSummary: undefined,
      scoredAt,
      scoreError: "Add skills to your resume profile before scoring",
    };
    await updateJob(job.id, updated);
    return updated;
  }

  try {
    let descriptionText = job.descriptionText;
    let department = job.department;
    let team = job.team;
    let location = job.location;

    const needsDescriptionRefresh =
      !descriptionText?.trim() || looksLikeHtml(descriptionText);

    if (needsDescriptionRefresh) {
      const details = await fetchJobDetails(job.url);
      descriptionText = details.descriptionText;
      department = department ?? details.department;
      team = team ?? details.team;
      if (details.location) {
        location = details.location;
      }
    } else {
      descriptionText = ensurePlainTextDescription(descriptionText ?? "");
    }

    const jobForMatching: JobPosting = {
      ...job,
      descriptionText,
      department,
      team,
      location,
    };

    const userSynonyms = await getUserSynonyms();
    const positionExperience = profile.positionExperience ?? [];
    const result = scoreJobMatch(
      profile.skills,
      descriptionText,
      userSynonyms,
      job.title,
      positionExperience
    );
    const ruleExperience = scoreExperienceMatch(
      positionExperience,
      job.title,
      parseJobExperienceRequirement(job.title, descriptionText)
    );
    const roleRelevance = evaluateRoleRelevance(jobForMatching, profile);
    const locationMatch = evaluateLocationMatch(jobForMatching, profile);
    const resolvedLocation =
      sanitizeLocationString(location) ??
      sanitizeLocationString(locationMatch.location) ??
      sanitizeLocationString(inferJobLocation(jobForMatching));
    const locationTypes = inferLocationTypes({
      ...jobForMatching,
      location: resolvedLocation,
    });

    let match = result;
    let roleRelevant = roleRelevance.relevant;
    let roleRelevanceNote = roleRelevance.note;
    let matchSource: JobPosting["matchSource"] = "rules";
    let matchSummary: string | undefined;
    const targetDepartments =
      profile.targetDepartments?.filter(Boolean) ?? [];

    // Keep location as a hard filter: skip the LLM when the job is already
    // outside the user's target geography.
    if (locationMatch.inTarget !== false && descriptionText?.trim()) {
      const judged = await judgeJobWithOllama({
        title: job.title,
        department,
        team,
        location: resolvedLocation,
        descriptionText,
        resumeSkills: profile.skills,
        positionExperience: profile.positionExperience ?? [],
        targetDepartments:
          targetDepartments.length > 0
            ? targetDepartments
            : DEFAULT_TARGET_DEPARTMENTS,
      });

      if (judged) {
        const searchText = `${job.title}\n${descriptionText}`;
        const groundedMatches = judged.match.matchedSkills.filter((skill) =>
          skillMentionedInText(skill, searchText, userSynonyms)
        );
        const inventedMatches =
          judged.match.matchedSkills.length - groundedMatches.length;
        const groundedMissing = judged.match.missingSkills.filter((skill) =>
          skillMentionedInText(skill, searchText, userSynonyms)
        );
        const matchedSkills =
          groundedMatches.length > 0
            ? groundedMatches
            : result.matchedSkills;
        const skillScore =
          matchedSkills.length === 0
            ? 0
            : inventedMatches > 0 || groundedMatches.length === 0
              ? result.skillScore
              : judged.match.skillScore;
        const experienceScore =
          !judged.experienceRequired
            ? 100
            : ruleExperience.matchedPosition
              ? ruleExperience.score
              : judged.match.experienceScore;
        const experienceNote =
          !judged.experienceRequired
            ? judged.match.experienceNote
            : ruleExperience.matchedPosition
              ? ruleExperience.note
              : judged.match.experienceNote;

        match = applyMissingSkillPenalty(
          {
            ...judged.match,
            matchedSkills,
            missingSkills:
              groundedMissing.length > 0
                ? groundedMissing
                : result.missingSkills,
            skillScore,
            experienceScore,
            experienceNote,
            score: combineMatchScores(skillScore, experienceScore, {
              detected: judged.experienceRequired,
            }),
          },
          judged.experienceRequired
        );
        roleRelevant = judged.roleRelevant;
        roleRelevanceNote = judged.roleRelevanceNote;
        matchSource = "ollama";
        matchSummary = judged.summary || undefined;
      }
    }

    if (roleRelevance.relevant === true) {
      roleRelevant = true;
      roleRelevanceNote = roleRelevance.note;
    } else if (roleRelevance.relevant === false) {
      roleRelevant = false;
      roleRelevanceNote = roleRelevance.note;
    }

    const languageGaps = missingRequiredLanguages(
      `${job.title}\n${descriptionText}`,
      profile.skills
    );
    if (languageGaps.length > 0) {
      const missingSkills = [
        ...new Map(
          [...match.missingSkills, ...languageGaps].map((skill) => [
            skill.toLowerCase(),
            skill,
          ])
        ).values(),
      ];
      match = applyMissingSkillPenalty(
        { ...match, missingSkills },
        Boolean(ruleExperience.requirement?.detected)
      );
    }

    if (roleRelevant === false) {
      match = {
        ...match,
        skillScore: Math.min(match.skillScore, OFF_TARGET_SCORE_CAP),
        score: Math.min(match.score, OFF_TARGET_SCORE_CAP),
      };
    }

    const scoredAt = new Date().toISOString();

    const updated: JobPosting = {
      ...jobForMatching,
      location: resolvedLocation,
      locationTypes: locationTypes.length > 0 ? locationTypes : undefined,
      descriptionFetchedAt: scoredAt,
      matchScore: match.score,
      matchSkillScore: match.skillScore,
      matchExperienceScore: match.experienceScore,
      experienceNote: match.experienceNote,
      roleRelevant,
      roleRelevanceNote,
      locationInTarget: locationMatch.inTarget,
      locationNote: locationMatch.note,
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
      matchSource,
      matchSummary,
      scoredAt,
      scoreError: undefined,
    };

    await updateJob(job.id, updated);
    return updated;
  } catch (error) {
    const scoredAt = new Date().toISOString();
    const message =
      error instanceof Error ? error.message : "Failed to score job";

    const updated: JobPosting = {
      ...job,
      scoredAt,
      scoreError: message,
    };

    await updateJob(job.id, updated);
    return updated;
  }
}
