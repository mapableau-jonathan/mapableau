/**
 * Feedback Service
 * Processes and routes feedback from participants, families, and workers
 */

import { prisma } from "../../prisma";

export interface CreateFeedbackData {
  source: "PARTICIPANT" | "FAMILY" | "WORKER" | "ANONYMOUS";
  participantId?: string;
  workerId?: string;
  category: string;
  feedback: string;
  rating?: number; // 1-5
  anonymous: boolean;
}

export interface ProcessedFeedback {
  id: string;
  source: string;
  category: string;
  feedback: string;
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number; // -1 to 1
  requiresAction: boolean;
  routedTo?: string; // System or user ID
}

export class FeedbackService {
  /**
   * Create feedback
   */
  async createFeedback(data: CreateFeedbackData) {
    // TODO: When Feedback model is added to schema
    // const feedback = await prisma.feedback.create({
    //   data: {
    //     source: data.source,
    //     participantId: data.participantId,
    //     workerId: data.workerId,
    //     category: data.category,
    //     feedback: data.feedback,
    //     rating: data.rating,
    //     anonymous: data.anonymous,
    //     status: "RECEIVED",
    //   },
    // });
    //
    // // Process feedback
    // const processed = await this.processFeedback(feedback);
    //
    // return processed;

    return {
      id: `feedback_${Date.now()}`,
      ...data,
      status: "RECEIVED",
      createdAt: new Date(),
    };
  }

  /**
   * Process feedback (sentiment analysis, routing)
   */
  async processFeedback(feedback: any): Promise<ProcessedFeedback> {
    // Simple sentiment analysis (in production, use ML service)
    const sentiment = this.analyzeSentiment(feedback.feedback);
    const requiresAction = sentiment.sentiment === "negative" || feedback.rating && feedback.rating < 3;

    // Route to complaints system if negative
    if (sentiment.sentiment === "negative" && !feedback.anonymous) {
      // TODO: Create complaint automatically
    }

    return {
      id: feedback.id,
      source: feedback.source,
      category: feedback.category,
      feedback: feedback.feedback,
      sentiment: sentiment.sentiment,
      sentimentScore: sentiment.score,
      requiresAction,
      routedTo: requiresAction ? "complaints-system" : undefined,
    };
  }

  /**
   * Simple sentiment analysis
   */
  private analyzeSentiment(text: string): {
    sentiment: "positive" | "neutral" | "negative";
    score: number;
  } {
    const lowerText = text.toLowerCase();
    const positiveWords = ["good", "great", "excellent", "happy", "satisfied", "helpful", "thank"];
    const negativeWords = ["bad", "poor", "terrible", "unhappy", "dissatisfied", "problem", "issue", "complaint"];

    let score = 0;
    positiveWords.forEach((word) => {
      if (lowerText.includes(word)) score += 0.1;
    });
    negativeWords.forEach((word) => {
      if (lowerText.includes(word)) score -= 0.1;
    });

    if (score > 0.1) return { sentiment: "positive", score };
    if (score < -0.1) return { sentiment: "negative", score };
    return { sentiment: "neutral", score };
  }

  /**
   * Get feedback statistics
   */
  async getFeedbackStatistics() {
    // TODO: Calculate from Feedback model
    return {
      total: 0,
      bySource: {},
      byCategory: {},
      avgRating: 0,
      sentimentDistribution: {
        positive: 0,
        neutral: 0,
        negative: 0,
      },
    };
  }
}
