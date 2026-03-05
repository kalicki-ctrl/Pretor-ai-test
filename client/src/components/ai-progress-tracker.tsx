import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from "@/contexts/language-context";

interface AIProgressStatus {
  name: string;
  status: 'waiting' | 'processing' | 'success' | 'error';
  responseTime?: number;
  error?: string;
  logo: string;
  color: string;
}

interface AIProgressTrackerProps {
  isAnalyzing: boolean;
  responses: Record<string, any>;
  onComplete?: () => void;
}

const providerConfig = {
  openrouter: {
    name: 'OpenRouter',
    logo: '/attached_assets/Logo_OpenRouter.jpg',
    color: 'bg-accent',
  },
  groq: {
    name: 'Groq',
    logo: '/attached_assets/Logo_Groq.jpg',
    color: 'bg-primary',
  },
  cohere: {
    name: 'Cohere',
    logo: '/attached_assets/Logo_Cohere.jpg',
    color: 'bg-accent/80',
  },
  llama3: {
    name: 'Llama3',
    logo: '/attached_assets/Logo_Groq.jpg',
    color: 'bg-green-500',
  },
};

export function AIProgressTracker({ isAnalyzing, responses, onComplete }: AIProgressTrackerProps) {
  const [aiStatuses, setAiStatuses] = useState<AIProgressStatus[]>([
    {
      name: 'OpenRouter',
      status: 'waiting',
      logo: '/attached_assets/Logo_OpenRouter.jpg',
      color: 'bg-accent',
    },
    {
      name: 'Groq',
      status: 'waiting',
      logo: '/attached_assets/Logo_Groq.jpg',
      color: 'bg-primary',
    },
    {
      name: 'Cohere',
      status: 'waiting',
      logo: '/attached_assets/Logo_Cohere.jpg',
      color: 'bg-accent/80',
    },
    {
      name: 'Llama3',
      status: 'waiting',
      logo: '/attached_assets/Logo_Groq.jpg',
      color: 'bg-green-500',
    }
  ]);
    const { translations } = useLanguage();

  useEffect(() => {
    if (isAnalyzing) {
      // Set all to processing when analysis starts
      setAiStatuses(prev => prev.map(ai => ({ ...ai, status: 'processing' as const })));
    } else {
      // Reset when not analyzing
      setAiStatuses(prev => prev.map(ai => ({ ...ai, status: 'waiting' as const })));
    }
  }, [isAnalyzing]);

  useEffect(() => {
    // Update statuses based on responses
    if (responses && Object.keys(responses).length > 0) {
      setAiStatuses(prev => prev.map(ai => {
        const providerKey = ai.name.toLowerCase().replace(/\s+/g, '');
        const response = responses[providerKey];

        if (response) {
          return {
            ...ai,
            status: response.error ? 'error' : 'success',
            responseTime: response.responseTime,
            error: response.error,
          };
        }
        return ai;
      }));

      // Check if all AIs have completed
      const completedCount = Object.keys(responses).length;
      const totalAIs = aiStatuses.length;

      if (completedCount === totalAIs && onComplete) {
        setTimeout(onComplete, 500); // Small delay for visual effect
      }
    }
  }, [responses, onComplete, aiStatuses.length]);

  const getStatusIcon = (status: AIProgressStatus['status']) => {
    switch (status) {
      case 'waiting':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (ai: AIProgressStatus) => {
    switch (ai.status) {
      case 'waiting':
        return <Badge variant="outline" className="bg-muted text-muted-foreground">{translations.waiting}</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{translations.processing}</Badge>;
      case 'success':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{translations.completed}</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{translations.error}</Badge>;
    }
  };

  const completedCount = aiStatuses.filter(ai => ai.status === 'success' || ai.status === 'error').length;
  const progressPercentage = (completedCount / aiStatuses.length) * 100;

  if (!isAnalyzing && completedCount === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <i className="fas fa-brain text-primary mr-3"></i>
            {translations.analysisProgress}
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            {completedCount}/{aiStatuses.length} {translations.completedText}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{translations.overallProgress}</span>
            <span className="text-primary font-medium">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Individual AI Status */}
        <div className="space-y-3">
          {aiStatuses.map((ai, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-border bg-white">
                  <img 
                    src={ai.logo}
                    alt={`${ai.name} Logo`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-medium text-sm">{ai.name}</div>
                  {ai.error && (
                    <div className="text-xs text-red-500">{ai.error}</div>
                  )}
                  {ai.responseTime && (
                    <div className="text-xs text-muted-foreground">
                      {translations.responseTime}: {(ai.responseTime / 1000).toFixed(1)}s
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(ai.status)}
                {getStatusBadge(ai)}
              </div>
            </div>
          ))}
        </div>

        {/* Synthesis Status */}
        {completedCount === aiStatuses.length && isAnalyzing && (
          <div className="mt-4 p-3 bg-accent/10 border border-accent/20 rounded-lg">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-4 w-4 text-accent animate-spin" />
              <div>
                <div className="font-medium text-sm text-accent">{translations.generatingSynthesis}</div>
                <div className="text-xs text-muted-foreground">
                  {translations.synthesisAnalysis}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}