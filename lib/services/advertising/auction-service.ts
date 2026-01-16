/**
 * Auction Service
 * Handles ad auction logic (first-price and second-price)
 */

import type { ScoredAd, AdSelectionResult } from "./types";
import type { AuctionType } from "@prisma/client";
import { advertisingConfig } from "@/lib/config/advertising";

export class AuctionService {
  /**
   * Run auction on scored ads
   */
  async runAuction(
    scoredAds: ScoredAd[],
    auctionType: AuctionType = "FIRST_PRICE"
  ): Promise<AdSelectionResult> {
    if (scoredAds.length === 0) {
      return {
        advertisement: null,
        winningBid: 0,
        eligibleCount: 0,
        auctionType: auctionType === "FIRST_PRICE" ? "first_price" : "second_price",
      };
    }

    // Sort by effective bid (bid * quality score)
    const sortedAds = [...scoredAds].sort(
      (a, b) => b.effectiveBid - a.effectiveBid
    );

    const winner = sortedAds[0];
    let winningBid = winner.effectiveBid;

    // Second-price auction: winner pays second-highest bid
    if (auctionType === "SECOND_PRICE" && sortedAds.length > 1) {
      winningBid = sortedAds[1].effectiveBid;
    }

    // Apply reserve price
    const reservePrice = advertisingConfig.auction.reservePrice;
    if (winningBid < reservePrice) {
      return {
        advertisement: null,
        winningBid: 0,
        eligibleCount: scoredAds.length,
        auctionType: auctionType === "FIRST_PRICE" ? "first_price" : "second_price",
      };
    }

    return {
      advertisement: winner.advertisement,
      winningBid,
      eligibleCount: scoredAds.length,
      auctionType: auctionType === "FIRST_PRICE" ? "first_price" : "second_price",
      qualityScore: winner.qualityScore,
    };
  }

  /**
   * Calculate effective bid (bid * quality score)
   */
  calculateEffectiveBid(bid: number, qualityScore: number): number {
    return bid * qualityScore;
  }
}
