-- FFPoints System Migration
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- Tasks created by admin
CREATE TABLE IF NOT EXISTS public.ff_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    points INTEGER NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Records of task completion requests from users
CREATE TABLE IF NOT EXISTS public.ff_task_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.ff_tasks(id) ON DELETE CASCADE,
    task_title TEXT,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rewards/items available for redemption
CREATE TABLE IF NOT EXISTS public.ff_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    points_cost INTEGER NOT NULL DEFAULT 100,
    category TEXT NOT NULL DEFAULT 'Outro',
    stock INTEGER NOT NULL DEFAULT -1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    image_url TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Records of reward redemption requests from users
CREATE TABLE IF NOT EXISTS public.ff_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reward_id UUID REFERENCES public.ff_rewards(id) ON DELETE CASCADE,
    reward_title TEXT,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name TEXT,
    points_cost INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.ff_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ff_task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ff_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ff_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: allow all authenticated users to read
CREATE POLICY "Allow authenticated read" ON public.ff_tasks FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Allow authenticated read" ON public.ff_task_completions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Allow authenticated read" ON public.ff_rewards FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Allow authenticated read" ON public.ff_redemptions FOR SELECT TO authenticated USING (TRUE);

-- RLS Policies: allow all authenticated users to insert
CREATE POLICY "Allow authenticated insert" ON public.ff_tasks FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Allow authenticated insert" ON public.ff_task_completions FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Allow authenticated insert" ON public.ff_rewards FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Allow authenticated insert" ON public.ff_redemptions FOR INSERT TO authenticated WITH CHECK (TRUE);

-- RLS Policies: allow all authenticated users to update
CREATE POLICY "Allow authenticated update" ON public.ff_tasks FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Allow authenticated update" ON public.ff_task_completions FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Allow authenticated update" ON public.ff_rewards FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Allow authenticated update" ON public.ff_redemptions FOR UPDATE TO authenticated USING (TRUE);

-- RLS Policies: allow all authenticated users to delete (admins only in practice via app logic)
CREATE POLICY "Allow authenticated delete" ON public.ff_tasks FOR DELETE TO authenticated USING (TRUE);
CREATE POLICY "Allow authenticated delete" ON public.ff_rewards FOR DELETE TO authenticated USING (TRUE);
