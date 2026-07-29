/** Maps a canonical skill name to alternate spellings found in job postings. */
export const SKILL_SYNONYMS: Record<string, string[]> = {
  javascript: ["js", "ecmascript"],
  typescript: ["ts"],
  kubernetes: ["k8s"],
  node: ["node.js", "nodejs"],
  "node.js": ["node", "nodejs"],
  react: ["react.js", "reactjs"],
  "react native": ["react-native", "reactnative", "rn"],
  vue: ["vue.js", "vuejs"],
  angular: ["angularjs"],
  postgres: ["postgresql", "psql"],
  postgresql: ["postgres", "psql"],
  mongo: ["mongodb"],
  mongodb: ["mongo"],
  aws: ["amazon web services"],
  gcp: ["google cloud", "google cloud platform"],
  azure: ["microsoft azure"],
  csharp: ["c#", "c sharp"],
  "c#": ["csharp", "c sharp"],
  cpp: ["c++"],
  "c++": ["cpp"],
  dotnet: [".net", "asp.net", "asp net"],
  ".net": ["dotnet", "dot net", "asp.net"],
  ml: ["machine learning"],
  "machine learning": ["ml"],
  ai: ["artificial intelligence"],
  "artificial intelligence": ["ai"],
  cicd: ["ci/cd", "ci cd", "continuous integration"],
  "ci/cd": ["cicd", "ci cd"],
  devops: ["dev ops"],
  sql: ["structured query language"],
  nosql: ["no sql", "non-relational"],
  api: ["apis", "rest api", "restful api"],
  rest: ["restful", "rest apis"],
  graphql: ["gql"],
  docker: ["containers", "containerization"],
  terraform: ["iac", "infrastructure as code"],
  kafka: ["apache kafka"],
  redis: ["elasticache"],
  elasticsearch: ["elastic search", "elk"],
  jest: ["unit testing", "javascript testing"],
  pytest: ["python testing"],
  agile: ["scrum", "kanban"],
  scrum: ["agile"],
  linux: ["unix"],
  bash: ["shell scripting", "shell script"],
  powershell: ["ps"],
  "next.js": ["nextjs", "next js"],
  express: ["express.js", "expressjs"],
  spring: ["spring boot", "springboot"],
  "spring boot": ["springboot", "spring"],
  tailwind: ["tailwind css", "tailwindcss"],
  sass: ["scss"],
  scss: ["sass"],
  html: ["html5"],
  css: ["css3"],
  git: ["github", "gitlab", "version control"],
  jira: ["atlassian jira"],
  confluence: ["atlassian confluence"],
  figma: ["ui design"],
  seo: ["search engine optimization"],
  etl: ["extract transform load"],
  snowflake: ["snowflake db"],
  databricks: ["spark"],
  spark: ["apache spark"],
  hadoop: ["hdfs"],
  tableau: ["data visualization"],
  powerbi: ["power bi"],
  "power bi": ["powerbi"],
};

export function normalizeSkillName(skill: string): string {
  return skill.toLowerCase().trim().replace(/\s+/g, " ");
}

/** Returns all lowercase variants used when searching job description text. */
export function getSkillVariants(
  skill: string,
  userSynonyms: Record<string, string[]> = {}
): string[] {
  const normalized = normalizeSkillName(skill);
  const variants = new Set<string>([normalized, skill.toLowerCase().trim()]);

  const mergeSynonyms = (synonyms: string[]) => {
    for (const synonym of synonyms) {
      variants.add(synonym.toLowerCase());
    }
  };

  mergeSynonyms(SKILL_SYNONYMS[normalized] ?? []);
  mergeSynonyms(userSynonyms[normalized] ?? []);

  for (const [canonical, synonyms] of Object.entries(SKILL_SYNONYMS)) {
    if (
      canonical === normalized ||
      synonyms.some((synonym) => normalizeSkillName(synonym) === normalized)
    ) {
      variants.add(canonical);
      mergeSynonyms(synonyms);
    }
  }

  for (const [canonical, synonyms] of Object.entries(userSynonyms)) {
    if (
      canonical === normalized ||
      synonyms.some((synonym) => normalizeSkillName(synonym) === normalized)
    ) {
      variants.add(canonical);
      mergeSynonyms(synonyms);
    }
  }

  return [...variants].filter(Boolean);
}

export function skillsMatch(
  userSkill: string,
  jobSkill: string,
  userSynonyms: Record<string, string[]> = {}
): boolean {
  const userVariants = new Set(getSkillVariants(userSkill, userSynonyms));
  const jobVariants = getSkillVariants(jobSkill, userSynonyms);
  return jobVariants.some((variant) => userVariants.has(variant));
}

/** Common skills scanned in job descriptions to detect gaps. */
export const COMMON_JOB_SKILLS: string[] = [
  "Agile",
  "Angular",
  "AWS",
  "Azure",
  "Bash",
  "C",
  "C#",
  "C++",
  "CI/CD",
  "CSS",
  "Dart",
  "DevOps",
  "Django",
  "Docker",
  "Elasticsearch",
  "Express",
  "FastAPI",
  "Flask",
  "GCP",
  "Git",
  "Go",
  "GraphQL",
  "HTML",
  "Java",
  "JavaScript",
  "Jenkins",
  "Jest",
  "Kafka",
  "Kotlin",
  "Kubernetes",
  "Linux",
  "Machine Learning",
  "MongoDB",
  "MySQL",
  "Next.js",
  "Node.js",
  "PHP",
  "PostgreSQL",
  "Python",
  "R",
  "React",
  "Redis",
  "REST",
  "Ruby",
  "Rust",
  "Sass",
  "Scala",
  "Scrum",
  "Shell",
  "Spark",
  "Spring",
  "SQL",
  "Swift",
  "Tailwind",
  "Terraform",
  "TypeScript",
  "Vue",
  "WebSocket",
  ".NET",
  "Apache Spark",
  "Confluence",
  "Express.js",
  "Figma",
  "GitHub",
  "GitLab",
  "Jira",
  "Next.js",
  "NoSQL",
  "Power BI",
  "Pytest",
  "React Native",
  "SCSS",
  "Snowflake",
  "Spring Boot",
  "Tableau",
  "Tailwind CSS",
];
