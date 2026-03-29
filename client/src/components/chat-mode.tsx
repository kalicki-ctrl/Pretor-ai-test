import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ArrowLeft, Send, MessageCircle, Bot } from 'lucide-react';
import { useLanguage } from '../contexts/language-context';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';


interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  aiProvider?: string;
  timestamp: Date;
}

interface ChatModeProps {
  onBack: () => void;
}

interface AIResponse {
  content: string;
  responseTime: number;
  tokens?: number;
  error?: string;
}

const AI_PROVIDERS = [
  { id: 'openrouter', name: 'OpenRouter', logo: '🚀', color: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' },
  { id: 'groq', name: 'Groq', logo: '⚡', color: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300' },
  { id: 'cohere', name: 'Cohere', logo: '🧠', color: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' },
  { id: 'google', name: 'Gemini', logo: '💎', color: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' }
];

export function ChatMode({ onBack }: ChatModeProps) {
  const { translations } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingResponses, setPendingResponses] = useState<Record<string, AIResponse>>({});
  const [showAISelection, setShowAISelection] = useState(false);
  const [lastUserMessageIndex, setLastUserMessageIndex] = useState<number | null>(null);
  const [selectedAIResponse, setSelectedAIResponse] = useState<string | null>(null);

  const MAX_CONTEXT_CHARS = 3000;

  const buildConversationContext = (): string => {
    if (messages.length === 0) return '';

    const lines = messages
      .filter(msg => msg.role === 'user' || (msg.role === 'ai' && msg.content))
      .map(msg =>
        msg.role === 'user'
          ? `Usuário: ${msg.content}`
          : `Assistente (${msg.aiProvider}): ${msg.content}`
      );

    // Drop oldest messages first to stay within the character budget
    let context = lines.join('\n\n');
    while (context.length > MAX_CONTEXT_CHARS && lines.length > 1) {
      lines.shift();
      context = lines.join('\n\n');
    }

    return context ? `Contexto da conversa anterior:\n${context}\n\nNova pergunta: ` : '';
  };

  const handleSendMessage = async () => {
    if (!currentPrompt.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: currentPrompt,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setLastUserMessageIndex(newMessages.length - 1);
    setCurrentPrompt('');
    setIsLoading(true);
    setPendingResponses({});
    setShowAISelection(false);
    setSelectedAIResponse(null);

    try {
      const conversationContext = buildConversationContext();
      const fullPrompt = conversationContext + currentPrompt;

      // Chamar todas as 4 IAs
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ 
          message: fullPrompt,
          conversationHistory: messages
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erro na comunicação com o servidor');
      }

      const data = await response.json();
      setPendingResponses(data.responses);
      setShowAISelection(true);
      setSelectedAIResponse(null);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      // Mostrar erro para o usuário
    } finally {
      setIsLoading(false);
    }
  };

  const handleAISelection = (aiId: string) => {
    const response = pendingResponses[aiId];
    if (!response || response.error) return;

    setSelectedAIResponse(aiId);

    // Se já existe uma mensagem de IA para esta pergunta, atualizar; senão, adicionar nova
    setMessages(prev => {
      const lastUserIndex = lastUserMessageIndex;
      if (lastUserIndex === null) return prev;

      // Procurar se já existe uma resposta de IA após a última mensagem do usuário
      const aiMessageIndex = lastUserIndex + 1;
      const hasAIResponse = prev[aiMessageIndex] && prev[aiMessageIndex].role === 'ai';

      const aiMessage: ChatMessage = {
        role: 'ai',
        content: response.content,
        aiProvider: aiId,
        timestamp: new Date()
      };

      if (hasAIResponse) {
        // Substituir a resposta existente
        const newMessages = [...prev];
        newMessages[aiMessageIndex] = aiMessage;
        return newMessages;
      } else {
        // Adicionar nova resposta
        return [...prev, aiMessage];
      }
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAIProvider = (id: string) => {
    return AI_PROVIDERS.find(provider => provider.id === id);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onBack}
                className="hover:bg-muted"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {translations.backButton}
              </Button>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-semibold">{translations.chat}</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card className="h-[calc(100vh-200px)] flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{translations.chatHistory}</p>
                  <p className="text-sm mt-2">Digite sua mensagem abaixo para começar</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div key={index}>
                    <div
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground ml-12'
                            : 'bg-muted mr-12'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                          <span>{formatTime(message.timestamp)}</span>
                          {message.aiProvider && (
                            <Badge variant="secondary" className="text-xs">
                              {getAIProvider(message.aiProvider)?.name || message.aiProvider}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* AI Selection Buttons */}
                    {(showAISelection || (Object.keys(pendingResponses).length > 0 && selectedAIResponse)) && index === lastUserMessageIndex && (
                      <div className="mt-3 flex flex-wrap gap-2 justify-start">
                        <p className="text-sm text-muted-foreground mb-2 w-full">
                          {selectedAIResponse ? 'Alternar entre respostas:' : translations.selectAI + ':'}
                        </p>
                        {AI_PROVIDERS.map(provider => {
                          const response = pendingResponses[provider.id];
                          const hasResponse = response && !response.error;
                          const isSelected = selectedAIResponse === provider.id;
                          
                          return (
                            <Button
                              key={provider.id}
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleAISelection(provider.id)}
                              disabled={!hasResponse}
                              className={`${isSelected ? 'bg-primary text-primary-foreground' : provider.color} ${
                                hasResponse ? 'hover:opacity-80' : 'opacity-50 cursor-not-allowed'
                              } transition-all duration-200`}
                            >
                              <span className="mr-2">{provider.logo}</span>
                              {provider.name}
                              {isSelected && (
                                <span className="ml-2">✓</span>
                              )}
                              {hasResponse && response.responseTime && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  {response.responseTime}ms
                                </Badge>
                              )}
                              {response?.error && (
                                <span className="ml-2 text-red-500">❌</span>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
              
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="bg-muted rounded-lg p-3 mr-12">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                      <span className="text-sm text-muted-foreground">
                        {translations.processing}...
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Textarea
                value={currentPrompt}
                onChange={(e) => setCurrentPrompt(e.target.value)}
                placeholder={translations.sendMessage}
                className="resize-none"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!currentPrompt.trim() || isLoading}
                size="sm"
                className="self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}