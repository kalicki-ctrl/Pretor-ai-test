import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Copy, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { SourcesModal } from "./sources-modal";

interface IndividualResponsesProps {
  responses: Record<string, {
    content: string;
    responseTime: number;
    tokens?: number;
    error?: string;
    sources?: Array<{
      title: string;
      url: string;
      type: 'website' | 'document' | 'reference' | 'citation';
      description?: string;
    }>;
    cached?: boolean; // Adicionando a propriedade cached
  }>;
}

const aiNames: Record<string, string> = {
  groq: "Groq",
  openrouter: "OpenRouter",
  cohere: "Cohere",
  google: "Google Gemini",
};

export function IndividualResponses({ responses }: IndividualResponsesProps) {
  const { toast } = useToast();
  const { translations } = useLanguage();
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  const isExpanded = (provider: string) => expandedCards[provider] || false;

  const toggleExpand = (provider: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  const copyToClipboard = async (content: string, provider: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copiado!",
        description: `Resposta do ${aiNames[provider]} copiada para a área de transferência.`,
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o texto.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <h2 className="col-span-full text-2xl font-bold text-center mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        {translations.aiResponses}
      </h2>
      {Object.entries(responses).map(([provider, response]) => (
        <Card key={provider} className="bg-card shadow-md overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">
              {aiNames[provider]}
            </CardTitle>
            {response.error ? (
              <Badge variant="destructive">Erro</Badge>
            ) : (
              <Badge variant="secondary">Sucesso</Badge>
            )}
          </CardHeader>
          <CardContent className="py-4">
            {response.error ? (
              <div className="text-center text-muted-foreground py-8">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                <p>{translations.errorOccurred}: {response.error}</p>
              </div>
            ) : (
              <>
                <div className="prose prose-sm max-w-none">
                  {isExpanded(provider) ? (
                    <p>{response.content}</p>
                  ) : (
                    <p>{response.content.substring(0, 200)}...</p>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                      {translations.responseTime}: {(response.responseTime / 1000).toFixed(1)}s
                      {response.tokens && ` • ${translations.tokens}: ${response.tokens}`}
                      {response.cached && (
                        <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          📦 Cache
                        </span>
                      )}
                    </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSource(provider)}
                    className="gap-2"
                  >
                    <Eye className="w-3 h-3" />
                    {translations.viewSources}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(response.content, provider)}
                    className="gap-2"
                  >
                    <Copy className="w-3 h-3" />
                    {translations.copyResponse}
                  </Button>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(provider)}
                    className="gap-2 mt-2"
                  >
                    {isExpanded(provider) ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        {translations.showLess}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        {translations.showMore}
                      </>
                    )}
                  </Button>
              </>
            )}
          </CardContent>
        </Card>
      ))}
      <SourcesModal
        isOpen={!!selectedSource}
        onClose={() => setSelectedSource(null)}
        responses={responses}
      />
    </div>
  );
}