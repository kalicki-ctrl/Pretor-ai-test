import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Users,
  Zap,
  Brain,
  Eye,
  History,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RoundHistory {
  roundNumber: number;
  response: string;
  reasoning: string;
  confidence: number;
  timestamp: string;
}

interface CollaborativeResponse {
  id: string;
  name: string;
  provider: string;
  initialResponse: string;
  refinedResponse: string;
  reasoning: string;
  confidence: number;
  color: string;
  roundHistory?: RoundHistory[];
}

interface CollaborativeAIModeProps {
  onBack: () => void;
}

enum CollaborativeState {
  INPUT = "input",
  INITIAL_RESPONSES = "initial_responses",
  CROSS_EVALUATION = "cross_evaluation",
  FINAL_SYNTHESIS = "final_synthesis",
  RESULTS = "results",
}

export function CollaborativeAIMode({ onBack }: CollaborativeAIModeProps) {
  const [currentState, setCurrentState] = useState<CollaborativeState>(
    CollaborativeState.INPUT,
  );
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [collaborativeResponses, setCollaborativeResponses] = useState<
    CollaborativeResponse[]
  >([]);
  const [finalSynthesis, setFinalSynthesis] = useState<any>(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();

  // IAs Colaboradoras (Gemini é o juiz/coordenador)
  const aiAgents = [
    { id: "grok", name: "Grok", color: "bg-green-500", provider: "OpenRouter" },
    { id: "llama3", name: "Llama 3", color: "bg-orange-500", provider: "Groq" },
    {
      id: "cohere",
      name: "Cohere",
      color: "bg-purple-500",
      provider: "Cohere",
    },
  ];

  // Gemini como Juiz/Coordenador
  const judgeAI = {
    id: "gemini",
    name: "Gemini",
    color: "bg-blue-500",
    provider: "Google",
    role: "Juiz",
  };

  const handleStartCollaboration = async () => {
    if (prompt.length < 10) {
      toast({
        title: "Prompt muito curto",
        description:
          "Por favor, insira um prompt com pelo menos 10 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setCurrentState(CollaborativeState.INITIAL_RESPONSES);

    try {
      // Rodada 1: Gerar hipóteses iniciais
      setCurrentRound(1);
      const initialResponses = await fetch("/api/collaborative-ai/initial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!initialResponses.ok) {
        throw new Error("Erro ao gerar respostas iniciais");
      }

      const initialData = await initialResponses.json();
      setCollaborativeResponses(initialData.responses);
      setCurrentState(CollaborativeState.CROSS_EVALUATION);

      // Pequena pausa para efeito visual
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Rodada 2: Crítica e refinamento cruzado
      setCurrentRound(2);
      const refinedResponses = await fetch("/api/collaborative-ai/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          initialResponses: initialData.responses,
        }),
      });

      if (!refinedResponses.ok) {
        throw new Error("Erro no refinamento cruzado");
      }

      const refinedData = await refinedResponses.json();
      setCollaborativeResponses(refinedData.responses);
      setCurrentState(CollaborativeState.FINAL_SYNTHESIS);

      // Pausa antes da síntese final
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Síntese final pelo Gemini
      const synthesis = await fetch("/api/collaborative-ai/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          refinedResponses: refinedData.responses,
        }),
      });

      if (!synthesis.ok) {
        throw new Error("Erro na síntese final");
      }

      const synthesisData = await synthesis.json();
      console.log("🎯 Síntese recebida:", synthesisData); // Debug
      setFinalSynthesis(synthesisData.synthesis); // Correção: acessar o campo synthesis
      setCurrentState(CollaborativeState.RESULTS);
    } catch (error) {
      console.error("Erro na colaboração AI:", error);
      toast({
        title: "Erro no Modo Colaborativo",
        description: "Houve um erro durante o processamento. Tente novamente.",
        variant: "destructive",
      });
      setCurrentState(CollaborativeState.INPUT);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderInputScreen = () => (
    <div className="min-h-[80vh] gradient-bg relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-40 h-40 bg-purple-500/3 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-blue-500/3 rounded-full blur-2xl"></div>
      </div>

      <div
        className="relative z-10 max-w-4xl mx-auto px-6 py-12 space-y-8"
        style={{ animation: "fadeInUp 0.8s ease-out" }}
      >
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex items-center space-x-2 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 rounded-xl px-6 py-3 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium">Voltar</span>
          </Button>

          <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 px-4 py-2 rounded-xl">
            <Users className="w-4 h-4 mr-2" />
            Modo Colaborativo AI
          </Badge>
        </div>

        <div className="relative premium-card glass-effect">
          <div className="bg-card/90 backdrop-blur-xl border border-border/30 rounded-3xl p-10 shadow-2xl">
            <div className="absolute inset-0 rounded-3xl opacity-20 bg-gradient-to-br from-purple-500/20 via-transparent to-blue-500/10"></div>

            <div className="relative z-10 space-y-8">
              <div className="text-center space-y-6">
                <div className="relative">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500/20 to-blue-500/10 rounded-2xl flex items-center justify-center shadow-lg">
                    <Users className="w-8 h-8 text-purple-500" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-3xl font-extralight text-foreground tracking-wide">
                    Análise Colaborativa AI
                  </h2>
                  <p className="text-muted-foreground/80 font-light text-lg leading-relaxed max-w-2xl mx-auto">
                    As IAs irão colaborar entre si, refinando suas respostas
                    através de interação cruzada antes da síntese final
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground block">
                    Sua consulta para análise colaborativa
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Descreva sua questão para que as IAs colaborem na análise..."
                    className="w-full h-32 bg-background backdrop-blur-sm border border-border/30 rounded-2xl p-6 text-foreground placeholder-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300"
                  />
                </div>

                <div className="flex items-center justify-center pt-4">
                  <Button
                    onClick={handleStartCollaboration}
                    disabled={isProcessing || prompt.length < 10}
                    className="px-8 py-4 text-lg font-medium bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-500/90 hover:to-blue-500/90 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    Iniciar Colaboração AI
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Agents Preview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {aiAgents.map((agent, index) => (
            <div
              key={agent.id}
              className="relative premium-card glass-effect group"
              style={{
                animation: `slideInScale 0.6s ease-out ${0.1 * index}s both`,
              }}
            >
              <div className="bg-card/80 backdrop-blur-xl rounded-2xl p-6 text-center transition-all duration-300 group-hover:bg-card/90">
                <div
                  className={`w-12 h-12 mx-auto ${agent.color} rounded-xl flex items-center justify-center mb-3 shadow-lg`}
                >
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  {agent.name}
                </h3>
                <p className="text-xs text-muted-foreground/70">
                  {agent.provider}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderProcessingScreen = () => (
    <div className="min-h-[80vh] gradient-bg relative overflow-hidden flex flex-col items-center justify-center">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-purple-500/3 rounded-full blur-3xl animate-float"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-36 h-36 bg-blue-500/3 rounded-full blur-2xl animate-float"
          style={{ animationDelay: "-2s" }}
        ></div>
      </div>

      <div className="relative z-10 flex flex-col items-center space-y-12 px-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-32 h-32 border border-purple-500/20 rounded-full"
              style={{ animation: "float 6s ease-in-out infinite" }}
            ></div>
            <div
              className="absolute w-24 h-24 border border-blue-500/20 rounded-full"
              style={{ animation: "float 4s ease-in-out infinite reverse" }}
            ></div>
          </div>

          <div
            className="relative z-10 w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 via-purple-400 to-blue-500 rounded-full flex items-center justify-center shadow-2xl"
            style={{ animation: "pulse-glow 3s infinite" }}
          >
            <Users className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-extralight text-foreground tracking-wide">
            {currentState === CollaborativeState.INITIAL_RESPONSES &&
              "Rodada 1: Hipóteses Iniciais"}
            {currentState === CollaborativeState.CROSS_EVALUATION &&
              "Rodadas 2-4: Refinamento Colaborativo"}
            {currentState === CollaborativeState.FINAL_SYNTHESIS &&
              "Síntese Final Integrativa"}
          </h2>

          <p className="text-xl text-muted-foreground/80 font-light max-w-2xl mx-auto leading-relaxed">
            {currentState === CollaborativeState.INITIAL_RESPONSES &&
              "As IAs estão gerando suas análises iniciais independentes"}
            {currentState === CollaborativeState.CROSS_EVALUATION &&
              "3 rodadas de refinamento colaborativo em andamento - cada IA analisa e aprimora com base nas outras"}
            {currentState === CollaborativeState.FINAL_SYNTHESIS &&
              "Gemini está criando a síntese final integrando todas as análises refinadas"}
          </p>
        </div>

        {/* AI Status Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {aiAgents.map((agent, index) => (
            <div
              key={agent.id}
              className="flex flex-col items-center space-y-3"
            >
              <div
                className={`w-12 h-12 ${agent.color} rounded-xl flex items-center justify-center shadow-lg animate-pulse`}
                style={{ animationDelay: `${index * 0.5}s` }}
              >
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <span className="text-sm font-medium text-foreground">
                  {agent.name}
                </span>
                <div className="flex items-center justify-center space-x-1 mt-1">
                  <div
                    className={`w-2 h-2 ${agent.color} rounded-full animate-pulse`}
                  ></div>
                  <span className="text-xs text-muted-foreground/60">
                    Processando
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderResultsScreen = () => (
    <div className="min-h-[80vh] gradient-bg relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-44 h-44 bg-purple-500/3 rounded-full blur-3xl animate-float"></div>
        <div
          className="absolute bottom-20 right-10 w-36 h-36 bg-blue-500/3 rounded-full blur-2xl animate-float"
          style={{ animationDelay: "-2s" }}
        ></div>
      </div>

      <div
        className="relative z-10 max-w-6xl mx-auto px-6 py-12 space-y-10"
        style={{ animation: "fadeInUp 0.8s ease-out" }}
      >
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex items-center space-x-2 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 rounded-xl px-6 py-3 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium">Nova Análise</span>
          </Button>

          <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 px-4 py-2 rounded-xl">
            <Users className="w-4 h-4 mr-2" />
            Análise Colaborativa Concluída
          </Badge>
        </div>

        {/* Original Prompt */}
        <div className="relative premium-card glass-effect">
          <div className="bg-card/90 backdrop-blur-xl border border-border/30 rounded-3xl p-8 shadow-xl">
            <div className="absolute inset-0 rounded-3xl opacity-20 bg-gradient-to-br from-purple-500/20 via-transparent to-blue-500/10"></div>

            <div className="relative z-10 space-y-4">
              <h3 className="text-xl font-semibold text-foreground flex items-center">
                <Eye className="w-5 h-5 mr-3 text-purple-500" />
                Consulta Original
              </h3>
              <div className="bg-muted/20 backdrop-blur-sm rounded-2xl p-6 border border-border/30">
                <p className="text-foreground leading-relaxed font-light italic">
                  "{prompt}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Final Synthesis */}
        {finalSynthesis && (
          <div className="relative premium-card glass-effect">
            <div className="bg-card/90 backdrop-blur-xl border border-border/30 rounded-3xl p-8 shadow-xl">
              <div className="absolute inset-0 rounded-3xl opacity-20 bg-gradient-to-br from-primary/20 via-transparent to-purple-500/10"></div>

              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-foreground flex items-center">
                    <Brain className="w-5 h-5 mr-3 text-primary" />
                    Síntese Colaborativa Final
                  </h3>
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline" className="text-xs">
                      {finalSynthesis.synthesisMetadata?.totalAIs} IAs
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {finalSynthesis.synthesisMetadata?.totalInteractions}{" "}
                      Interações
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {finalSynthesis.synthesisMetadata?.averageConfidence}%
                      Confiança
                    </Badge>
                  </div>
                </div>
                <div className="bg-muted/20 backdrop-blur-sm rounded-2xl p-6 border border-border/30">
                  <div className="prose prose-sm max-w-none text-foreground">
                    <div className="whitespace-pre-wrap font-light leading-relaxed">
                      {finalSynthesis.content}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toggle History Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center space-x-2 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 rounded-xl px-6 py-3"
          >
            <History className="w-4 h-4" />
            <span className="font-medium">
              {showHistory ? "Ocultar Histórico" : "Ver Histórico Completo"}
            </span>
            {showHistory ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Collaboration History */}
        {showHistory && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-extralight text-foreground mb-2">
                Histórico Completo das Interações
              </h3>
              <p className="text-muted-foreground/80 font-light">
                Evolução das respostas através das rodadas colaborativas
              </p>
            </div>

            {collaborativeResponses.map((response, index) => (
              <div
                key={response.id}
                className="relative premium-card glass-effect"
              >
                <div className="bg-card/90 backdrop-blur-xl border border-border/30 rounded-3xl p-8 shadow-xl">
                  <div className="absolute inset-0 rounded-3xl opacity-20 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/5"></div>

                  <div className="relative z-10 space-y-6">
                    <div className="flex items-center justify-between border-b border-border/30 pb-4">
                      <h4 className="text-xl font-semibold text-foreground flex items-center">
                        <div
                          className={`w-5 h-5 ${response.color} rounded-full mr-3`}
                        ></div>
                        {response.name} - Evolução Colaborativa
                      </h4>
                      <Badge variant="outline" className="text-sm">
                        {response.roundHistory?.length || 1} Interações
                      </Badge>
                    </div>

                    {response.roundHistory &&
                    response.roundHistory.length > 0 ? (
                      <div className="space-y-4">
                        {response.roundHistory.map((round, roundIndex) => (
                          <div key={roundIndex} className="relative">
                            <div className="flex items-start space-x-4">
                              <div className="flex flex-col items-center">
                                <div
                                  className={`w-8 h-8 rounded-full ${round.roundNumber === 0 ? "bg-gray-500" : response.color} flex items-center justify-center text-white text-xs font-semibold`}
                                >
                                  {round.roundNumber === 0
                                    ? "🎯"
                                    : round.roundNumber}
                                </div>
                                {roundIndex <
                                  (response.roundHistory?.length || 0) - 1 && (
                                  <div className="w-0.5 h-8 bg-border/30 mt-2"></div>
                                )}
                              </div>

                              <div className="flex-1 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h5 className="text-sm font-medium text-foreground">
                                    {round.roundNumber === 0
                                      ? "Hipótese Inicial"
                                      : `Rodada ${round.roundNumber} - Refinamento`}
                                  </h5>
                                  <div className="flex items-center space-x-2">
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {round.confidence}% Confiança
                                    </Badge>
                                    <div className="flex items-center text-xs text-muted-foreground/60">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {new Date(
                                        round.timestamp,
                                      ).toLocaleTimeString("pt-BR", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-muted/20 backdrop-blur-sm rounded-xl p-4 border border-border/20">
                                  <p className="text-foreground text-sm leading-relaxed font-light">
                                    {round.response}
                                  </p>
                                </div>

                                {round.reasoning &&
                                  round.reasoning !==
                                    "Hipótese inicial independente" && (
                                    <div className="bg-purple-500/5 rounded-lg p-3 border border-purple-500/20">
                                      <div className="flex items-start space-x-2">
                                        <Brain className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                          <span className="text-xs font-medium text-purple-500 block mb-1">
                                            Raciocínio:
                                          </span>
                                          <p className="text-xs text-muted-foreground/80 leading-relaxed">
                                            {round.reasoning}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground/60 py-4">
                        <p>Histórico de interações não disponível</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Individual Refined Responses - Summary */}
        {!showHistory && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {collaborativeResponses.map((response, index) => (
              <div
                key={response.id}
                className="relative premium-card glass-effect"
              >
                <div className="bg-card/90 backdrop-blur-xl border border-border/30 rounded-3xl p-6 shadow-xl">
                  <div className="absolute inset-0 rounded-3xl opacity-20 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/5"></div>

                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-foreground flex items-center">
                        <div
                          className={`w-4 h-4 ${response.color} rounded-full mr-3`}
                        ></div>
                        {response.name}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {response.confidence}% Confiança
                        </Badge>
                        {response.roundHistory && (
                          <Badge variant="secondary" className="text-xs">
                            {response.roundHistory.length} Rodadas
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="bg-muted/20 backdrop-blur-sm rounded-xl p-4 border border-border/30">
                      <p className="text-foreground text-sm leading-relaxed font-light">
                        {response.refinedResponse}
                      </p>
                    </div>

                    {response.reasoning && (
                      <div className="text-xs text-muted-foreground/70 italic">
                        Raciocínio Final: {response.reasoning}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (currentState === CollaborativeState.INPUT) {
    return renderInputScreen();
  } else if (currentState === CollaborativeState.RESULTS) {
    return renderResultsScreen();
  } else {
    return renderProcessingScreen();
  }
}
