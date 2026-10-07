-- Migration: track_comments table

CREATE TABLE IF NOT EXISTS public.track_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.track_comments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Comments are viewable by everyone." 
ON public.track_comments FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own comments." 
ON public.track_comments FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments." 
ON public.track_comments FOR DELETE 
USING (auth.uid() = user_id);

-- Optional: Add a comment count column to tracks to avoid heavy count queries
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- Trigger to increment comment count
CREATE OR REPLACE FUNCTION public.increment_track_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.tracks 
  SET comment_count = comment_count + 1
  WHERE id = NEW.track_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_added ON public.track_comments;
CREATE TRIGGER on_comment_added
AFTER INSERT ON public.track_comments
FOR EACH ROW EXECUTE FUNCTION public.increment_track_comment_count();

-- Trigger to decrement comment count
CREATE OR REPLACE FUNCTION public.decrement_track_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.tracks 
  SET comment_count = GREATEST(comment_count - 1, 0)
  WHERE id = OLD.track_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_deleted ON public.track_comments;
CREATE TRIGGER on_comment_deleted
AFTER DELETE ON public.track_comments
FOR EACH ROW EXECUTE FUNCTION public.decrement_track_comment_count();
