import { useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  currentUrl?: string;
  onImageUploaded: (url: string) => void;
  type: 'logo' | 'banner';
  restaurantId: string;
}

const MAX_SIZE_BYTES = 300 * 1024; // 300KB

/**
 * Compresses an image client-side using canvas.
 * Reduces quality iteratively until under MAX_SIZE_BYTES or minimum quality reached.
 */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      
      // Resize if very large (max 1200px width for products/banners)
      let { width, height } = img;
      const maxDim = 1200;
      if (width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));
      ctx.drawImage(img, 0, 0, width, height);
      
      // Try decreasing quality until under limit
      let quality = 0.8;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Compression failed'));
            if (blob.size <= MAX_SIZE_BYTES || quality <= 0.3) {
              resolve(blob);
            } else {
              quality -= 0.1;
              tryCompress();
            }
          },
          'image/jpeg',
          quality
        );
      };
      tryCompress();
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export function ImageUpload({ currentUrl, onImageUploaded, type, restaurantId }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo de imagem válido.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "O arquivo é muito grande. Tamanho máximo: 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Compress image client-side to max 300KB
      let uploadBlob: Blob | File = file;
      if (file.size > MAX_SIZE_BYTES) {
        console.log(`Compressing image from ${(file.size / 1024).toFixed(0)}KB...`);
        uploadBlob = await compressImage(file);
        console.log(`Compressed to ${(uploadBlob.size / 1024).toFixed(0)}KB`);
      }

      const ext = file.type === 'image/png' && uploadBlob === file ? 'png' : 'jpg';
      const fileName = `${user.id}/${type}_${Date.now()}.${ext}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('restaurant-images')
        .upload(fileName, uploadBlob, {
          cacheControl: '31536000', // 1 year CDN cache
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('restaurant-images')
        .getPublicUrl(uploadData.path);

      onImageUploaded(publicUrl);

      toast({
        title: "Sucesso",
        description: `Imagem carregada (${(uploadBlob.size / 1024).toFixed(0)}KB)`,
      });

    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar a imagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    onImageUploaded('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {currentUrl ? (
          <div className="relative">
            <img
              src={currentUrl}
              alt={type === 'logo' ? 'Logo' : 'Banner'}
              className={type === 'logo' ? 'w-20 h-20 object-cover rounded' : 'w-40 h-20 object-cover rounded'}
              loading="lazy"
            />
            <Button
              size="sm"
              variant="destructive"
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
              onClick={handleRemoveImage}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <div className={`border-2 border-dashed border-border rounded-lg flex items-center justify-center ${
            type === 'logo' ? 'w-20 h-20' : 'w-40 h-20'
          }`}>
            <Upload className="w-6 h-6 text-muted-foreground" />
          </div>
        )}

        <div className="flex-1">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            id={`upload-${type}`}
          />
          <label htmlFor={`upload-${type}`}>
            <Button
              variant="outline"
              disabled={uploading}
              className="cursor-pointer"
              asChild
            >
              <span>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Comprimindo e enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {currentUrl ? 'Alterar' : 'Carregar'} {type === 'logo' ? 'Logo' : 'Banner'}
                  </>
                )}
              </span>
            </Button>
          </label>
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground">
        {type === 'logo' 
          ? 'Recomendado: 200x200px, formato quadrado'
          : 'Recomendado: 1200x300px, formato retangular'
        }
        <br />
        Imagens são comprimidas automaticamente (máx. 300KB).
      </p>
    </div>
  );
}
