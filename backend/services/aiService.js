const axios = require('axios');

function allowAiMockFallback() {
  if (process.env.ALLOW_AI_MOCK_FALLBACK !== undefined) {
    return process.env.ALLOW_AI_MOCK_FALLBACK === 'true';
  }

  return !['production', 'staging'].includes(process.env.NODE_ENV);
}

// AI Service for case classification and analysis
class AIService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.azureOpenaiEndpoint = process.env.AZURE_OPENAI_ENDPOINT || process.env.AZURE_AI_ENDPOINT;
    this.azureOpenaiKey = process.env.AZURE_OPENAI_KEY || process.env.AZURE_AI_KEY;
    this.deploymentName =
      process.env.AZURE_OPENAI_DEPLOYMENT ||
      process.env.AZURE_AI_DEPLOYMENT ||
      'gpt-4o-mini';
    this.openaiBaseUrl = process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1';
    this.requestTimeoutMs = Number(process.env.AI_REQUEST_TIMEOUT_MS || 30000);
    this.allowMockFallback = allowAiMockFallback();

    // Determine which AI provider to use
    this.provider = this.getAIProvider();
  }

  getAIProvider() {
    if (this.azureOpenaiEndpoint && this.azureOpenaiKey) {
      return 'azure';
    } else if (this.openaiApiKey) {
      return 'openai';
    } else {
      console.warn('No AI provider configured. Using mock classification.');
      return 'mock';
    }
  }

  async classifyCase(description, options = {}) {
    try {
      const {
        model = 'gpt-4o-mini',
        temperature = 0.3,
        maxTokens = 150
      } = options;

      await this.maybeInjectChaosFailure();

      const prompt = this.buildClassificationPrompt(description);

      switch (this.provider) {
        case 'azure':
          return await this.classifyWithAzureOpenAI(prompt, { temperature, maxTokens });
        case 'openai':
          return await this.classifyWithOpenAI(prompt, { model, temperature, maxTokens });
        default:
          return await this.mockClassification(description);
      }
    } catch (error) {
      console.error('AI classification error:', error);
      if (!this.allowMockFallback) {
        throw error;
      }

      return await this.mockClassification(description);
    }
  }

  async maybeInjectChaosFailure() {
    const chaosMode = process.env.CHAOS_AI_FAILURE_MODE;
    if (!chaosMode) {
      return;
    }

    if (chaosMode === 'timeout') {
      await new Promise((resolve) => setTimeout(resolve, this.requestTimeoutMs + 1000));
      throw new Error('Injected AI timeout for chaos validation');
    }

    if (chaosMode === 'error') {
      throw new Error('Injected AI provider failure for chaos validation');
    }
  }

  buildClassificationPrompt(description) {
    return `Analyze this consumer complaint and classify it according to Indian consumer protection standards:

Complaint: "${description}"

Please provide a JSON response with the following structure:
{
  "category": "Banking|Telecom|Insurance|E-Commerce|Other",
  "severity": "High|Medium|Low",
  "confidence": 0.0-1.0,
  "keyIssues": ["issue1", "issue2"],
  "suggestedAction": "brief statutory recommendation",
  "relevantLaws": ["Section 2(11) Deficiency", "Section 2(47) Unfair Practice"],
  "statutoryGrounds": "Deficiency in Service | Unfair Trade Practice | Restricted Trade Practice",
  "limitationPeriod": "2 years from cause of action"
}

Consider:
- Banking: Account issues, transactions, loans, cards
- Telecom: Phone services, internet, billing
- Insurance: Claims, policies, coverage
- E-Commerce: Online shopping, delivery, refunds
- Other: Everything else

Severity based on:
- High: Financial loss > ₹10,000, data breach, systemic issues
- Medium: Financial loss ₹1,000-₹10,000, service disruption
- Low: Minor inconvenience, informational issues`;
  }

  async classifyWithAzureOpenAI(prompt, options) {
    const response = await axios.post(
      `${this.azureOpenaiEndpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=2023-12-01-preview`,
      {
        messages: [
          { role: 'system', content: 'You are an expert in Indian consumer protection law. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'api-key': this.azureOpenaiKey,
          'Content-Type': 'application/json'
        },
        timeout: this.requestTimeoutMs
      }
    );

    const content = response.data.choices[0].message.content;
    return JSON.parse(content);
  }

  async classifyWithOpenAI(prompt, options) {
    const response = await axios.post(
      `${this.openaiBaseUrl}/chat/completions`,
      {
        model: options.model,
        messages: [
          { role: 'system', content: 'You are an expert in Indian consumer protection law. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.requestTimeoutMs
      }
    );

    const content = response.data.choices[0].message.content;
    return JSON.parse(content);
  }

  async getDeterministicClassification(description) {
    const lowerDesc = description.toLowerCase();
    
    // Policy Matrix for Indian Consumer Protection Standards
    const policies = {
      Banking: {
        keywords: ['bank', 'account', 'transaction', 'atm', 'card', 'loan', 'interest', 'cheque', 'branch'],
        highSeverity: ['fraud', 'unauthorized', 'hack', 'stolen', 'missing funds'],
        laws: ['Consumer Protection Act, 2019', 'RBI Banking Ombudsman Scheme', 'Banking Regulation Act, 1949'],
        defaultAction: 'Financial audit and dispute resolution initiated.'
      },
      Telecom: {
        keywords: ['telecom', 'phone', 'mobile', 'internet', 'broadband', 'call', 'data', 'network', 'signal'],
        highSeverity: ['no service', 'emergency', 'blackout', 'privacy breach'],
        laws: ['Consumer Protection Act, 2019', 'TRAI Quality of Service Regulations'],
        defaultAction: 'Technical service audit and billing verification.'
      },
      Insurance: {
        keywords: ['insurance', 'policy', 'claim', 'premium', 'coverage', 'agent', 'renewal', 'nominee'],
        highSeverity: ['medical', 'accident', 'death', 'denial', 'critical'],
        laws: ['Consumer Protection Act, 2019', 'Insurance Act, 1938', 'IRDAI Regulations'],
        defaultAction: 'Claim integrity review and policy term validation.'
      },
      ECommerce: {
        keywords: ['e-commerce', 'online', 'shopping', 'delivery', 'refund', 'product', 'seller', 'order'],
        highSeverity: ['fake', 'counterfeit', 'not delivered', 'stolen package'],
        laws: ['Consumer Protection Act, 2019', 'E-Commerce Rules, 2020'],
        defaultAction: 'Vendor investigation and refund/replacement processing.'
      }
    };

    let bestMatch = 'Other';
    let maxWeight = 0;
    
    // Identify Category using weighted keyword matching
    for (const [category, policy] of Object.entries(policies)) {
      const weight = policy.keywords.reduce((count, kw) => 
        count + (lowerDesc.includes(kw) ? 1 : 0), 0);
      
      if (weight > maxWeight) {
        maxWeight = weight;
        bestMatch = category;
      }
    }

    const result = {
      category: bestMatch,
      severity: 'Low',
      confidence: 0.85, // Deterministic high confidence for rule-based matching
      keyIssues: [],
      suggestedAction: 'Review and response scheduled within statutory 30-day window.',
      relevantLaws: ['Consumer Protection Act, 2019']
    };

    if (bestMatch !== 'Other') {
      const policy = policies[bestMatch];
      result.relevantLaws = policy.laws;
      result.suggestedAction = policy.defaultAction;
      
      // Determine Severity
      const isHigh = (policy.highSeverity || []).some(kw => lowerDesc.includes(kw));
      if (isHigh) {
        result.severity = 'High';
        result.confidence = 0.95;
        result.suggestedAction = `Priority resolution: ${policy.defaultAction}`;
      } else if (maxWeight > 2) {
        result.severity = 'Medium';
      }

      // Extract identified issues
      result.keyIssues = policy.keywords.filter(kw => lowerDesc.includes(kw));
    }

    return result;
  }

  async mockClassification(description) {
    // Legacy mapping replaced by Deterministic Policy Engine
    return this.getDeterministicClassification(description);
  }

  async analyzeSentiment(text) {
    // Future enhancement: Sentiment analysis for complaint severity
    return { sentiment: 'neutral', score: 0.5 };
  }

  async extractEntities(text) {
    // Future enhancement: Named entity recognition
    return { entities: [] };
  }
}

module.exports = new AIService();
