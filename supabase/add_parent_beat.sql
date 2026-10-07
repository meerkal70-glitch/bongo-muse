-- Migration: add parent_beat_id to tracks

ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS parent_beat_id UUID REFERENCES public.tracks(id) ON DELETE SET NULL;
