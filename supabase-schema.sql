-- ==========================================
-- CIYA ACADEMY SUPABASE DATABASE SCHEMA
-- ==========================================
-- This script creates all necessary tables, indexes, 
-- and Row Level Security (RLS) policies to map Firestore
-- collections perfectly into Supabase.
-- Run this in your Supabase SQL Editor.

-- Enable UUID generation extension if not present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. SETTINGS TABLE (Stores App Settings, system signals, etc.)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY, -- 'app', 'system_signals', etc.
    data JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to settings
CREATE POLICY "Allow public read access to settings" ON public.settings
    FOR SELECT USING (true);

-- Allow authenticated admins to write to settings
-- (We will check if the user is listed in our admins table)
CREATE POLICY "Allow admin write access to settings" ON public.settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE public.admins.email = auth.jwt()->>'email'
        )
    );

-- ==========================================
-- 2. ADMINS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.admins (
    id TEXT PRIMARY KEY, -- Auth user UUID or email-based ID
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'admin',
    permissions TEXT[] DEFAULT '{}'::text[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for admins
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Allow admins to read the admins list
CREATE POLICY "Allow admins to read the admins table" ON public.admins
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admins a 
            WHERE a.email = auth.jwt()->>'email'
        )
        OR email = auth.jwt()->>'email' -- Allow self read
    );

-- Allow superadmins to modify the admins table
CREATE POLICY "Allow superadmins to modify the admins table" ON public.admins
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admins a 
            WHERE a.email = auth.jwt()->>'email' AND a.role = 'superadmin'
        )
    );

-- ==========================================
-- 3. USERS (Profiles) TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY, -- Matches auth.users.id
    email TEXT UNIQUE NOT NULL,
    intent TEXT,
    experience TEXT,
    course_type TEXT,
    pathway_selection TEXT,
    pathway_reason TEXT,
    pathway_experience TEXT,
    recommended_path TEXT,
    goal TEXT,
    availability TEXT,
    full_name TEXT,
    gender TEXT,
    age_range TEXT,
    learning_tool TEXT,
    education_level TEXT,
    whatsapp TEXT,
    state TEXT,
    referral_code TEXT,
    my_referral_code TEXT,
    is_activated BOOLEAN DEFAULT FALSE,
    referrals_count INTEGER DEFAULT 0,
    approval_status TEXT DEFAULT 'Pending',
    is_dashboard_unlocked BOOLEAN DEFAULT FALSE,
    admin_code TEXT,
    cohort TEXT DEFAULT 'Cohort 1',
    progress JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read and write their own profile
CREATE POLICY "Allow users to read their own profile" ON public.users
    FOR SELECT USING (auth.uid()::text = id OR auth.jwt()->>'email' = email);

CREATE POLICY "Allow users to update their own profile" ON public.users
    FOR UPDATE USING (auth.uid()::text = id OR auth.jwt()->>'email' = email);

CREATE POLICY "Allow users to insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid()::text = id OR auth.jwt()->>'email' = email);

-- Admins can read and manage all profiles
CREATE POLICY "Allow admins full access to profiles" ON public.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE public.admins.email = auth.jwt()->>'email'
        )
    );

-- ==========================================
-- 4. COURSES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.courses (
    id TEXT PRIMARY KEY, -- courseId
    title TEXT NOT NULL,
    subtitle TEXT,
    tagline TEXT,
    slug TEXT,
    thumbnail TEXT,
    description TEXT,
    overview TEXT,
    category TEXT,
    skill TEXT,
    subskill TEXT,
    skill_path TEXT,
    duration_mode TEXT,
    youtube_link TEXT,
    level TEXT,
    tier TEXT,
    price NUMERIC DEFAULT 0,
    instructor TEXT,
    outcomes TEXT,
    requirements TEXT,
    publish_status TEXT DEFAULT 'Draft',
    status TEXT DEFAULT 'draft',
    is_locked BOOLEAN DEFAULT FALSE,
    days JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Anyone can view published courses
CREATE POLICY "Allow public read access to published courses" ON public.courses
    FOR SELECT USING (publish_status = 'Published' OR status = 'published' OR EXISTS (
        SELECT 1 FROM public.admins 
        WHERE public.admins.email = auth.jwt()->>'email'
    ));

-- Admins have full access to courses
CREATE POLICY "Allow admins full access to courses" ON public.courses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE public.admins.email = auth.jwt()->>'email'
        )
    );

