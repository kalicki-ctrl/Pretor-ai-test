export interface Translations {
  // Header and navigation
  title: string;
  subtitle: string;
  description: string;
  
  // Prompt input
  promptPlaceholder: string;
  analyzeButton: string;
  typePrompt: string;
  promptDescription: string;
  
  // Analysis status
  analysisProgress: string;
  connecting: string;
  processing: string;
  completed: string;
  waiting: string;
  
  // Ais responses
  aiResponses: string;
  responseTime: string;
  tokens: string;
  
  // Buttons and actions
  viewSources: string;
  copyResponse: string;
  showMore: string;
  showLess: string;
  backButton: string;
  startAnalysisButton: string;
  startChatButton: string;
  analysisImageButton: string;
  startCollaborationButton: string;
  
  // Errors messages 
  errorOccurred: string;
  error: string;
  
  // Validation
  minCharacters: string;
  
  // New modes
  deepSearch: string;
  chat: string;
  imageSearch: string;
  deepSearchDescription: string;
  chatDescription: string;
  imageSearchDescription: string;
  selectMode: string;
  chatHistory: string;
  attachImage: string;
  fromClipboard: string;
  fromDevice: string;
  sendMessage: string;
  selectAI: string;
  
  // Specific interface
  secureAPIs: string;
  
  // Synthesis
  synthesisAnalysis: string;
  generatingSynthesis: string;
  overallProgress: string;
  completedText: string;
  
  // Specific interface texts
  selectPrompt: string;
  promptOptions: string;
  originalPrompt: string;
  alternative: string;
  continueToAI: string;
  aiConfiguration: string;
  configureAIWeight: string;
  selectedPrompt: string;
  pretorUnderstanding: string;
  analysisResults: string;
  intelligentSynthesis: string;
  comprehensiveAnalysis: string;
  newAnalysis: string;
  originalQuote: string;
  synthesisNotAvailable: string;
  secureProcessing: string;
  multipleAIs: string;
  premium: string;
}

