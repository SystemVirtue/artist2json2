-- Create API users table for API key management
CREATE TABLE public.api_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL UNIQUE,
  api_key_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  rate_limit_requests INTEGER NOT NULL DEFAULT 100,
  rate_limit_window INTEGER NOT NULL DEFAULT 3600, -- seconds
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create API usage tracking table
CREATE TABLE public.api_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_user_id UUID NOT NULL REFERENCES public.api_users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  response_status INTEGER,
  processing_time_ms INTEGER,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date_hour TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT date_trunc('hour', now())
);

-- Create API jobs table for long-running operations
CREATE TABLE public.api_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_user_id UUID NOT NULL REFERENCES public.api_users(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  input_data JSONB,
  result_data JSONB,
  progress_percent INTEGER DEFAULT 0,
  error_message TEXT,
  webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create file storage references table
CREATE TABLE public.api_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_user_id UUID NOT NULL REFERENCES public.api_users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.api_jobs(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes INTEGER,
  content_type TEXT,
  is_temporary BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create artist data cache table
CREATE TABLE public.artist_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_name TEXT NOT NULL,
  musicbrainz_id TEXT,
  video_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days')
);

-- Enable RLS on all tables
ALTER TABLE public.api_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_users
CREATE POLICY "Users can view their own API keys" 
ON public.api_users 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own API keys" 
ON public.api_users 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own API keys" 
ON public.api_users 
FOR UPDATE 
USING (user_id = auth.uid());

-- RLS Policies for api_usage
CREATE POLICY "Users can view their API usage" 
ON public.api_usage 
FOR SELECT 
USING (api_user_id IN (SELECT id FROM public.api_users WHERE user_id = auth.uid()));

-- RLS Policies for api_jobs
CREATE POLICY "Users can view their API jobs" 
ON public.api_jobs 
FOR SELECT 
USING (api_user_id IN (SELECT id FROM public.api_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can create API jobs" 
ON public.api_jobs 
FOR INSERT 
WITH CHECK (api_user_id IN (SELECT id FROM public.api_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their API jobs" 
ON public.api_jobs 
FOR UPDATE 
USING (api_user_id IN (SELECT id FROM public.api_users WHERE user_id = auth.uid()));

-- RLS Policies for api_files
CREATE POLICY "Users can view their API files" 
ON public.api_files 
FOR SELECT 
USING (api_user_id IN (SELECT id FROM public.api_users WHERE user_id = auth.uid()));

-- RLS Policies for artist_cache (public read, no user restrictions for caching)
CREATE POLICY "Anyone can read artist cache" 
ON public.artist_cache 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage artist cache" 
ON public.artist_cache 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_api_users_api_key ON public.api_users(api_key);
CREATE INDEX idx_api_users_user_id ON public.api_users(user_id);
CREATE INDEX idx_api_usage_api_user_id ON public.api_usage(api_user_id);
CREATE INDEX idx_api_usage_date_hour ON public.api_usage(date_hour);
CREATE INDEX idx_api_jobs_api_user_id ON public.api_jobs(api_user_id);
CREATE INDEX idx_api_jobs_status ON public.api_jobs(status);
CREATE INDEX idx_api_files_api_user_id ON public.api_files(api_user_id);
CREATE INDEX idx_artist_cache_name ON public.artist_cache(artist_name);
CREATE INDEX idx_artist_cache_musicbrainz_id ON public.artist_cache(musicbrainz_id);

-- Create functions for API rate limiting
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _api_key TEXT,
  _endpoint TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _api_user RECORD;
  _current_usage INTEGER;
BEGIN
  -- Get API user info
  SELECT * INTO _api_user 
  FROM public.api_users 
  WHERE api_key = _api_key AND is_active = true;
  
  IF _api_user IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check current usage in the window
  SELECT COALESCE(SUM(request_count), 0) INTO _current_usage
  FROM public.api_usage
  WHERE api_user_id = _api_user.id
    AND date_hour >= now() - interval '1 hour' * (_api_user.rate_limit_window / 3600.0);
  
  -- Update last used
  UPDATE public.api_users 
  SET last_used_at = now() 
  WHERE id = _api_user.id;
  
  RETURN _current_usage < _api_user.rate_limit_requests;
END;
$$;

-- Create function to log API usage
CREATE OR REPLACE FUNCTION public.log_api_usage(
  _api_key TEXT,
  _endpoint TEXT,
  _method TEXT,
  _status INTEGER DEFAULT NULL,
  _processing_time_ms INTEGER DEFAULT NULL,
  _request_size_bytes INTEGER DEFAULT NULL,
  _response_size_bytes INTEGER DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _api_user_id UUID;
BEGIN
  -- Get API user ID
  SELECT id INTO _api_user_id 
  FROM public.api_users 
  WHERE api_key = _api_key;
  
  IF _api_user_id IS NOT NULL THEN
    INSERT INTO public.api_usage (
      api_user_id, endpoint, method, response_status, 
      processing_time_ms, request_size_bytes, response_size_bytes
    ) VALUES (
      _api_user_id, _endpoint, _method, _status,
      _processing_time_ms, _request_size_bytes, _response_size_bytes
    );
  END IF;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_api_users_updated_at
  BEFORE UPDATE ON public.api_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_api_jobs_updated_at
  BEFORE UPDATE ON public.api_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_artist_cache_updated_at
  BEFORE UPDATE ON public.artist_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();