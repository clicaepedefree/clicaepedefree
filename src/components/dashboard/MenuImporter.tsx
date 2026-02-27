import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Link, Sparkles, Loader2, FileText, Check, AlertTriangle } from "lucide-react";
import { numberToCurrency } from "@/components/ui/currency-input";

interface ExtractedProduct {
  name: string;
  description?: string;
  price: number;
}

interface ExtractedCategory {
  name: string;
  products: ExtractedProduct[];
}

interface ExtractedData {
  categories: ExtractedCategory[];
}

interface MenuImporterProps {
  restaurantId: string;
  onImportComplete: () => void;
  hasExistingData?: boolean;
}

export function MenuImporter({ restaurantId, onImportComplete, hasExistingData = false }: MenuImporterProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"input" | "preview" | "importing">("input");
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [importMode, setImportMode] = useState<"add" | "replace">("add");
  const [url, setUrl] = useState("");
  const [pdfText, setPdfText] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");
  const { toast } = useToast();

  const resetState = () => {
    setStep("input");
    setExtractedData(null);
    setUrl("");
    setPdfText("");
    setPdfFileName("");
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      toast({ variant: "destructive", title: "Arquivo inválido", description: "Envie um arquivo PDF." });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Arquivo muito grande", description: "O PDF deve ter no máximo 10MB." });
      return;
    }

    setPdfFileName(file.name);

    try {
      // Extract actual text from PDF using pdf.js
      const arrayBuffer = await file.arrayBuffer();
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`;
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        fullText += pageText + "\n";
      }

      if (!fullText.trim()) {
        toast({ variant: "destructive", title: "PDF sem texto", description: "Este PDF parece ser apenas imagem. Tente um PDF com texto selecionável." });
        setPdfFileName("");
        return;
      }

      setPdfText(fullText.trim());
    } catch (err) {
      console.error("Error extracting PDF text:", err);
      toast({ variant: "destructive", title: "Erro ao ler PDF", description: "Não foi possível extrair o texto do PDF." });
      setPdfFileName("");
    }
  };

  const handleExtract = async (type: "url" | "pdf") => {
    setLoading(true);
    try {
      const body: any = {
        restaurant_id: restaurantId,
        type,
        mode: "preview",
      };

      if (type === "url") {
        if (!url.trim()) throw new Error("Informe o link do cardápio");
        body.url = url.trim();
      } else {
        if (!pdfText) throw new Error("Selecione um arquivo PDF");
        body.content = pdfText;
      }

      const { data, error } = await supabase.functions.invoke("import-menu", { body });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (!data?.data?.categories?.length) {
        throw new Error("Nenhuma categoria ou produto encontrado. Verifique o conteúdo enviado.");
      }

      setExtractedData(data.data);
      setStep("preview");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao extrair cardápio",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!extractedData) return;
    setStep("importing");
    setLoading(true);

    try {
      // If replacing, delete existing categories and products first
      if (importMode === "replace" && hasExistingData) {
        // Delete products first (FK constraint)
        const { error: prodDelError } = await supabase
          .from("products")
          .delete()
          .eq("restaurant_id", restaurantId);
        if (prodDelError) throw prodDelError;

        const { error: catDelError } = await supabase
          .from("categories")
          .delete()
          .eq("restaurant_id", restaurantId);
        if (catDelError) throw catDelError;
      }

      const body: any = {
        restaurant_id: restaurantId,
        type: url ? "url" : "pdf",
        mode: "import",
      };
      if (url) body.url = url;
      else body.content = pdfText;

      const { data, error } = await supabase.functions.invoke("import-menu", { body });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Cardápio importado com sucesso! 🎉",
        description: `${data.categoriesCreated} categorias e ${data.productsCreated} produtos criados.`,
      });

      setOpen(false);
      resetState();
      onImportComplete();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao importar",
        description: error.message,
      });
      setStep("preview");
    } finally {
      setLoading(false);
    }
  };

  const totalProducts = extractedData?.categories.reduce(
    (sum, cat) => sum + cat.products.length, 0
  ) || 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Importar Cardápio com IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Importar Cardápio com Inteligência Artificial
          </DialogTitle>
          <DialogDescription>
            Envie um PDF ou cole o link de outro cardápio digital. A IA vai extrair categorias e produtos automaticamente.
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <Tabs defaultValue="url" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url" className="gap-2">
                <Link className="h-4 w-4" />
                Link do Cardápio
              </TabsTrigger>
              <TabsTrigger value="pdf" className="gap-2">
                <FileText className="h-4 w-4" />
                Arquivo PDF
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Link do cardápio digital</Label>
                <Input
                  placeholder="https://exemplo.com/cardapio"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  type="url"
                />
                <p className="text-xs text-muted-foreground">
                  Cole o link de qualquer cardápio digital online
                </p>
              </div>
              <Button
                className="w-full gap-2"
                onClick={() => handleExtract("url")}
                disabled={loading || !url.trim()}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? "Analisando cardápio..." : "Extrair com IA"}
              </Button>
            </TabsContent>

            <TabsContent value="pdf" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Arquivo PDF do cardápio</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label htmlFor="pdf-upload" className="cursor-pointer">
                    {pdfFileName ? (
                      <div className="flex items-center justify-center gap-2 text-primary">
                        <FileText className="h-6 w-6" />
                        <span className="font-medium">{pdfFileName}</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Clique para selecionar ou arraste o PDF aqui
                        </p>
                        <p className="text-xs text-muted-foreground">Máximo 10MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
              <Button
                className="w-full gap-2"
                onClick={() => handleExtract("pdf")}
                disabled={loading || !pdfText}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? "Analisando PDF..." : "Extrair com IA"}
              </Button>
            </TabsContent>
          </Tabs>
        )}

        {step === "preview" && extractedData && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <Check className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">
                  {extractedData.categories.length} categorias e {totalProducts} produtos encontrados
                </p>
                <p className="text-sm text-green-600">Revise abaixo antes de importar</p>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
              {extractedData.categories.map((cat, i) => (
                <Card key={i}>
                  <CardContent className="p-3">
                    <h4 className="font-semibold text-sm mb-2">{cat.name}</h4>
                    <div className="space-y-1">
                      {cat.products.map((prod, j) => (
                        <div key={j} className="flex justify-between text-sm">
                          <div className="flex-1 min-w-0">
                            <span className="text-foreground">{prod.name}</span>
                            {prod.description && (
                              <span className="text-muted-foreground ml-1 text-xs">– {prod.description}</span>
                            )}
                          </div>
                          <Badge variant="secondary" className="ml-2 shrink-0">
                            R$ {numberToCurrency(prod.price)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {hasExistingData && (
              <div className="space-y-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">
                    Você já tem categorias e produtos cadastrados
                  </span>
                </div>
                <RadioGroup value={importMode} onValueChange={(v) => setImportMode(v as "add" | "replace")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="add" id="add" />
                    <Label htmlFor="add" className="text-sm">Adicionar aos existentes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="replace" id="replace" />
                    <Label htmlFor="replace" className="text-sm text-red-600">Substituir tudo (apaga categorias e produtos atuais)</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={resetState} className="flex-1">
                Voltar
              </Button>
              <Button onClick={handleImport} className="flex-1 gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Importar {totalProducts} produtos
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-lg font-medium">Importando cardápio...</p>
            <p className="text-sm text-muted-foreground">Criando categorias e produtos no sistema</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
