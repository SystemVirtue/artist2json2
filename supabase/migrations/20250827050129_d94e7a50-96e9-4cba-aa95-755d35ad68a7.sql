-- Create tables for data persistence and API management

-- API configurations table
CREATE TABLE public.api_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    user_agent TEXT NOT NULL DEFAULT 'MusicVideoCollector/1.0',
    theaudiodb_key TEXT NOT NULL,
    youtube_api_key TEXT,
    spotify_access_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Artist data and music videos storage
CREATE TABLE public.artist_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    musicbrainz_id TEXT,
    spotify_url TEXT,
    data JSONB NOT NULL DEFAULT '{}',
    music_videos JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- JSON processing jobs and results
CREATE TABLE public.json_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    job_type TEXT NOT NULL, -- 'combine', 'convert', 'validate', 'modify', 'postprocess', 'deduplicate'
    input_data JSONB NOT NULL,
    output_data JSONB,
    parameters JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Playlist parsing results
CREATE TABLE public.playlist_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    playlist_url TEXT NOT NULL,
    playlist_name TEXT,
    source TEXT NOT NULL, -- 'youtube', 'spotify', 'apple'
    tracks JSONB NOT NULL DEFAULT '[]',
    artists JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.json_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own API configs"
ON public.api_configs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own artist data"
ON public.artist_data
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own JSON jobs"
ON public.json_jobs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own playlist data"
ON public.playlist_data
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_artist_data_user_id ON public.artist_data(user_id);
CREATE INDEX idx_artist_data_musicbrainz_id ON public.artist_data(musicbrainz_id);
CREATE INDEX idx_json_jobs_user_id_status ON public.json_jobs(user_id, status);
CREATE INDEX idx_playlist_data_user_id ON public.playlist_data(user_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_api_configs_updated_at
    BEFORE UPDATE ON public.api_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_artist_data_updated_at
    BEFORE UPDATE ON public.artist_data
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();