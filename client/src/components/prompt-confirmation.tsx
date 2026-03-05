import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PromptConfirmationProps {
  understanding: string;
  alternatives: string[];
  originalPrompt: string;
  responseTime: number;
  recommendedAI?: string;
  aiWeights?: Record<string, number>;
  explanation?: string;
  onConfirm: (prompt: string, selectedAI?: string | null, weights?: Record<string, number>) => void;
  onCancel: () => void;
  isLoading?: boolean;
  hidePromptSection?: boolean;
}

const aiNames = {
  openrouter: "OpenRouter",
  groq: "Groq",
  cohere: "Cohere",
  google: "Google Gemini",
  llama3: "Llama3"
};

const aiDescriptions = {
  openrouter: "Raciocínio complexo e análise profunda",
  groq: "Respostas rápidas e conhecimento geral", 
  cohere: "Análise de texto e compreensão semântica",
  google: "Modelo avançado do Google para análise",
  llama3: "Compreensão contextual e síntese avançada"
};

export function PromptConfirmation({
  understanding,
  alternatives,
  originalPrompt,
  responseTime,
  recommendedAI,
  aiWeights,
  explanation,
  onConfirm,
  onCancel,
  isLoading = false,
  hidePromptSection = false
}: PromptConfirmationProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<string>(originalPrompt);
  const [selectedAI, setSelectedAI] = useState<string | null>(recommendedAI || null);
  const [currentWeights, setCurrentWeights] = useState<Record<string, number>>(aiWeights || {});
  const [canSelectAI, setCanSelectAI] = useState<boolean>(false);

  // Function to recalculate weights based on selected AI
  const recalculateWeights = (aiChoice: string | null) => {
    if (!aiChoice) {
      // Balanced distribution
      const newWeights = {
        openrouter: 0.33,
        groq: 0.33,
        cohere: 0.34
      };
      setCurrentWeights(newWeights);
    } else {
      // Preferred AI gets 50%, others split remaining 50%
      const newWeights = {
        openrouter: aiChoice === 'openrouter' ? 0.5 : 0.25,
        groq: aiChoice === 'groq' ? 0.5 : 0.25,
        cohere: aiChoice === 'cohere' ? 0.5 : 0.25
      };
      setCurrentWeights(newWeights);
    }
  };

  const handleAISelection = (ai: string) => {
    if (!canSelectAI) return; // Não permite seleção se não estiver habilitado

    if (selectedAI === ai) {
      // Deselect if already selected
      setSelectedAI(null);
      recalculateWeights(null);
    } else {
      // Select new AI
      setSelectedAI(ai);
      recalculateWeights(ai);
    }
  };

  const handleConfirm = () => {
    // Pass the current weights to the parent component
    onConfirm(selectedPrompt, selectedAI, currentWeights);
  };

  return (
    <Card className="border-border animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <i className="fas fa-brain text-primary mr-3"></i>
            Pretor AI - Compreensão do Prompt
          </div>
          <Badge variant="outline" className="text-xs">
            {(responseTime / 1000).toFixed(1)}s
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Understanding Section - apenas se não estiver oculta */}
        {!hidePromptSection && (
          <div className="bg-muted/30 rounded-lg p-4 border border-border">
            <h3 className="font-semibold text-foreground mb-3 flex items-center">
              <i className="fas fa-lightbulb text-accent mr-2"></i>
              Compreensão do Prompt
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {understanding}
            </p>
          </div>
        )}

        {/* AI Selection Section */}
        <div className="bg-muted/30 rounded-lg p-4 border border-border">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground flex items-center">
              <i className="fas fa-cog text-accent mr-2"></i>
              Seleção e Configuração de IAs
            </h3>
          </div>

          {/* Original recommendation info */}
          {recommendedAI && (
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 mb-4">
              <p className="text-sm text-accent">
                <i className="fas fa-brain mr-1"></i>
                <strong>Recomendação Pretor AI:</strong> {aiNames[recommendedAI as keyof typeof aiNames]}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {explanation}
              </p>
            </div>
          )}

          {/* Recommendation Message and Enable Button */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <i className="fas fa-star text-primary text-lg mt-1"></i>
              <div className="flex-1">
                <p className="text-sm font-semibold text-primary mb-2">
                  Fortemente recomendamos deixar a Pretor IA decidir
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Nossa IA analisou seu prompt e selecionou automaticamente a configuração mais adequada. 
                  Para melhores resultados, mantenha a configuração recomendada.
                </p>
                {!canSelectAI && (
                  <Button
                    onClick={() => setCanSelectAI(true)}
                    variant="outline"
                    size="sm"
                    className="border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <i className="fas fa-cog mr-2"></i>
                    Personalizar Configuração
                  </Button>
                )}
                {canSelectAI && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <i className="fas fa-info-circle mr-1"></i>
                    Configuração personalizada ativada
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Manual AI Selection - Apenas quando personalização está ativa */}
          {canSelectAI && (
            <div className="space-y-3 transition-all duration-300 animate-fade-in">
              <p className="text-sm text-foreground dark:text-foreground font-medium">
                Clique em uma IA para defini-la como mais adequada:
              </p>

              {/* AI Selection Cards */}
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(currentWeights).map(([ai, weight]) => (
                  <div
                    key={ai}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      selectedAI === ai 
                        ? 'border-primary bg-primary/10 shadow-md' 
                        : 'border-border bg-card hover:border-accent/50 hover:bg-muted/30'
                    }`}
                    onClick={() => handleAISelection(ai)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`text-base font-semibold ${
                          selectedAI === ai 
                            ? 'text-primary' 
                            : 'text-foreground dark:text-foreground'
                        }`}>
                          {aiNames[ai as keyof typeof aiNames]}
                        </span>
                        {selectedAI === ai && (
                          <i className="fas fa-check-circle text-primary ml-2 text-sm"></i>
                        )}
                        {recommendedAI === ai && selectedAI !== ai && (
                          <i className="fas fa-star text-amber-500 ml-2 text-sm"></i>
                        )}
                      </div>

                      <div className="flex items-center">
                        <div className="w-20 h-3 bg-muted rounded-full mr-3">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              selectedAI === ai ? 'bg-primary' : 'bg-accent'
                            }`}
                            style={{ width: `${weight * 100}%` }}
                          />
                        </div>
                        <span className={`text-sm w-10 font-bold ${
                          selectedAI === ai 
                            ? 'text-primary' 
                            : 'text-foreground dark:text-foreground'
                        }`}>
                          {(weight * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-2">
                      {aiDescriptions[ai as keyof typeof aiDescriptions]}
                    </p>
                  </div>
                ))}
              </div>

              {/* Botões de controle - apenas quando personalização está ativa */}
              <div className="flex gap-2 justify-center pt-2">
                <button
                  onClick={() => {
                    setSelectedAI(recommendedAI || null);
                    setCurrentWeights(aiWeights || {});
                  }}
                  className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-full transition-colors border border-primary/30 font-medium"
                >
                  <i className="fas fa-brain mr-1"></i>
                  Deixar Pretor IA decidir
                </button>
                {selectedAI && (
                  <button
                    onClick={() => handleAISelection('')}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-full border border-border hover:border-accent/50"
                  >
                    <i className="fas fa-balance-scale mr-1"></i>
                    Equilibrar
                  </button>
                )}
              </div>

              {/* Weight distribution info */}
              <div className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg">
                {selectedAI ? (
                  <span>
                    <i className="fas fa-info-circle mr-2"></i>
                    <strong>{aiNames[selectedAI as keyof typeof aiNames]}</strong> terá mais peso (50%) na síntese final
                  </span>
                ) : (
                  <span>
                    <i className="fas fa-balance-scale mr-2"></i>
                    Distribuição equilibrada - todas as IAs terão peso similar (33% cada)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Question - apenas se seção de prompt não estiver oculta */}
        {!hidePromptSection && (
          <>
            <div className="text-center py-4">
              <p className="text-foreground mb-4 text-lg">
                É isso mesmo que você deseja pesquisar?
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
                >
                  <i className="fas fa-check mr-2"></i>
                  {isLoading ? "Iniciando pesquisa..." : "Sim, iniciar pesquisa"}
                </Button>
                <Button
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="px-6"
                >
                  <i className="fas fa-edit mr-2"></i>
                  Editar prompt
                </Button>
              </div>
            </div>

            {/* Alternative Prompts */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground flex items-center">
                <i className="fas fa-magic text-accent mr-2"></i>
                Ou escolha uma alternativa melhorada:
              </h3>

              {/* Original Prompt Option */}
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:border-primary/50 ${
                  selectedPrompt === originalPrompt 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border bg-card hover:bg-muted/30'
                }`}
                onClick={() => setSelectedPrompt(originalPrompt)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Badge variant="secondary" className="text-xs mb-2">
                      Prompt Original
                    </Badge>
                    <p className="text-foreground">{originalPrompt}</p>
                  </div>
                  {selectedPrompt === originalPrompt && (
                    <i className="fas fa-check-circle text-primary ml-3 mt-1"></i>
                  )}
                </div>
              </div>

              {/* Alternative Prompts */}
              {alternatives.map((alternative, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:border-primary/50 ${
                    selectedPrompt === alternative 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border bg-card hover:bg-muted/30'
                  }`}
                  onClick={() => setSelectedPrompt(alternative)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Badge variant="outline" className="text-xs mb-2">
                        Alternativa {index + 1}
                      </Badge>
                      <p className="text-foreground">{alternative}</p>
                    </div>
                    {selectedPrompt === alternative && (
                      <i className="fas fa-check-circle text-primary ml-3 mt-1"></i>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Selected prompt confirmation */}
            {selectedPrompt !== originalPrompt && (
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
                <p className="text-accent text-sm">
                  <i className="fas fa-info-circle mr-2"></i>
                  Você selecionou uma alternativa. Clique em "Sim, iniciar pesquisa" para continuar com este prompt.
                </p>
              </div>
            )}
          </>
        )}

        {/* Botão de confirmação para configuração das IAs quando seção de prompt estiver oculta */}
        {hidePromptSection && (
          <div className="text-center py-4">
            <p className="text-foreground mb-4 text-lg">
              Configure IAs and start analysis?
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={handleConfirm}
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
              >
                <i className="fas fa-rocket mr-2"></i>
                {isLoading ? "Starting analysis..." : "Start Analysis"}
              </Button>
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="px-6"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Voltar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}