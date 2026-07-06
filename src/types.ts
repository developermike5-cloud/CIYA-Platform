export interface Course {
  id?: string;
  title: string;
  subtitle?: string; // used for tagline / subtitle
  tagline?: string;   // guide property
  slug?: string;
  thumbnail?: string;
  description?: string; // used for overview
  overview?: string;    // guide property
  category?: string;
  skill?: string;       // "web" | "film" | "image"
  subskill?: string;
  skillPath?: string;   // "landing" | "ecommerce" | "portfolio" etc.
  durationMode?: 'standard' | 'express'; // "standard" | "express"
  youtube_link?: string;
  level?: 'Beginner' | 'Advanced' | 'Masterclass';
  tier?: 'beginner' | 'advanced' | 'masterclass';  // guide property
  price?: number;
  instructor?: string;
  outcomes?: string;
  requirements?: string;
  publish_status: 'Draft' | 'Published' | 'Archived';
  status?: 'draft' | 'published'; // guide property
  isCloned?: boolean;
  clonedFromId?: string;
  isLocked?: boolean; // locking system
  createdAt?: any;
  updatedAt?: any;
  days?: CourseDay[];
}

export interface CourseDay {
  dayNumber: number; // 1 to 5
  title: string;
  description?: string;
  videos: CourseVideo[];
  assignment?: {
    prompt: string;
    dueNote: string;
  };
}

export interface CourseVideo {
  id: string; // unique identifier
  title: string;
  video_url: string; // compatibility
  url?: string;       // guide property
  duration?: string;
  description?: string;
  resources?: string;
  checkType?: 'none' | 'mcq' | 'tf' | 'fact';
  check?: any; // MCQ, TF, or Fact object
  funFact?: { headline: string; body: string } | null;
}

export interface Module {
  title: string;
  lessons: Lesson[];
  quizzes: Quiz[];
  resources: Resource[];
}

export interface Lesson {
  title: string;
  video_url?: string;
  content?: string;
}

export interface Quiz {
  question: string;
  options: string[];
  correct_index: number;
}

export interface Resource {
  title: string;
  url: string;
}
