import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, Eye, FileText, ArrowLeft } from "lucide-react";
import { PromptInput } from "@/components/prompt-input";
import { LlamaAnalysisNew } from "@/components/llama-analysis-new";
import { IndividualResponses } from "@/components/individual-responses";
import { PromptConfirmation } from "@/components/prompt-confirmation";
import { SourcesModal } from "@/components/sources-modal";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Suspense, lazy, startTransition } from "react";
import brainImagePath from "@assets/image_1753186335826.png";

// Lazy load heavy components for better performance
const ChatMode = lazy(() => import("@/components/chat-mode").then(m => ({ default: m.ChatMode })));
const ImageSearchMode = lazy(() => import("@/components/image-search-mode").then(m => ({ default: m.ImageSearchMode })));
const CollaborativeAIMode = lazy(() => import("@/components/collaborative-ai-mode").then(m => ({ default: m.CollaborativeAIMode })));
import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/language-context";

// Enum para controlar as telas
enum ScreenState {
  MODE_SELECTION = 'mode_selection',
  PROMPT_INPUT = 'prompt_input',
  PROMPT_SUGGESTIONS = 'prompt_suggestions', 
  AI_CONFIGURATION = 'ai_configuration',
  PROCESSING_ANALYSIS = 'processing_analysis',
  ANALYSIS_RESULTS = 'analysis_results',
  CHAT_MODE = 'chat_mode',
  IMAGE_SEARCH_MODE = 'image_search_mode',
  COLLABORATIVE_AI_MODE = 'collaborative_ai_mode'
}

