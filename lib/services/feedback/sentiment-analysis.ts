/**
 * Sentiment Analysis Service
 * Analyzes feedback sentiment using ML or rule-based approach
 */

export interface SentimentResult {
  sentiment: "positive" | "neutral" | "negative";
  score: number; // -1 to 1
  confidence: number; // 0 to 1
  keywords: string[];
  topics: string[];
}

export class SentimentAnalysisService {
  /**
   * Analyze sentiment of text
   */
  async analyzeSentiment(text: string): Promise<SentimentResult> {
    // In production, this would use an ML service (e.g., AWS Comprehend, Google Cloud NLP)
    // For now, use rule-based approach

    const lowerText = text.toLowerCase();

    // Positive indicators
    const positivePatterns = [
      /\b(good|great|excellent|amazing|wonderful|fantastic|happy|satisfied|pleased|helpful|thank|appreciate)\b/gi,
      /\b(love|enjoy|recommend|perfect|outstanding)\b/gi,
    ];

    // Negative indicators
    const negativePatterns = [
      /\b(bad|poor|terrible|awful|horrible|disappointed|unhappy|dissatisfied|problem|issue|complaint|frustrated|angry)\b/gi,
      /\b(worst|hate|disgusting|unacceptable|broken|failed)\b/gi,
    ];

    let positiveScore = 0;
    let negativeScore = 0;
    const keywords: string[] = [];

    // Count positive matches
    positivePatterns.forEach((pattern) => {
      const matches = lowerText.match(pattern);
      if (matches) {
        positiveScore += matches.length;
        keywords.push(...matches);
      }
    });

    // Count negative matches
    negativePatterns.forEach((pattern) => {
      const matches = lowerText.match(pattern);
      if (matches) {
        negativeScore += matches.length;
        keywords.push(...matches);
      }
    });

    // Calculate sentiment score (-1 to 1)
    const total = positiveScore + negativeScore;
    const score = total > 0
      ? (positiveScore - negativeScore) / total
      : 0;

    // Determine sentiment
    let sentiment: "positive" | "neutral" | "negative";
    if (score > 0.2) {
      sentiment = "positive";
    } else if (score < -0.2) {
      sentiment = "negative";
    } else {
      sentiment = "neutral";
    }

    // Extract topics (simplified)
    const topics = this.extractTopics(lowerText);

    return {
      sentiment,
      score,
      confidence: Math.min(1, Math.abs(score) + 0.3), // Base confidence
      keywords: [...new Set(keywords)],
      topics,
    };
  }

  /**
   * Extract topics from text
   */
  private extractTopics(text: string): string[] {
    const topicKeywords: Record<string, string[]> = {
      service: ["service", "care", "support", "help"],
      worker: ["worker", "staff", "carer", "support worker"],
      communication: ["communication", "contact", "respond", "reply"],
      quality: ["quality", "standard", "professional"],
      accessibility: ["accessible", "access", "wheelchair", "mobility"],
      payment: ["payment", "billing", "invoice", "cost"],
    };

    const topics: string[] = [];

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some((keyword) => text.includes(keyword))) {
        topics.push(topic);
      }
    });

    return topics;
  }

  /**
   * Batch analyze multiple feedback items
   */
  async batchAnalyze(texts: string[]): Promise<SentimentResult[]> {
    return Promise.all(texts.map((text) => this.analyzeSentiment(text)));
  }
}
