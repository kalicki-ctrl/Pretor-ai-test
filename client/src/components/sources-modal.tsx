import { useState } from "react";

function isSafeUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, ExternalLink, Clock, Cpu } from "lucide-react";

interface SourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  }>;
}

const aiProviders = {
  openrouter: {
    name: 'OpenRouter',
    description: 'Raciocínio complexo e análise profunda',
    logo: '/attached_assets/Logo_OpenRouter.jpg',
    color: 'bg-blue-500',
  },
  groq: {
    name: 'Groq',
    description: 'Processamento ultrarrápido',
    logo: '/attached_assets/Logo_Groq.jpg', 
    color: 'bg-orange-500',
  },
  cohere: {
    name: 'Cohere',
    description: 'IA empresarial especializada',
    logo: '/attached_assets/Logo_Cohere.jpg',
    color: 'bg-green-500',
  },
  llama3: {
    name: 'Llama3',
    description: 'Compreensão contextual avançada',
    logo: '/attached_assets/Logo_Groq.jpg',
    color: 'bg-green-500',
  },
};

export function SourcesModal({ isOpen, onClose, responses }: SourcesModalProps) {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  if (!isOpen) return null;

  const successfulResponses = Object.entries(responses).filter(([_, response]) => !response.error);
  const errorResponses = Object.entries(responses).filter(([_, response]) => response.error);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center">
            <i className="fas fa-search text-primary mr-3 text-xl"></i>
            <div>
              <h2 className="text-xl font-bold text-foreground">Verificar Fontes</h2>
              <p className="text-sm text-muted-foreground">
                Fontes e referências utilizadas pelas IAs especializadas
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex h-[calc(90vh-100px)]">
          {/* Sidebar with AI list */}
          <div className="w-80 border-r border-border p-4 overflow-y-auto">
            <div className="space-y-3">
              {successfulResponses.map(([provider, response]) => {
                const config = aiProviders[provider as keyof typeof aiProviders];
                if (!config) return null;

                return (
                  <div
                    key={provider}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      selectedSource === provider
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-accent/50 hover:bg-muted/30'
                    }`}
                    onClick={() => setSelectedSource(provider)}
                  >
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-border bg-white mr-3">
                        <img 
                          src={config.logo}
                          alt={`${config.name} Logo`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm text-foreground">{config.name}</h3>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center text-accent">
                        <Clock className="w-3 h-3 mr-1" />
                        {(response.responseTime / 1000).toFixed(1)}s
                      </div>
                      {response.tokens && (
                        <div className="flex items-center text-accent">
                          <Cpu className="w-3 h-3 mr-1" />
                          {response.tokens} tokens
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Error sources */}
              {errorResponses.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Fontes com Erro
                  </h4>
                  {errorResponses.map(([provider, response]) => {
                    const config = aiProviders[provider as keyof typeof aiProviders];
                    if (!config) return null;

                    return (
                      <div
                        key={provider}
                        className="p-3 rounded-lg border-2 border-destructive/30 bg-destructive/5"
                      >
                        <div className="flex items-center mb-2">
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-border bg-white mr-3 opacity-50">
                            <img 
                              src={config.logo}
                              alt={`${config.name} Logo`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm text-foreground">{config.name}</h3>
                            <p className="text-xs text-destructive">{response.error}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 p-6 overflow-y-auto">
            {selectedSource ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-border bg-white mr-3">
                      <img 
                        src={aiProviders[selectedSource as keyof typeof aiProviders]?.logo}
                        alt="AI Logo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">
                        {aiProviders[selectedSource as keyof typeof aiProviders]?.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {aiProviders[selectedSource as keyof typeof aiProviders]?.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {(responses[selectedSource].responseTime / 1000).toFixed(1)}s
                    </div>
                    {responses[selectedSource].tokens && (
                      <div className="flex items-center">
                        <Cpu className="w-4 h-4 mr-1" />
                        {responses[selectedSource].tokens} tokens
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  {responses[selectedSource].sources && responses[selectedSource].sources!.length > 0 ? (
                    <>
                      <h4 className="font-semibold text-foreground flex items-center">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Fontes Utilizadas ({responses[selectedSource].sources!.length})
                      </h4>

                      <div className="space-y-3">
                        {responses[selectedSource].sources!.map((source, index) => (
                          <div key={index} className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  <Badge variant="secondary" className="mr-2 text-xs">
                                    {source.type === 'website' ? 'Website' : 
                                     source.type === 'document' ? 'Documento' :
                                     source.type === 'reference' ? 'Referência' : 'Citação'}
                                  </Badge>
                                  <h5 className="font-medium text-foreground">{source.title}</h5>
                                </div>

                                {source.description && (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {source.description}
                                  </p>
                                )}

                                {source.url !== '#citation' && isSafeUrl(source.url) && (
                                  <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/80 text-sm flex items-center"
                                  >
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    Acessar fonte
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <ExternalLink className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h4 className="font-medium text-foreground mb-2">Nenhuma fonte identificada</h4>
                      <p className="text-muted-foreground text-sm">
                        Esta IA não forneceu fontes específicas ou links de referência em sua resposta.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <i className="fas fa-mouse-pointer text-4xl text-muted-foreground mb-4"></i>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Selecione uma fonte
                  </h3>
                  <p className="text-muted-foreground">
                    Clique em uma das IAs à esquerda para ver suas fontes e referências
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}