enum AnalysisMode {
  DEEP_SEARCH = 'deep_search',
  CHAT = 'chat',
  IMAGE_SEARCH = 'image_search',
  COLLABORATIVE_AI = 'collaborative_ai'
}

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>(ScreenState.MODE_SELECTION);
  const [selectedMode, setSelectedMode] = useState<AnalysisMode | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [progressResponses, setProgressResponses] = useState<Record<string, any>>({});
  const [understanding, setUnderstanding] = useState<any>(null);
  const [showSources, setShowSources] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string>("");
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'ai', content: string, aiProvider?: string}>>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const { language, translations, setLanguage, detectedLocation } = useLanguage();


  const availableLanguages = [
    { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
    { code: 'en-US', name: 'English', flag: '🇺🇸' },
    { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
    { code: 'fr-FR', name: 'Français', flag: '🇫🇷' },
    { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
    { code: 'ja-JP', name: '日本語', flag: '🇯🇵' }
  ];

  const handleAnalysisComplete = () => {
    console.log('All AIs completed, responses:', progressResponses);
  };

  // Tela 1: Input do prompt
  const handleSubmit = async () => {
    if (prompt.length < 10) {
      return;
    }

    setIsLoading(true);
    setAnalysisData(null);
    setProgressResponses({});
    setUnderstanding(null);

    try {
      const understandResponse = await fetch('/api/understand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!understandResponse.ok) {
        throw new Error(`HTTP error! status: ${understandResponse.status}`);
      }

      const understandData = await understandResponse.json();

      if (understandData.success) {
        setUnderstanding(understandData);
        setSelectedPrompt(prompt); // Prompt original como padrão
        setCurrentScreen(ScreenState.PROMPT_SUGGESTIONS);
        setIsLoading(false);
      } else {
        console.error('Understanding failed:', understandData.message);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error during understanding:', error);
      setIsLoading(false);
    }
  };

  // Tela 2: Seleção de sugestões de prompt
  const handlePromptSelection = (chosenPrompt: string) => {
    setSelectedPrompt(chosenPrompt);
    setCurrentScreen(ScreenState.AI_CONFIGURATION);
  };

  // Tela 3: Configuração das IAs e início da análise
  const handleConfirmPrompt = async (finalPrompt: string, selectedAI?: string | null, customWeights?: Record<string, number>) => {
    setIsLoading(true);
    setCurrentScreen(ScreenState.PROCESSING_ANALYSIS);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: finalPrompt,
          recommendedAI: selectedAI || understanding?.recommendedAI,
          aiWeights: customWeights || understanding?.aiWeights
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setAnalysisData(data);
        setProgressResponses(data.responses || {});
        setCurrentScreen(ScreenState.ANALYSIS_RESULTS);
      } else {
        console.error('Analysis failed:', data.message);
      }
    } catch (error) {
      console.error('Error during analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetToPromptInput = () => {
    setCurrentScreen(ScreenState.PROMPT_INPUT);
    setAnalysisData(null);
    setUnderstanding(null);
    setProgressResponses({});
    setPrompt("");
    setSelectedPrompt("");
    setIsLoading(false);
  };

  const goBackToPromptSuggestions = () => {
    setCurrentScreen(ScreenState.PROMPT_SUGGESTIONS);
  };

  const goBackToPromptInput = () => {
    setCurrentScreen(ScreenState.PROMPT_INPUT);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Premium Header */}
      <header className="bg-card/80 backdrop-blur-xl border-b border-border/30 shadow-lg glass-effect relative overflow-hidden">
        {/* Header background effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-yellow-500/5"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-6">
          <div className="flex items-center justify-between">
            {/* Logo and Brand Section */}
            <div className="flex items-center space-x-6" style={{ animation: 'slideInScale 0.8s ease-out' }}>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-yellow-400 to-yellow-500 rounded-xl opacity-30 group-hover:opacity-60 transition-opacity duration-300 blur-sm"></div>
                <div className="relative">
                  <Logo size="lg" />
                </div>
              </div>

              <div>
                <button
                  onClick={() => startTransition(() => setCurrentScreen(ScreenState.MODE_SELECTION))}
                  className="text-left group transition-all duration-300"
                >
                  <h1 className="text-3xl font-extralight text-foreground group-hover:text-primary transition-colors duration-300 tracking-wide">
                    {translations.title}
                  </h1>
                  <p className="text-muted-foreground/80 font-light text-sm tracking-wider">
                    {translations.subtitle}
                  </p>
                </button>
              </div>
            </div>

            {/* Controls Section */}
            <div className="flex items-center space-x-6" style={{ animation: 'slideInScale 0.8s ease-out 0.2s both' }}>
              {/* Location Badge */}
              {detectedLocation && (
                <Badge 
                  variant="secondary" 
                  className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/30 text-xs font-light px-3 py-1 rounded-full backdrop-blur-sm"
                >
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></span>
                  {detectedLocation.country}
                </Badge>
              )}

              {/* Language Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 rounded-xl px-4 py-2"
                  >
                    <Languages className="w-4 h-4" />
                    {availableLanguages.find(lang => lang.code === language)?.flag}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="bg-card/95 backdrop-blur-xl border-border/50 rounded-xl shadow-xl"
                >
                  {detectedLocation && (
                    <>
                      <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border/50">
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                          <span>{translations.connecting}: {detectedLocation.country}</span>
                        </div>
                      </div>
                      <Separator className="my-1" />
                    </>
                  )}
                  {availableLanguages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className="gap-3 hover:bg-primary/10 transition-colors duration-200 rounded-lg mx-1"
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span className="font-medium">{lang.name}</span>
                      {lang.code === language && (
                        <span className="ml-auto text-primary">✓</span>
                      )}
                      {detectedLocation && lang.code === detectedLocation.language && (
                        <span className="ml-auto text-xs text-muted-foreground bg-yellow-500/10 px-2 py-1 rounded-full">Auto</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Theme Toggle */}
              <div className="relative">
                <ThemeToggle />
              </div>

              {/* Premium Badge */}
              <Badge
                variant="outline"
                className="bg-gradient-to-r from-primary/10 to-yellow-500/10 text-primary border-primary/30 hover:from-primary/20 hover:to-yellow-500/20 hover:border-primary/50 transition-all duration-300 px-4 py-2 rounded-xl shadow-lg backdrop-blur-sm group"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse group-hover:animate-bounce"></div>
                  <span className="font-medium text-sm tracking-wide">{translations.secureAPIs}</span>
                </div>
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tela de Seleção de Modo */}
        {currentScreen === ScreenState.MODE_SELECTION && (
          <div className="min-h-[85vh] gradient-bg relative overflow-hidden">
            {/* Optimized background elements */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/4 left-10 w-24 h-24 bg-primary/3 rounded-full blur-xl animate-float" style={{ animationDuration: '3s' }}></div>
              <div className="absolute bottom-1/4 right-10 w-16 h-16 bg-yellow-500/3 rounded-full blur-lg animate-float" style={{ animationDelay: '-1.5s', animationDuration: '3s' }}></div>
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center min-h-[85vh] px-4 py-12">
              {/* Hero Section */}
              <div className="text-center space-y-8 mb-16 max-w-4xl mx-auto">
                {/* Premium brain logo animation */}
                <div className="relative">
                  <div 
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ animation: 'pulse-glow 2.5s infinite' }}
                  >
                    <div className="w-28 h-28 bg-gradient-to-br from-primary/20 to-yellow-500/12 rounded-full blur-md"></div>
                  </div>
                  <div 
                    className="relative z-10 w-24 h-24 mx-auto flex items-center justify-center shadow-xl neon-border rounded-full bg-black/75 backdrop-blur-sm"
                    style={{ animation: 'float 3s ease-in-out infinite' }}
                  >
                    <img 
                      src={brainImagePath} 
                      alt="AI Brain Circuit" 
                      className="w-20 h-20 object-contain"
                      style={{ filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.3))' }}
                    />
                  </div>
                </div>

                {/* Premium typography */}
                <div className="space-y-6">
                  <h1 
                    className="text-5xl md:text-6xl font-extralight text-foreground tracking-wide leading-tight"
                    style={{ animation: 'fadeInUp 1s ease-out' }}
                  >
                    {translations.selectMode}
                  </h1>

                  <div className="flex items-center justify-center space-x-4">
                    <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent flex-1 max-w-24"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent flex-1 max-w-24"></div>
                  </div>

                  <p 
                    className="text-xl md:text-2xl text-muted-foreground/80 font-light max-w-3xl mx-auto leading-relaxed"
                    style={{ animation: 'fadeInUp 1s ease-out 0.2s both' }}
                  >
                    {translations.description}
                  </p>
                </div>
              </div>

              {/* Premium Mode Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-8xl mx-auto w-full">
                {/* Deep Search Mode */}
                <div 
                  className="group relative cursor-pointer premium-card glass-effect"
                  style={{ animation: 'slideInScale 0.8s ease-out 0.3s both' }}
                  onClick={() => {
                    startTransition(() => {
                      setSelectedMode(AnalysisMode.DEEP_SEARCH);
                      setCurrentScreen(ScreenState.PROMPT_INPUT);
                    });
                  }}
                >
                  <div className="relative bg-card/80 backdrop-blur-xl rounded-3xl p-10 transition-all duration-500 group-hover:bg-card/90 h-full min-h-[380px] flex flex-col">
                    {/* Card glow effect */}
                    <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/10 via-transparent to-yellow-500/5"></div>

                    <div className="relative z-10 flex flex-col items-center text-center space-y-8 flex-1">
                      {/* Premium icon */}
                      <div className="relative">
                        <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-500 shadow-lg">
                          <svg className="w-10 h-10 text-primary group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 13l4 4" />
                          </svg>
                        </div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-primary to-yellow-400 rounded-full flex items-center justify-center">
                          <span className="text-black text-xs font-bold">AI</span>
                        </div>
                      </div>

                      <div className="space-y-4 flex-1">
                        <h3 className="text-2xl font-semibold text-foreground group-hover:text-primary/90 transition-colors duration-300">
                          {translations.deepSearch}
                        </h3>
                        <p className="text-muted-foreground/90 font-light leading-relaxed text-base">
                          {translations.deepSearchDescription}
                        </p>
                      </div>

                      {/* Premium call-to-action */}
                      <div className="flex items-center space-x-2 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-2 transition-all duration-300">
                        <span className="text-sm font-medium">Start Analysis</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chat Mode */}
                <div 
                  className="group relative cursor-pointer premium-card glass-effect"
                  style={{ animation: 'slideInScale 0.8s ease-out 0.4s both' }}
                  onClick={() => {
                    startTransition(() => {
                      setSelectedMode(AnalysisMode.CHAT);
                      setCurrentScreen(ScreenState.CHAT_MODE);
                    });
                  }}
                >
                  <div className="relative bg-card/80 backdrop-blur-xl rounded-3xl p-10 transition-all duration-500 group-hover:bg-card/90 h-full min-h-[380px] flex flex-col">
                    <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-yellow-500/10 via-transparent to-primary/5"></div>

                    <div className="relative z-10 flex flex-col items-center text-center space-y-8 flex-1">
                      <div className="relative">
                        <div className="w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-yellow-500/10 rounded-2xl flex items-center justify-center group-hover:from-yellow-500/30 group-hover:to-yellow-500/20 transition-all duration-500 shadow-lg">
                          <svg className="w-10 h-10 text-yellow-500 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">∞</span>
                        </div>
                      </div>

                      <div className="space-y-4 flex-1">
                        <h3 className="text-2xl font-semibold text-foreground group-hover:text-yellow-500/90 transition-colors duration-300">
                          {translations.chat}
                        </h3>
                        <p className="text-muted-foreground/90 font-light leading-relaxed text-base">
                          {translations.chatDescription}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 text-muted-foreground/60 group-hover:text-yellow-500 group-hover:translate-x-2 transition-all duration-300">
                        <span className="text-sm font-medium">  {translations.startChatButton}</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image Search Mode */}
                <div 
                  className="group relative cursor-pointer premium-card glass-effect"
                  style={{ animation: 'slideInScale 0.8s ease-out 0.5s both' }}
                  onClick={() => {
                    startTransition(() => {
                      setSelectedMode(AnalysisMode.IMAGE_SEARCH);
                      setCurrentScreen(ScreenState.IMAGE_SEARCH_MODE);
                    });
                  }}
                >
                  <div className="relative bg-card/80 backdrop-blur-xl rounded-3xl p-10 transition-all duration-500 group-hover:bg-card/90 h-full min-h-[380px] flex flex-col">
                    <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-orange-500/10 via-transparent to-primary/5"></div>

                    <div className="relative z-10 flex flex-col items-center text-center space-y-8 flex-1">
                      <div className="relative">
                        <div className="w-20 h-20 bg-gradient-to-br from-orange-500/20 to-orange-500/10 rounded-2xl flex items-center justify-center group-hover:from-orange-500/30 group-hover:to-orange-500/20 transition-all duration-500 shadow-lg">
                          <svg className="w-10 h-10 text-orange-500 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-orange-500 to-amber-400 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">📷</span>
                        </div>
                      </div>

                      <div className="space-y-4 flex-1">
                        <h3 className="text-2xl font-semibold text-foreground group-hover:text-orange-500/90 transition-colors duration-300">
                          {translations.imageSearch}
                        </h3>
                        <p className="text-muted-foreground/90 font-light leading-relaxed text-base">
                          {translations.imageSearchDescription}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 text-muted-foreground/60 group-hover:text-orange-500 group-hover:translate-x-2 transition-all duration-300">
                        <span className="text-sm font-medium">Analisar Imagem</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collaborative AI Mode - NEW */}
                <div 
                  className="group relative cursor-pointer premium-card glass-effect"
                  style={{ animation: 'slideInScale 0.8s ease-out 0.6s both' }}
                  onClick={() => {
                    startTransition(() => {
                      setSelectedMode(AnalysisMode.COLLABORATIVE_AI);
                      setCurrentScreen(ScreenState.COLLABORATIVE_AI_MODE);
                    });
                  }}
                >
                  <div className="relative bg-card/80 backdrop-blur-xl rounded-3xl p-10 transition-all duration-500 group-hover:bg-card/90 h-full min-h-[380px] flex flex-col">
                    <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/5"></div>

                    <div className="relative z-10 flex flex-col items-center text-center space-y-8 flex-1">
                      <div className="relative">
                        <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-blue-500/10 rounded-2xl flex items-center justify-center group-hover:from-purple-500/30 group-hover:to-blue-500/20 transition-all duration-500 shadow-lg">
                          <svg className="w-10 h-10 text-purple-500 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">⚡</span>
                        </div>
                      </div>

                      <div className="space-y-4 flex-1">
                        <h3 className="text-2xl font-semibold text-foreground group-hover:text-purple-500/90 transition-colors duration-300">
                          Modo Colaborativo AI
                        </h3>
                        <p className="text-muted-foreground/90 font-light leading-relaxed text-base">
                          IAs interagem e refinam suas respostas entre si antes da síntese final
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 text-muted-foreground/60 group-hover:text-purple-500 group-hover:translate-x-2 transition-all duration-300">
                        <span className="text-sm font-medium">Iniciar Colaboração</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Premium indicators na parte inferior */}
              <div 
                className="flex items-center justify-center space-x-8 pt-12 opacity-70"
                style={{ animation: 'fadeInUp 1s ease-out 0.8s both' }}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-muted-foreground font-light">APIs Seguras</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  <span className="text-xs text-muted-foreground font-light">Múltiplas IAs</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                  <span className="text-xs text-muted-foreground font-light">Premium</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tela 1: Input do Prompt - Premium Style */}
        {currentScreen === ScreenState.PROMPT_INPUT && (
          <div className="min-h-[80vh] gradient-bg relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-20 left-10 w-40 h-40 bg-primary/3 rounded-full blur-3xl"></div>
              <div className="absolute bottom-20 right-10 w-32 h-32 bg-green-500/3 rounded-full blur-2xl"></div>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 space-y-8" style={{ animation: 'fadeInUp 0.8s ease-out' }}>
              {/* Premium Back Button */}
              <div className="flex items-center justify-between mb-8">
                <Button
                  variant="outline"
                  onClick={() => startTransition(() => setCurrentScreen(ScreenState.MODE_SELECTION))}
                  className="flex items-center space-x-2 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 rounded-xl px-6 py-3 group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
                  <span className="font-medium">{translations.backButton}</span>
                </Button>

                {/* Mode indicator badge */}
                <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2 rounded-xl">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {translations.deepSearch}
                </Badge>
              </div>

              {/* Premium Card */}
              <div className="relative premium-card glass-effect">
                <div className="bg-card/90 backdrop-blur-xl border border-border/30 rounded-3xl p-10 shadow-2xl">
                  {/* Card glow effect */}
                  <div className="absolute inset-0 rounded-3xl opacity-20 bg-gradient-to-br from-primary/20 via-transparent to-green-500/10"></div>

                  <div className="relative z-10 space-y-8">
                    {/* Header Section */}
                    <div className="text-center space-y-6">
                      <div className="relative">
                        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center shadow-lg">
                          <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h2 className="text-3xl font-extralight text-foreground tracking-wide">
                          {translations.typePrompt}
                        </h2>
                        <div className="flex items-center justify-center space-x-4">
                          <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent w-16"></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                          <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent w-16"></div>
                        </div>
                        <p className="text-muted-foreground/80 font-light text-lg max-w-2xl mx-auto leading-relaxed">
                          {translations.promptDescription}
                        </p>
                      </div>
                    </div>

                    {/* Input Component */}
                    <div className="space-y-6">
                      <PromptInput
                        prompt={prompt}
                        onPromptChange={setPrompt}
                        onSubmit={handleSubmit}
                        isLoading={isLoading}
                        responses={progressResponses}
                        onAnalysisComplete={handleAnalysisComplete}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Premium Features Indicator */}
              <div className="flex items-center justify-center space-x-8 pt-8 opacity-60">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-muted-foreground font-light">Análise Inteligente</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  <span className="text-xs text-muted-foreground font-light">4 IAs Simultâneas</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                  <span className="text-xs text-muted-foreground font-light">Confirmação Prévia</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tela 2: Seleção de Sugestões de Prompt - Premium Style */}
        {currentScreen === ScreenState.PROMPT_SUGGESTIONS && understanding && (
          <div className="min-h-[80vh] gradient-bg relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/4 left-10 w-36 h-36 bg-green-500/5 rounded-full blur-3xl animate-float"></div>
              <div className="absolute bottom-1/3 right-10 w-28 h-28 bg-primary/5 rounded-full blur-2xl animate-float" style={{ animationDelay: '-2s' }}></div>
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 space-y-10" style={{ animation: 'fadeInUp 0.8s ease-out' }}>
              {/* Premium Header */}
              <div className="flex items-center justify-between mb-12">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-500/10 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-3xl font-extralight text-foreground tracking-wide">
                        Selecione Seu Prompt
                      </h2>
                      <p className="text-muted-foreground/80 font-light text-lg">
                        Escolha o prompt original ou uma das alternativas otimizadas
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => startTransition(() => goBackToPromptInput())}
                  className="flex items-center space-x-2 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 rounded-xl px-6 py-3 group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
                  <span className="font-medium">Voltar</span>
                </Button>
              </div>

              {/* AI Understanding Card */}
              <div className="relative premium-card glass-effect mb-10">
                <div className="bg-card/90 backdrop-blur-xl border border-border/30 rounded-3xl p-8 shadow-xl">
                  <div className="absolute inset-0 rounded-3xl opacity-20 bg-gradient-to-br from-green-500/20 via-transparent to-primary/10"></div>

                  <div className="relative z-10 space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-green-500/20 to-green-500/10 rounded-2xl flex items-center justify-center">
                        <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground">Compreensão Pretor AI</h3>
                        <p className="text-muted-foreground/70 font-light">Análise inteligente do seu prompt</p>
                      </div>
                    </div>

                    <div className="bg-muted/20 backdrop-blur-sm rounded-2xl p-6 border border-border/30">
                      <p className="text-foreground leading-relaxed font-light text-base">
                        {understanding.understanding}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prompt Selection Cards */}
              <div className="space-y-6">
                {/* Original Prompt */}
                <div 
                  className={`group relative cursor-pointer premium-card glass-effect ${selectedPrompt === undefined ? 'ring-2 ring-primary ring-opacity-50' : ''}`}
                  style={{ animation: 'slideInScale 0.6s ease-out 0.2s both' }}
                  onClick={() => setSelectedPrompt(undefined)}
                >
                  <div className="relative bg-card/90 backdrop-blur-xl border border-border/30 rounded-2xl p-6 transition-all duration-300 hover:border-primary/40">
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/10 via-transparent to-primary/5"></div>

                    <div className="relative z-10 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">Prompt Original</h4>
                            <p className="text-xs text-muted-foreground/70 font-light">Sua versão inicial</p>
                          </div>
                        </div>

                        {selectedPrompt === undefined && (
                          <Badge className="bg-primary/10 text-primary border-primary/20">
                            Selecionado
                          </Badge>
                        )}
                      </div>

                      <div className="bg-muted/20 backdrop-blur-sm rounded-xl p-4 border border-border/20">
                        <p className="text-foreground font-light leading-relaxed">
                          {prompt}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alternative Prompts */}
                {understanding.alternatives && understanding.alternatives.map((alternative, index) => (
                  <div 
                    key={index}
                    className={`group relative cursor-pointer premium-card glass-effect ${selectedPrompt === index ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
                    style={{ animation: `slideInScale 0.6s ease-out ${0.3 + index * 0.1}s both` }}
                    onClick={() => setSelectedPrompt(index)}
                  >
                    <div className="relative bg-card/90 backdrop-blur-xl border border-border/30 rounded-2xl p-6 transition-all duration-300 hover:border-green-500/40">
                      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-green-500/10 via-transparent to-green-500/5"></div>

                      <div className="relative z-10 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500/20 to-green-500/10 rounded-xl flex items-center justify-center">
                              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground">Alternativa {index + 1}</h4>
                              <p className="text-xs text-muted-foreground/70 font-light">Otimizada pela IA</p>
                            </div>
                          </div>

                          {selectedPrompt === index && (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                              Selecionado
                            </Badge>
                          )}
                        </div>

                        <div className="bg-muted/20 backdrop-blur-sm rounded-xl p-4 border border-border/20">
                          <p className="text-foreground font-light leading-relaxed">
                            {alternative}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div className="flex justify-center pt-8">
                <Button
                  onClick={() => handlePromptSelection(selectedPrompt)}
                  className="px-8 py-4 text-lg font-medium bg-gradient-to-r from-primary to-green-500 hover:from-primary/90 hover:to-green-500/90 text-black rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  style={{ animation: 'fadeInUp 0.8s ease-out 0.8s both' }}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Confirmar e Analisar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tela 3: Configuração das IAs - Premium Style */}
        {currentScreen === ScreenState.AI_CONFIGURATION && understanding && (
          <div className="min-h-[80vh] gradient-bg relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/4 right-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl animate-float"></div>
              <div className="absolute bottom-1/3 left-10 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl animate-float" style={{ animationDelay: '-3s' }}></div>
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 space-y-10" style={{ animation: 'fadeInUp 0.8s ease-out' }}>
              {/* Premium Header */}
              <div className="flex items-center justify-between mb-12">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-3xl font-extralight text-foreground tracking-wide">
                        Configuração das IAs
                      </h2>
                      <p className="text-muted-foreground/80 font-light text-lg">
                        Personalize os pesos e preferências da análise
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => startTransition(() => goBackToPromptSuggestions())}
                  className="flex items-center space-x-2 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 rounded-xl px-6 py-3 group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
                  <span className="font-medium">Voltar</span>
                </Button>
              </div>

              {/* Selected Prompt Display */}
              <div className="relative premium-card glass-effect mb-10">
                <div className="bg-card/90 backdrop-blur-xl border border-border/30 rounded-3xl p-8 shadow-xl">
                  <div className="absolute inset-0 rounded-3xl opacity-20 bg-gradient-to-br from-primary/20 via-transparent to-blue-500/10"></div>

                  <div className="relative z-10 space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center">
                        <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground">Prompt Selecionado</h3>
                        <p className="text-muted-foreground/70 font-light">Versão otimizada para análise</p>
                      </div>
                    </div>

                    <div className="bg-muted/20 backdrop-blur-sm rounded-2xl p-6 border border-border/30">
                      <p className="text-foreground leading-relaxed font-light text-base">
                        {selectedPrompt}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Configuration Component */}
              <div className="relative premium-card glass-effect">
                <div className="bg-card/90 backdrop-blur-xl border border-border/30 rounded-3xl p-8 shadow-xl">
                  <div className="absolute inset-0 rounded-3xl opacity-20 bg-gradient-to-br from-blue-500/20 via-transparent to-purple-500/10"></div>

                  <div className="relative z-10">
                    <PromptConfirmation
                      understanding={understanding.understanding}
                      alternatives={understanding.alternatives}
                      originalPrompt={selectedPrompt}
                      responseTime={understanding.responseTime}
                      recommendedAI={understanding.recommendedAI}
                      aiWeights={understanding.aiWeights}
                      explanation={understanding.explanation}
                      onConfirm={handleConfirmPrompt}
                      onCancel={goBackToPromptSuggestions}
                      isLoading={isLoading}
                      hidePromptSection={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tela 4: Loading do Processamento - Premium Style */}
        {currentScreen === ScreenState.PROCESSING_ANALYSIS && (
          <div className="min-h-[90vh] gradient-bg relative overflow-hidden flex flex-col items-center justify-center">
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-primary/3 rounded-full blur-3xl animate-float"></div>
              <div className="absolute bottom-1/4 right-1/4 w-36 h-36 bg-green-500/3 rounded-full blur-2xl animate-float" style={{ animationDelay: '-2s' }}></div>
              <div className="absolute top-3/4 left-3/4 w-24 h-24 bg-blue-500/3 rounded-full blur-xl animate-float" style={{ animationDelay: '-4s' }}></div>
            </div>

            <div className="relative z-10 flex flex-col items-center space-y-16 px-6">
              {/* Premium AI Logo */}
              <div className="relative">
                {/* Orbital rings */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div 
                    className="w-40 h-40 border border-primary/20 rounded-full"
                    style={{ animation: 'float 8s ease-in-out infinite' }}
                  ></div>
                  <div 
                    className="absolute w-32 h-32 border border-green-500/20 rounded-full"
                    style={{ animation: 'float 6s ease-in-out infinite reverse' }}
                  ></div>
                  <div 
                    className="absolute w-24 h-24 border border-blue-500/20 rounded-full"
                    style={{ animation: 'float 4s ease-in-out infinite' }}
                  ></div>
                </div>

                {/* Central AI brain */}
                <div 
                  className="relative z-10 w-20 h-20 mx-auto bg-gradient-to-br from-primary via-yellow-400 to-green-500 rounded-full flex items-center justify-center shadow-2xl"
                  style={{ animation: 'pulse-glow 3s infinite' }}
                >
                  <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L7 12.5v5.25a2.25 2.25 0 002.25 2.25h1.5M14.25 3.104v5.714c0 .597.237 1.17.659 1.591L17 12.5v5.25a2.25 2.25 0 01-2.25 2.25h-1.5M12 12h2.25m-2.25 0h-2.25m2.25 0c0 1.5 0 3-2.25 3s-2.25-1.5-2.25-3m4.5 0c0 1.5 0 3 2.25 3s2.25-1.5 2.25-3m-4.5 0V9.75A2.25 2.25 0 0112 7.5v0a2.25 2.25 0 012.25 2.25V12" />
                  </svg>
                </div>
              </div>

              {/* Premium branding */}
              <div className="text-center space-y-8">
                <div className="space-y-4">
                  <h2 
                    className="text-4xl md:text-5xl font-extralight text-foreground tracking-wide"
                    style={{ animation: 'fadeInUp 1s ease-out 0.5s both' }}
                  >
                    Pretor AI
                  </h2>

                  <div className="flex items-center justify-center space-x-4">
                    <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent w-20"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent w-20"></div>
                  </div>

                  <p 
                    className="text-xl text-muted-foreground/80 font-light max-w-2xl mx-auto leading-relaxed"
                    style={{ animation: 'fadeInUp 1s ease-out 0.7s both' }}
                  >
                    Processando análise inteligente com múltiplas IAs especializadas
                  </p>
                </div>

                {/* AI Status Indicators */}
                <div 
                  className="flex items-center justify-center space-x-12"
                  style={{ animation: 'fadeInUp 1s ease-out 0.9s both' }}
                >
                  {[
                    { name: "OpenRouter", color: "bg-primary", delay: "0s" },
                    { name: "Groq", color: "bg-yellow-500", delay: "0.5s" },
                    { name: "Cohere", color: "bg-purple-500", delay: "1s" },
                    { name: "Google", color: "bg-blue-500", delay: "1.5s" },
                  ].map((ai, index) => (
                    <div
                      key={index}
                      className="flex flex-col items-center space-y-3"
                    >
                      <div
                        className={`w-4 h-4 ${ai.color} rounded-full animate-pulse shadow-lg`}
                        style={{ animationDelay: ai.delay }}
                      ></div>
                      <span className="text-xs text-muted-foreground/60 font-light tracking-wide">
                        {ai.name}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Progress Animation */}
                <div 
                  className="w-full max-w-md mx-auto space-y-6"
                  style={{ animation: 'fadeInUp 1s ease-out 1.1s both' }}
                >
                  <div className="relative h-1 bg-muted/20 rounded-full overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/50 via-primary to-green-500 rounded-full animate-pulse"></div>
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-1/3 h-full rounded-full"
                      style={{ animation: 'shimmer 2s infinite' }}
                    ></div>
                  </div>

                  {/* Status text */}
                  <div className="flex items-center justify-center space-x-2 text-muted-foreground/60">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-light">Processamento seguro e transparente</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tela 5: Resultados da Análise - Premium Style */}
        {currentScreen === ScreenState.ANALYSIS_RESULTS &&
          analysisData &&
          !isLoading && (
            <div className="min-h-[80vh] gradient-bg relative overflow-hidden">
              {/* Background decorative elements */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-10 w-44 h-44 bg-primary/3 rounded-full blur-3xl animate-float"></div>
                <div className="absolute bottom-1/4 right-10 w-36 h-36 bg-green-500/3 rounded-full blur-2xl animate-float" style={{ animationDelay: '-2s' }}></div>
              </div>

              <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 space-y-10" style={{ animation: 'fadeInUp 0.8s ease-out' }}>
                {/* Premium Header */}
                <div className="flex items-center justify-between mb-12">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-3xl font-extralight text-foreground tracking-wide">
                          {translations.analysisResults}
                        </h2>
                        <p className="text-muted-foreground/80 font-light text-lg">
                          {translations.comprehensiveAnalysis}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowSources(true)}
                      className="flex items-center space-x-2 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 hover:border-blue-500/30 transition-all duration-300 rounded-xl px-6 py-3 group"
                    >
                      <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span className="font-medium">Verificar Fontes</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => startTransition(() => goBackToPromptInput())}
                      className="flex items-center space-x-2 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 rounded-xl px-6 py-3 group"
                    >
                      <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span className="font-medium">Nova Análise</span>
                    </Button>
                  </div>
                </div>

                {/* Original Prompt Card */}
                <div className="relative premium-card glass-effect mb-10">
                  <div className="bg-card/90 backdrop-blur-xl border border-border/30 rounded-3xl p-8 shadow-xl">
                    <div className="absolute inset-0 rounded-3xl opacity-20 bg-gradient-to-br from-green-500/20 via-transparent to-primary/10"></div>

                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-green-500/20 to-green-500/10 rounded-2xl flex items-center justify-center">
                          <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-foreground">{translations.originalQuote}</h3>
                          <p className="text-muted-foreground/70 font-light">Sua consulta inicial</p>
                        </div>
                      </div>

                      <div className="bg-muted/20 backdrop-blur-sm rounded-2xl p-6 border border-border/30">
                        <p className="text-foreground leading-relaxed font-light text-lg italic">
                          "{selectedPrompt || prompt}"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Synthesis Card */}
                <div className="relative premium-card glass-effect mb-10">
                  <div className="bg-card/90 backdrop-blur-xl border border-border/30 rounded-3xl p-8 shadow-xl">
                    <div className="absolute inset-0 rounded-3xl opacity-20 bg-gradient-to-br from-primary/20 via-transparent to-blue-500/10"></div>

                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center">
                          <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-foreground">{translations.intelligentSynthesis}</h3>
                          <p className="text-muted-foreground/70 font-light">Análise consolidada das múltiplas IAs</p>
                        </div>
                      </div>

                      <div className="bg-muted/20 backdrop-blur-sm rounded-2xl p-6 border border-border/30">
                        {analysisData.llamaAnalysis ? (
                          <div className="prose prose-sm max-w-none text-foreground">
                            <div className="whitespace-pre-wrap font-light leading-relaxed">
                              {analysisData.llamaAnalysis.content}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <svg className="w-8 h-8 text-yellow-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <p className="text-muted-foreground font-light">
                              Síntese não disponível
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Individual AI Responses */}
                <div className="relative premium-card glass-effect">
                  <div className="bg-card/90 backdrop-blur-xl border border-border/30 rounded-3xl p-8 shadow-xl">
                    <div className="absolute inset-0 rounded-3xl opacity-20 bg-gradient-to-br from-purple-500/20 via-transparent to-orange-500/10"></div>

                    <div className="relative z-10">
                      <IndividualResponses
                        responses={analysisData.responses || {}}
                      />
                    </div>
                  </div>
                </div>

                {/* Sources Modal */}
                <SourcesModal
                  isOpen={showSources}
                  onClose={() => setShowSources(false)}
                  responses={analysisData.responses || {}}
                />
              </div>
            </div>
          )}

        {/* Tela de Chat */}
        {currentScreen === ScreenState.CHAT_MODE && (
          <div className="h-screen">
            <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><div className="text-muted-foreground">Carregando chat...</div></div>}>
              <ChatMode onBack={() => startTransition(() => setCurrentScreen(ScreenState.MODE_SELECTION))} />
            </Suspense>
          </div>
        )}

        {/* Image Search Mode */}
        {currentScreen === ScreenState.IMAGE_SEARCH_MODE && (
          <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><div className="text-muted-foreground">Carregando busca por imagem...</div></div>}>
            <ImageSearchMode onBack={() => startTransition(() => setCurrentScreen(ScreenState.MODE_SELECTION))} />
          </Suspense>
        )}

        {/* Collaborative AI Mode */}
        {currentScreen === ScreenState.COLLABORATIVE_AI_MODE && (
          <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><div className="text-muted-foreground">Carregando modo colaborativo...</div></div>}>
            <CollaborativeAIMode onBack={() => startTransition(() => setCurrentScreen(ScreenState.MODE_SELECTION))} />
          </Suspense>
        )}
      </main>
    </div>
  );
}