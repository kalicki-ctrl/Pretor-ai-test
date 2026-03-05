import { lazy } from 'react';

// Lazy load components for better performance
export const CollaborativeAIMode = lazy(() => 
  import('@/components/collaborative-ai-mode').then(module => ({ 
    default: module.CollaborativeAIMode 
  }))
);

export const ChatMode = lazy(() => 
  import('@/components/chat-mode').then(module => ({ 
    default: module.ChatMode 
  }))
);

export const ImageSearchMode = lazy(() => 
  import('@/components/image-search-mode').then(module => ({ 
    default: module.ImageSearchMode 
  }))
);

export const IndividualResponses = lazy(() => 
  import('@/components/individual-responses').then(module => ({ 
    default: module.IndividualResponses 
  }))
);

export const LlamaAnalysisNew = lazy(() => 
  import('@/components/llama-analysis-new').then(module => ({ 
    default: module.LlamaAnalysisNew 
  }))
);

export const PromptConfirmation = lazy(() => 
  import('@/components/prompt-confirmation').then(module => ({ 
    default: module.PromptConfirmation 
  }))
);