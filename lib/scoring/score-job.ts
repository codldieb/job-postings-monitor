import { cleanJobDescription } from "@/lib/jobs/clean-description";
import { fetchJobDetails } from "@/lib/jobs/description";
import {
  evaluateLocationMatch,
  inferJobLocation,
} from "@/lib/jobs/location";
import { evaluateRoleRelevance } from "@/lib/jobs/role-relevance";
import { getResumeProfile, updateJob } from "@/lib/db";
import { scoreJobMatch } from "@/lib/skills/matcher";
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
      matchedSkills: undefined,
      missingSkills: undefined,
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

    if (!descriptionText?.trim()) {
      const details = await fetchJobDetails(job.url);
      descriptionText = details.descriptionText;
      department = department ?? details.department;
      team = team ?? details.team;
      location = location ?? details.location;
    } else {
      descriptionText = cleanJobDescription(descriptionText);
    }

    const jobForMatching: JobPosting = {
      ...job,
      descriptionText,
      department,
      team,
      location,
    };

    const result = scoreJobMatch(
      profile.skills,
      descriptionText,
      await getUserSynonyms(),
      job.title,
      profile.positionExperience ?? []
    );
    const roleRelevance = evaluateRoleRelevance(jobForMatching, profile);
    const locationMatch = evaluateLocationMatch(jobForMatching, profile);
    const resolvedLocation =
      locationMatch.location ?? inferJobLocation(jobForMatching) ?? location;
    const scoredAt = new Date().toISOString();

    const updated: JobPosting = {
      ...jobForMatching,
      location: resolvedLocation,
      descriptionFetchedAt: scoredAt,
      matchScore: result.score,
      matchSkillScore: result.skillScore,
      matchExperienceScore: result.experienceScore,
      experienceNote: result.experienceNote,
      roleRelevant: roleRelevance.relevant,
      roleRelevanceNote: roleRelevance.note,
      locationInTarget: locationMatch.inTarget,
      locationNote: locationMatch.note,
      matchedSkills: result.matchedSkills,
      missingSkills: result.missingSkills,
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
