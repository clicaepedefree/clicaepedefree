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

const MAX_SIZE_BYTES = 299 * 1024; // 299KB

/**
 * Compresses an image aggressively using canvas.
 * Iteratively reduces JPEG quality and dimensions until ≤ 299KB.
 */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const tryWithMaxDim = (currentMaxDim: number) => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > currentMaxDim || height > currentMaxDim) {
          if (width > height) {
            height = Math.round((height * currentMaxDim) / width);
            width = currentMaxDim;
          } else {
            width = Math.round((width * currentMaxDim) / height);
            height = currentMaxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported'));
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.75;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error('Compression failed'));
              if (blob.size <= MAX_SIZE_BYTES) {
                resolve(blob);
              } else if (quality > 0.15) {
                quality -= 0.05;
                tryCompress();
              } else if (currentMaxDim > 400) {
                tryWithMaxDim(Math.round(currentMaxDim * 0.7));
              } else {
                resolve(blob); // best effort
              }
            },
            'image/jpeg',
            quality
          );
        };
        tryCompress();
      };

      tryWithMaxDim(1200);
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

      // Always compress to ensure ≤ 299KB
      console.log(`Compressing image from ${(file.size / 1024).toFixed(0)}KB...`);
      const uploadBlob = await compressImage(file);
      console.log(`Compressed to ${(uploadBlob.size / 1024).toFixed(0)}KB`);

      const fileName = `${user.id}/${type}_${Date.now()}.jpg`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('restaurant-images')
        .upload(fileName, uploadBlob, {
          cacheControl: '31536000',
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
        Imagens são comprimidas automaticamente (máx. 299KB).
      </p>
    </div>
  );
}
