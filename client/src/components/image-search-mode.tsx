import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Clipboard, ArrowLeft, Loader2, Image as ImageIcon, Eye } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { AIProgressTracker } from "@/components/ai-progress-tracker";
import { LlamaAnalysisNew } from "@/components/llama-analysis-new";
import { IndividualResponses } from "@/components/individual-responses";
import { SourcesModal } from "@/components/sources-modal";

interface ImageSearchModeProps {
  onBack: () => void;
}

interface AnalysisResult {
  promptId: number;
  responses: Record<string, {
    content: string;
    responseTime: number;
    tokens?: number;
    error?: string;
  }>;
  llamaAnalysis?: {
    content: string;
    responseTime: number;
    tokens?: number;
    error?: string;
  };
  imageExtraction?: {
    content: string;
    responseTime: number;
  };
}

enum AnalysisStage {
  INPUT = 'input',
  PROCESSING = 'processing',
  RESULTS = 'results'
}

export function ImageSearchMode({ onBack }: ImageSearchModeProps) {
  const { translations } = useLanguage();
  const [prompt, setPrompt] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState<AnalysisStage>(AnalysisStage.INPUT);
  const [progressResponses, setProgressResponses] = useState<Record<string, any>>({});
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleImageSelect(file);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type);
            const file = new File([blob], 'pasted-image.png', { type });
            handleImageSelect(file);
            return;
          }
        }
      }
      
      // Se não houver imagem na clipboard, tenta texto
      const text = await navigator.clipboard.readText();
      if (text) {
        setPrompt(prev => prev + (prev ? '\n' : '') + text);
      }
    } catch (error) {
      console.error('Erro ao acessar clipboard:', error);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage || prompt.trim().length < 5) return;

    setIsLoading(true);
    setCurrentStage(AnalysisStage.PROCESSING);
    setProgressResponses({});
    setAnalysisResult(null);

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Image = e.target?.result as string;
        const base64Data = base64Image.split(',')[1]; // Remove data:image/...;base64, prefix
        
        try {
          console.log('🖼️ Iniciando análise avançada de imagem...');
          console.log('📝 Prompt:', prompt);
          console.log('🔍 Tamanho da imagem (KB):', Math.round((selectedImage?.size || 0) / 1024));

          const response = await fetch('/api/analyze-image-advanced', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              prompt: prompt.trim(),
              image: base64Data,
              selectedAI: 'gemini',
              aiWeights: { groq: 0.4, openrouter: 0.3, google: 0.2, cohere: 0.1 }
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro HTTP:', response.status, errorText);
            throw new Error(`Erro HTTP: ${response.status}`);
          }

          const data = await response.json();
          console.log('✅ Análise avançada concluída:', data);
          
          if (data.success) {
            setAnalysisResult({
              promptId: data.promptId,
              responses: data.responses,
              llamaAnalysis: data.llamaAnalysis,
              imageExtraction: data.imageExtraction
            });
            setCurrentStage(AnalysisStage.RESULTS);
            console.log('🎉 Análise completa concluída com sucesso');
          } else {
            console.error('❌ Erro na resposta:', data.message || 'Erro desconhecido');
            setCurrentStage(AnalysisStage.INPUT);
          }
        } catch (error) {
          console.error('❌ Erro na análise:', error);
          setCurrentStage(AnalysisStage.INPUT);
        } finally {
          setIsLoading(false);
        }
      };
      
      reader.readAsDataURL(selectedImage);
    } catch (error) {
      console.error('❌ Erro ao processar imagem:', error);
      setIsLoading(false);
      setCurrentStage(AnalysisStage.INPUT);
    }
  };

  const handleNewAnalysis = () => {
    setCurrentStage(AnalysisStage.INPUT);
    setAnalysisResult(null);
    setProgressResponses({});
    setPrompt("");
    setSelectedImage(null);
    setImagePreview(null);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{translations.imageSearch}</h1>
            <p className="text-muted-foreground">{translations.imageSearchDescription}</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          <span className="text-lg mr-2">🤖</span>
          Múltiplas IAs
        </Badge>
      </div>

      {/* Image Upload Section */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ImageIcon className="mr-2 h-5 w-5" />
            {translations.attachImage}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!imagePreview ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">
                  Selecione uma imagem para análise
                </p>
                <div className="flex justify-center space-x-4">
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {translations.fromDevice}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handlePasteFromClipboard}
                  >
                    <Clipboard className="mr-2 h-4 w-4" />
                    {translations.fromClipboard}
                  </Button>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-full h-auto max-h-64 rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                >
                  ×
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Imagem: {selectedImage?.name} ({Math.round((selectedImage?.size || 0) / 1024)}KB)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prompt Section */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>{translations.typePrompt}</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Descreva o que você gostaria de saber sobre esta imagem..."
            className="min-h-[100px] resize-none"
            disabled={isLoading}
          />
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              <span className={prompt.length < 5 ? "text-orange-500" : "text-green-500"}>
                {prompt.length}/5 {translations.minCharacters}
              </span>
              {!selectedImage && (
                <div className="text-orange-500 mt-1">
                  Selecione uma imagem para continuar
                </div>
              )}
            </div>
            <Button 
              onClick={handleAnalyze}
              disabled={!selectedImage || prompt.trim().length < 5 || isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {translations.processing}...
                </>
              ) : (
                <>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  {translations.analyzeButton}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Processing Stage */}
      {currentStage === AnalysisStage.PROCESSING && (
        <div className="space-y-6">
          <AIProgressTracker
            isAnalyzing={isLoading}
            responses={progressResponses}
            onComplete={() => {}}
          />
        </div>
      )}

      {/* Results Stage */}
      {currentStage === AnalysisStage.RESULTS && analysisResult && (
        <div className="space-y-6">
          {/* Synthesis Analysis */}
          <LlamaAnalysisNew
            analysisData={analysisResult}
            onShowSources={() => setShowSourcesModal(true)}
          />

          {/* Individual AI Responses */}
          <IndividualResponses responses={analysisResult.responses} />

          {/* Image Extraction Details */}
          {analysisResult.imageExtraction && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ImageIcon className="mr-2 h-5 w-5 text-primary" />
                  Extração da Imagem
                  <Badge variant="secondary" className="ml-2">
                    {analysisResult.imageExtraction.responseTime}ms
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {analysisResult.imageExtraction.content}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* New Analysis Button */}
          <div className="flex justify-center pt-4">
            <Button onClick={handleNewAnalysis} variant="outline" size="lg">
              <ImageIcon className="mr-2 h-4 w-4" />
              {translations.newAnalysis}
            </Button>
          </div>
        </div>
      )}

      {/* Sources Modal */}
      <SourcesModal
        isOpen={showSourcesModal}
        onClose={() => setShowSourcesModal(false)}
        responses={analysisResult?.responses || {}}
      />
    </div>
  );
}