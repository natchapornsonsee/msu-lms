export type WatchedRange = [number, number];

export type Profile = {
  id: string;
  email: string;
  role: "student" | "external" | "admin";
  first_name: string;
  last_name: string;
  student_id?: string | null;
  faculty?: string | null;
  program?: string | null;
  year?: number | null;
  group_name?: string | null;
  must_change_password?: boolean;
};

export type Course = {
  id: string;
  code: string;
  title: string;
  description: string;
  passing_progress: number;
  post_test_url?: string | null;
  quiz_pass_score: number;
  is_published: boolean;
};

export type CoursePart = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order_no: number;
  video_provider: "youtube";
  video_ref: string;
};