-- ==========================================
-- 5. KYCB QUESTIONNAIRES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.kycb_questionnaires (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    client_name TEXT NOT NULL,
    date_completed TEXT,
    type TEXT NOT NULL,
    business_name TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    user_id TEXT,
    user_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for kycb_questionnaires
ALTER TABLE public.kycb_questionnaires ENABLE ROW LEVEL SECURITY;

-- Students can read/write their own questionnaires
CREATE POLICY "Allow students access to their own questionnaires" ON public.kycb_questionnaires
    FOR ALL USING (auth.jwt()->>'email' = user_email);

-- Admins can view/manage all questionnaires
CREATE POLICY "Allow admins access to all questionnaires" ON public.kycb_questionnaires
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE public.admins.email = auth.jwt()->>'email'
        )
    );

-- ==========================================
-- 6. SAVED PROMPTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.saved_prompts (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL,
    user_email TEXT,
    industry TEXT,
    prompt_text TEXT NOT NULL,
    website_type TEXT NOT NULL,
    business_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for saved_prompts
ALTER TABLE public.saved_prompts ENABLE ROW LEVEL SECURITY;

-- Students can view/save their own prompts
CREATE POLICY "Allow students access to their own prompts" ON public.saved_prompts
    FOR ALL USING (auth.jwt()->>'email' = user_email OR auth.uid()::text = user_id);

-- Admins can view all saved prompts
CREATE POLICY "Allow admins access to all prompts" ON public.saved_prompts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE public.admins.email = auth.jwt()->>'email'
        )
    );

-- ==========================================
-- 7. ASSIGNMENT SUBMISSIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.assignments (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    user_name TEXT,
    course_id TEXT NOT NULL,
    day_index INTEGER NOT NULL,
    submitted_text TEXT,
    file_url TEXT,
    file_name TEXT,
    status TEXT DEFAULT 'Pending',
    admin_reason TEXT,
    graded_by TEXT,
    graded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for assignments
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Students can view and write their own submissions
CREATE POLICY "Allow students access to their own assignments" ON public.assignments
    FOR ALL USING (auth.jwt()->>'email' = user_email OR auth.uid()::text = user_id);

-- Admins can view and grade all submissions
CREATE POLICY "Allow admins full access to assignments" ON public.assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE public.admins.email = auth.jwt()->>'email'
        )
    );

-- ==========================================
-- 8. NOTIFICATIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL,
    user_email TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    triggered_by TEXT,
    trigger_type TEXT DEFAULT 'manual'
);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Students can view and update their own notifications (e.g. mark as read)
CREATE POLICY "Allow students access to their notifications" ON public.notifications
    FOR ALL USING (auth.uid()::text = user_id OR auth.jwt()->>'email' = user_email);

-- Admins can send notifications
CREATE POLICY "Allow admins to manage notifications" ON public.notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE public.admins.email = auth.jwt()->>'email'
        )
    );

-- ==========================================
-- 9. NOTIFICATION TEMPLATES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    trigger_type TEXT,
    event_type TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for notification_templates
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage notification templates
CREATE POLICY "Allow admins to access templates" ON public.notification_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE public.admins.email = auth.jwt()->>'email'
        )
    );

-- ==========================================
-- 10. BLOG TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.blog (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    author TEXT,
    published_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for blog
ALTER TABLE public.blog ENABLE ROW LEVEL SECURITY;

-- Public can read blog posts
CREATE POLICY "Allow public read access to blog" ON public.blog
    FOR SELECT USING (true);

-- Admins can manage blog posts
CREATE POLICY "Allow admins full access to blog" ON public.blog
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE public.admins.email = auth.jwt()->>'email'
        )
    );

-- ==========================================
-- AUTOMATIC TIMESTAMPS FOR UPDATE FUNCTIONS
-- ==========================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to necessary tables
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_courses_modtime BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_settings_modtime BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_blog_modtime BEFORE UPDATE ON public.blog FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ==========================================
-- INDEXES FOR FAST QUERY EXECUTION
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_assignments_user_email ON public.assignments(user_email);
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON public.assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_prompts_user_id ON public.saved_prompts(user_id);