export const translations: Record<string, Translations> = {
  'pt-BR': {
    title: 'Pretor AI',
    subtitle: 'Análise Inteligente Multiplataforma',
    description: 'Compare respostas de múltiplas IAs e obtenha sínteses inteligentes em uma plataforma premium.',

    promptPlaceholder: 'Digite sua pergunta ou solicitação aqui... (mínimo 10 caracteres)',
    analyzeButton: 'Analisar com IAs',
    typePrompt: 'Digite seu prompt para pesquisa',
    promptDescription: 'Envie sua pergunta ou consulta para análise por múltiplas IAs.',

    analysisProgress: 'Progresso da Análise',
    connecting: 'Conectando',
    processing: 'Processando',
    completed: 'Concluído',
    waiting: 'Aguardando',

    aiResponses: 'Respostas das IAs',
    responseTime: 'Tempo de resposta',
    tokens: 'Tokens',

    viewSources: 'Ver Fontes',
    copyResponse: 'Copiar Resposta',
    showMore: 'Mostrar Mais',
    showLess: 'Mostrar Menos',
    backButton: 'Voltar',
    startAnalysisButton: 'Iniciar Análise',
    startChatButton: 'Iniciar Chat',
    analysisImageButton: 'Análisar Imagem',
    startCollaborationButton: 'Iniciar Colaboração',

    errorOccurred: 'Ocorreu um erro',
    error: 'Erro',

    minCharacters: 'mínimo 10 caracteres',

    deepSearch: 'Pesquisa Profunda',
    chat: 'Chat',
    imageSearch: 'Pesquisa por Imagem',
    deepSearchDescription: 'Análise completa com múltiplas IAs e síntese inteligente',
    chatDescription: 'Conversa interativa com histórico de mensagens',
    imageSearchDescription: 'Análise de imagens com IA avançada',
    selectMode: 'Selecione o modo de análise',
    chatHistory: 'Histórico da conversa',
    attachImage: 'Anexar Imagem',
    fromClipboard: 'Da área de transferência',
    fromDevice: 'Do dispositivo',
    sendMessage: 'Enviar mensagem',
    selectAI: 'Selecionar IA',

    secureAPIs: 'APIs Seguras',

    synthesisAnalysis: 'Análise de Síntese',
    generatingSynthesis: 'Gerando Síntese',
    overallProgress: 'Progresso Geral',
    completedText: 'Concluído',
    
    selectPrompt: 'Selecione seu Prompt',
    promptOptions: 'Opções de Prompt',
    originalPrompt: 'Prompt Original',
    alternative: 'Alternativa',
    continueToAI: 'Continuar para Configuração das IAs',
    aiConfiguration: 'Configuração das IAs',
    configureAIWeight: 'Defina qual IA terá mais peso na síntese final',
    selectedPrompt: 'Prompt Selecionado',
    pretorUnderstanding: 'Compreensão Pretor AI',
    analysisResults: 'Resultados da Análise',
    intelligentSynthesis: 'Síntese Inteligente',
    comprehensiveAnalysis: 'Análise abrangente da Pretor AI',
    newAnalysis: 'Nova Análise',
    originalQuote: 'Prompt Original',
    synthesisNotAvailable: 'Síntese não disponível',
    secureProcessing: 'Processamento seguro',
    multipleAIs: 'Múltiplas IAs',
    premium: 'Premium'
  },
  
  'en-US': {
    title: 'Pretor AI',
    subtitle: 'Intelligent Cross-Platform Analysis',
    description: 'Compare responses from multiple AIs and get intelligent syntheses on a premium platform.',

    promptPlaceholder: 'Enter your question or request here... (minimum 10 characters)',
    analyzeButton: 'Analyze with AIs',
    typePrompt: 'Enter your prompt for research',
    promptDescription: 'Send your question or query for analysis by multiple AIs.',

    analysisProgress: 'Analysis Progress',
    connecting: 'Connecting',
    processing: 'Processing',
    completed: 'Completed',
    waiting: 'Waiting',

    aiResponses: 'AI Responses',
    responseTime: 'Response Time',
    tokens: 'Tokens',

    viewSources: 'View Sources',
    copyResponse: 'Copy Response',
    showMore: 'Show More',
    showLess: 'Show Less',
    backButton: 'Back',
    startAnalysisButton: 'Start Analysis',
    startChatButton: 'Start Chat',
    analysisImageButton: 'Analysis Image',
    startCollaborationButton: 'Start Collaboration',
    
    errorOccurred: 'An error occurred',
    error: 'Error',

    minCharacters: 'minimum 10 characters',

    deepSearch: 'Deep Search',
    chat: 'Chat',
    imageSearch: 'Image Search',
    deepSearchDescription: 'Complete analysis with multiple AIs and intelligent synthesis',
    chatDescription: 'Interactive conversation with message history',
    imageSearchDescription: 'Advanced image analysis with AI',
    selectMode: 'Select analysis mode',
    chatHistory: 'Chat history',
    attachImage: 'Attach Image',
    fromClipboard: 'From clipboard',
    fromDevice: 'From device',
    sendMessage: 'Send message',
    selectAI: 'Select AI',

    secureAPIs: 'Secure APIs',

    synthesisAnalysis: 'Synthesis Analysis',
    generatingSynthesis: 'Generating Synthesis',
    overallProgress: 'Overall Progress',
    completedText: 'Completed',
    
    selectPrompt: 'Select your Prompt',
    promptOptions: 'Prompt Options',
    originalPrompt: 'Original Prompt',
    alternative: 'Alternative',
    continueToAI: 'Continue to AI Configuration',
    aiConfiguration: 'AI Configuration',
    configureAIWeight: 'Define which AI will have more weight in the final synthesis',
    selectedPrompt: 'Selected Prompt',
    pretorUnderstanding: 'Pretor AI Understanding',
    analysisResults: 'Analysis Results',
    intelligentSynthesis: 'Intelligent Synthesis',
    comprehensiveAnalysis: 'Comprehensive analysis by Pretor AI',
    newAnalysis: 'New Analysis',
    originalQuote: 'Original Prompt',
    synthesisNotAvailable: 'Synthesis not available',
    secureProcessing: 'Secure processing',
    multipleAIs: 'Multiple AIs',
    premium: 'Premium'
  }
};

export function getTranslation(language: string): Translations {
  return translations[language] || translations['en-US'];
}