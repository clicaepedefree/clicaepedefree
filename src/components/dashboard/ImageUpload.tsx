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

export function ImageUpload({ currentUrl, onImageUploaded, type, restaurantId }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo de imagem válido.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
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
      console.log('Starting image upload process...');
      console.log('File details:', { name: file.name, size: file.size, type: file.type });

      // For now, upload directly without compression to isolate the issue
      const fileName = `${restaurantId}/${type}_${Date.now()}.${file.name.split('.').pop()}`;
      console.log('Upload fileName:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('restaurant-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      console.log('Upload result:', { uploadData, uploadError });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('restaurant-images')
        .getPublicUrl(uploadData.path);

      console.log('Public URL:', publicUrl);

      onImageUploaded(publicUrl);

      toast({
        title: "Sucesso",
        description: "Imagem carregada com sucesso!",
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
                    Carregando...
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
        Máximo 5MB.
      </p>
    </div>
  );
}