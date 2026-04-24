export interface Profile {
  id: string;
  full_name: string;
  headline: string;
  location: string;
  remote_only: boolean;
  salary_min: number;
  salary_max: number;
  roles: string[];
  skills: string[];
  created_at: string;
}

export interface CV {
  id: string;
  user_id: string;
  label: string;
  content: CVContent;
  pdf_url: string | null;
  is_master: boolean;
  created_at: string;
}

export interface CVContent {
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications: string[];
}

export interface Experience {
  title: string;
  company: string;
  location: string;
  start_date: string;
  end_date: string | null;
  bullets: string[];
}

export interface Education {
  degree: string;
  school: string;
  year: string;
}

export interface Job {
  id: string;
  source: string;
  external_id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salary_min: number | null;
  salary_max: number | null;
  description: string;
  url: string;
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  discovered_at: string;
}

export type ApplicationStatus =
  | "applied"
  | "viewed"
  | "screening"
  | "interview"
  | "offer"
  | "rejected";

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  cv_id: string;
  status: ApplicationStatus;
  applied_at: string;
  notes: string | null;
  auto_applied: boolean;
  job?: Job;
}

export interface MatchResult {
  score: number;
  matched_skills: string[];
  missing_skills: string[];
  reason: string;
}

export interface MetricData {
  label: string;
  value: string;
  sub: string;
}

export interface PipelineStage {
  label: string;
  count: number;
  max: number;
  color: string;
}
