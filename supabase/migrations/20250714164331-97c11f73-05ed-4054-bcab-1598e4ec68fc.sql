-- Add banner_url field to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN banner_url TEXT;

-- Create storage bucket for restaurant images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('restaurant-images', 'restaurant-images', true);

-- Create storage policies for restaurant images
CREATE POLICY "Restaurant owners can upload their images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'restaurant-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Restaurant owners can update their images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'restaurant-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Restaurant owners can delete their images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'restaurant-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public can view restaurant images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'restaurant-images');