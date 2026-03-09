// Default CMS data for seeding new organisations.
// Inserted only when tables are empty (idempotent).

export const DEFAULT_LEVELS = [
  { name: "Junior", order_index: 0, description: "0-2 years experience" },
  { name: "Mid-Level", order_index: 1, description: "2-5 years experience" },
  { name: "Senior", order_index: 2, description: "5-8 years experience" },
  { name: "Lead", order_index: 3, description: "8+ years experience" },
  { name: "Executive", order_index: 4, description: "C-suite and VP roles" },
];

export const DEFAULT_INDUSTRIES = [
  { name: "Technology" },
  { name: "Finance" },
  { name: "Healthcare" },
  { name: "Retail" },
  { name: "Manufacturing" },
  { name: "Professional Services" },
];

export const DEFAULT_STAGE_TEMPLATES = [
  {
    name: "HR Screen",
    type: "screening",
    duration_minutes: 30,
    focus_areas: ["Motivation", "Culture Fit"],
    suggested_questions: [
      "What attracted you to this role?",
      "Tell me about your career goals for the next 2-3 years.",
      "What kind of work environment do you thrive in?",
    ],
  },
  {
    name: "Technical Interview",
    type: "technical",
    duration_minutes: 60,
    focus_areas: ["Core Skills", "Problem Solving"],
    suggested_questions: [
      "Walk me through a technically challenging project you led.",
      "How do you approach debugging a complex issue?",
      "Describe your experience with [relevant technology].",
      "How do you ensure code quality in your work?",
    ],
  },
  {
    name: "Reference Check",
    type: "reference",
    duration_minutes: 30,
    focus_areas: ["Performance Verification", "Work Style"],
    suggested_questions: [
      "How would you describe their work ethic?",
      "What were their key strengths in this role?",
      "Were there areas where they could improve?",
    ],
  },
];

export const DEFAULT_QUESTIONS = [
  // Behavioral
  {
    question:
      "Tell me about a time you had to deal with a difficult colleague.",
    purpose: "Assess conflict resolution skills",
    look_for: ["Self-awareness", "Constructive approach", "Resolution focus"],
    category: "Behavioral",
    stage_type: "behavioral",
  },
  {
    question:
      "Describe a situation where you had to adapt to a major change at work.",
    purpose: "Assess adaptability and resilience",
    look_for: ["Flexibility", "Positive attitude", "Proactive response"],
    category: "Behavioral",
    stage_type: "behavioral",
  },
  {
    question: "Give an example of a time you went above and beyond.",
    purpose: "Assess initiative and work ethic",
    look_for: ["Self-motivation", "Impact awareness", "Team orientation"],
    category: "Behavioral",
    stage_type: "behavioral",
  },
  {
    question: "Tell me about a project that failed. What did you learn?",
    purpose: "Assess learning from failure",
    look_for: ["Accountability", "Growth mindset", "Concrete lessons"],
    category: "Behavioral",
    stage_type: "behavioral",
  },
  // Technical
  {
    question: "How do you stay current with technology trends?",
    purpose: "Assess continuous learning",
    look_for: [
      "Specific resources",
      "Applied learning",
      "Community involvement",
    ],
    category: "Technical",
    stage_type: "technical",
  },
  {
    question:
      "Describe your approach to system design for a new feature.",
    purpose: "Assess architectural thinking",
    look_for: [
      "Requirements analysis",
      "Trade-off consideration",
      "Scalability awareness",
    ],
    category: "Technical",
    stage_type: "technical",
  },
  {
    question: "How do you handle technical debt?",
    purpose: "Assess pragmatism and quality balance",
    look_for: [
      "Prioritisation",
      "Communication",
      "Incremental improvement",
    ],
    category: "Technical",
    stage_type: "technical",
  },
  {
    question:
      "Walk me through how you would debug a production issue.",
    purpose: "Assess systematic problem solving",
    look_for: [
      "Methodical approach",
      "Tool usage",
      "Communication during incidents",
    ],
    category: "Technical",
    stage_type: "technical",
  },
  // Motivation
  {
    question: "What motivates you in your work?",
    purpose: "Assess intrinsic motivation and culture fit",
    look_for: ["Alignment with role", "Genuine enthusiasm", "Self-awareness"],
    category: "Motivation",
    stage_type: "screening",
  },
  {
    question: "Where do you see yourself in 3-5 years?",
    purpose: "Assess career planning and ambition",
    look_for: [
      "Realistic goals",
      "Growth mindset",
      "Alignment with company",
    ],
    category: "Motivation",
    stage_type: "screening",
  },
  {
    question: "Why are you looking to leave your current role?",
    purpose: "Assess motivation for change",
    look_for: ["Positive framing", "Growth-oriented", "No red flags"],
    category: "Motivation",
    stage_type: "screening",
  },
  // Culture
  {
    question:
      "How would your colleagues describe your working style?",
    purpose: "Assess self-awareness and team dynamics",
    look_for: [
      "Honest self-reflection",
      "Team awareness",
      "Consistency",
    ],
    category: "Culture",
    stage_type: "behavioral",
  },
  {
    question: "What does a great manager look like to you?",
    purpose: "Assess management style preferences",
    look_for: [
      "Clear expectations",
      "Reasonable needs",
      "Growth orientation",
    ],
    category: "Culture",
    stage_type: "screening",
  },
  {
    question:
      "Tell me about a team you really enjoyed working with. What made it great?",
    purpose: "Assess team culture preferences",
    look_for: ["Collaboration", "Communication", "Shared values"],
    category: "Culture",
    stage_type: "behavioral",
  },
  {
    question:
      "How do you handle feedback, both giving and receiving?",
    purpose: "Assess feedback culture readiness",
    look_for: ["Openness", "Constructive approach", "Growth examples"],
    category: "Culture",
    stage_type: "behavioral",
  },
];
