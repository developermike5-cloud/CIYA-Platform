export interface Course {
  id?: string;
  title: string;
  subtitle?: string;
  slug: string;
  thumbnail?: string;
  description?: string;
  category?: string;
  youtube_link?: string;
  level?: 'Beginner' | 'Advanced' | 'Masterclass';
  price?: number;
  modules?: string; // stringified JSON for modules
  publish_status: 'Draft' | 'Published' | 'Archived';
  createdAt?: string; // ISO String
  updatedAt?: string; // ISO String
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
