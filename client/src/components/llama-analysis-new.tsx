
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertTriangle, Eye, FileText } from 'lucide-react';

interface AnalysisData {
  promptId: number;
  responses: {
    [key: string]: {
      content: string;
      error?: string;
      responseTime?: number;
      tokens?: number;
    };
  };
  llamaAnalysis?: {
    content: string;
    responseTime?: number;
    tokens?: number;
    error?: string;
  };
}

interface LlamaAnalysisNewProps {
  analysisData: AnalysisData;
  onShowSources?: () => void;
}

export function LlamaAnalysisNew({ analysisData, onShowSources }: LlamaAnalysisNewProps) {
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performAnalysis = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/llama-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(analysisData),
        });

        if (!response.ok) {
          throw new Error(`Analysis failed: ${response.statusText}`);
        }

        const data = await response.json();
        setAnalysis(data.analysis || 'No analysis available');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Analysis failed');
      } finally {
        setIsLoading(false);
      }
    };

    if (analysisData) {
      performAnalysis();
    }
  }, [analysisData]);

  const renderSafeMarkdown = (text: string): React.ReactNode[] =>
    text.split('\n').flatMap((line, lineIdx) => {
      const nodes: React.ReactNode[] = lineIdx > 0 ? [<br key={`br-${lineIdx}`} />] : [];
      line.split(/(\*\*[^*]+\*\*)/).forEach((part, partIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          nodes.push(<strong key={`${lineIdx}-${partIdx}`}>{part.slice(2, -2)}</strong>);
        } else if (part) {
          nodes.push(part);
        }
      });
      return nodes;
    });

  const formatAnalysisContent = (content: string) => {
    const sections = content.split(/(?=(?:1\.\s*\*\*Convergences|2\.\s*\*\*Divergences|3\.\s*\*\*Points of Attention|4\.\s*\*\*Sources))/);
    
    return sections.map((section, index) => {
      if (section.trim() === '') return null;

      // Check which section this is
      let sectionType = '';
      let icon = null;
      let title = '';
      
      if (section.includes('**Convergences') || section.includes('**Convergências')) {
        sectionType = 'convergences';
        icon = <CheckCircle className="w-5 h-5 text-green-600" />;
        title = 'Convergences';
      } else if (section.includes('**Divergences') || section.includes('**Divergências')) {
        sectionType = 'divergences';
        icon = <AlertTriangle className="w-5 h-5 text-amber-600" />;
        title = 'Divergences';
      } else if (section.includes('**Points of Attention') || section.includes('**Pontos de Atenção')) {
        sectionType = 'attention';
        icon = <Eye className="w-5 h-5 text-blue-600" />;
        title = 'Points of Attention';
      } else if (section.includes('**Sources') || section.includes('**Fontes')) {
        sectionType = 'sources';
        icon = <FileText className="w-5 h-5 text-purple-600" />;
        title = 'Sources';
      }

      if (sectionType) {
        const content = section.replace(/^\d+\.\s*\*\*[^*]+\*\*:?\s*/, '').trim();
        
        return (
          <div key={index} className="mb-6">
            {index > 0 && (
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gradient-to-r from-transparent via-primary/40 to-transparent"></div>
                </div>
                <div className="relative flex justify-center">
                  <div className="bg-background px-4">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                  </div>
                </div>
              </div>
            )}
            
            <Card className={`
              ${sectionType === 'convergences' ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' : ''}
              ${sectionType === 'divergences' ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20' : ''}
              ${sectionType === 'attention' ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20' : ''}
              ${sectionType === 'sources' ? 'border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20' : ''}
              shadow-sm
            `}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {icon}
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div>{renderSafeMarkdown(content)}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }

      // For content that doesn't match specific sections
      if (index === 0 && !sectionType) {
        return (
          <div key={index} className="mb-6">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div>{renderSafeMarkdown(section)}</div>
            </div>
          </div>
        );
      }

      return null;
    }).filter(Boolean);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          <span className="text-sm text-muted-foreground">Generating synthesis...</span>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse"></div>
          <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-muted rounded animate-pulse w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Analysis Error</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          <CheckCircle className="w-3 h-3 mr-1" />
          Analysis Complete
        </Badge>
      </div>
      
      <div className="space-y-6">
        {formatAnalysisContent(analysis)}
      </div>
    </div>
  );
}
