import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Loader2 } from "lucide-react";
import { AIProgressTracker } from "./ai-progress-tracker";
import { useLanguage } from "@/contexts/language-context";

interface PromptInputProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  responses?: Record<string, any>;
  onAnalysisComplete?: () => void;
}

export function PromptInput({ 
  prompt, 
  onPromptChange, 
  onSubmit, 
  isLoading, 
  responses = {},
  onAnalysisComplete 
}: PromptInputProps) {
  const { translations } = useLanguage();
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (prompt.trim().length >= 10 && !isLoading) {
        onSubmit();
      }
    }
  };

  const canSubmit = prompt.trim().length >= 10 && !isLoading;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={translations.promptPlaceholder}
          className="min-h-[120px] resize-none pr-16 text-base leading-relaxed"
          disabled={isLoading}
        />
        <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
          {prompt.length}/10 {translations.minCharacters}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+Enter</kbd> to submit
        </div>
        <Button 
          onClick={onSubmit}
          disabled={!canSubmit}
          className="min-w-[120px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {translations.processing}...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              {translations.analyzeButton}
            </>
          )}
        </Button>
      </div>

      {/* Progress Tracker */}
      {isLoading && (
        <AIProgressTracker 
          isAnalyzing={isLoading}
          responses={responses}
          onComplete={onAnalysisComplete}
        />
      )}
    </div>
  );
}