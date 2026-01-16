/**
 * Payment Service
 * Processes service purchases, validates rules, and executes blockchain transactions
 */

import { prisma } from "@/lib/prisma";
import { ValidationService } from "./validation-service";
import { TokenService } from "./token-service";
import { PaymentProviderService } from "./banking/payment-provider";
import type { BlockchainAdapterConfig } from "./types";

export interface InitiatePaymentData {
  participantId: string;
  providerId: string;
  serviceCode: string;
  serviceDescription?: string;
  amount: number;
  categoryId: string;
  voucherId?: string; // Optional: use specific token voucher
  workerId?: string; // Optional: worker ID if worker is involved in service delivery
  paymentMethod?: "blockchain" | "coinbase" | "npp" | "stripe" | "paypal"; // Payment method preference
  coinbaseRedirectUrl?: string; // For Coinbase payments
  coinbaseCancelUrl?: string; // For Coinbase payments
  stripeEmail?: string; // For Stripe payments
  stripePhone?: string; // For Stripe payments (SMS verification)
  paypalReturnUrl?: string; // For PayPal payments
  paypalCancelUrl?: string; // For PayPal payments
}

export class PaymentService {
  private validationService: ValidationService;
  private tokenService: TokenService;
  private paymentProviderService?: PaymentProviderService;

  constructor(
    blockchainConfig: BlockchainAdapterConfig,
    paymentProviderConfig?: {
      provider?: "coinbase" | "npp" | "stripe" | "paypal";
      coinbaseConfig?: {
        apiKey?: string;
        apiSecret?: string;
        apiUrl?: string;
        webhookSecret?: string;
      };
      nppConfig?: {
        apiUrl?: string;
        apiKey?: string;
        merchantId?: string;
      };
      stripeConfig?: {
        apiKey?: string;
        webhookSecret?: string;
      };
      paypalConfig?: {
        clientId?: string;
        clientSecret?: string;
        environment?: "sandbox" | "production";
        webhookId?: string;
      };
    }
  ) {
    this.validationService = new ValidationService();
    this.tokenService = new TokenService(blockchainConfig);
    
    if (paymentProviderConfig) {
      this.paymentProviderService = new PaymentProviderService({
        provider: paymentProviderConfig.provider || "coinbase",
        coinbaseConfig: paymentProviderConfig.coinbaseConfig,
        nppConfig: paymentProviderConfig.nppConfig,
        stripeConfig: paymentProviderConfig.stripeConfig,
        paypalConfig: paymentProviderConfig.paypalConfig,
      });
    }
  }

  /**
   * Initiate a payment request
   */
  async initiatePayment(data: InitiatePaymentData) {
    const {
      participantId,
      providerId,
      serviceCode,
      serviceDescription,
      amount,
      categoryId,
      voucherId,
    } = data;

    // Get plan from participant
    const plan = await prisma.nDISPlan.findUnique({
      where: { participantId },
      include: {
        categories: true,
      },
    });

    if (!plan) {
      throw new Error("Participant does not have an active plan");
    }

    // Get category
    const category = plan.categories.find((c) => c.id === categoryId);
    if (!category) {
      throw new Error(`Category not found: ${categoryId}`);
    }

    // Validate payment
    const validation = await this.validationService.validatePayment({
      planId: plan.id,
      categoryId,
      providerId,
      serviceCode,
      amount,
      workerId: data.workerId,
    });

    if (!validation.valid) {
      throw new Error(`Payment validation failed: ${validation.errors.join(", ")}`);
    }

    const paymentMethod = data.paymentMethod || "blockchain";

    // Handle Stripe payments
    if (paymentMethod === "stripe") {
      if (!this.paymentProviderService) {
        throw new Error("Payment provider service not configured for Stripe payments");
      }

      if (!data.stripeEmail) {
        throw new Error("Email required for Stripe payments");
      }

      // Create payment transaction first
      const transaction = await prisma.paymentTransaction.create({
        data: {
          planId: plan.id,
          participantId,
          providerId,
          workerId: data.workerId,
          serviceCode,
          serviceDescription: serviceDescription || "",
          amount,
          status: "PENDING",
          validationResult: {
            ...validation,
            paymentMethod: "stripe",
          } as any,
        },
      });

      // Initiate Stripe payment
      const stripePayment = await this.paymentProviderService.initiatePayment(
        {
          amount,
          currency: "AUD",
          description: serviceDescription || `NDIS Payment - ${serviceCode}`,
          reference: transaction.id,
          email: data.stripeEmail,
          phone: data.stripePhone,
          metadata: {
            transactionId: transaction.id,
            planId: plan.id,
            participantId,
            providerId,
            serviceCode,
            categoryId,
          },
        },
        "stripe"
      );

      // Update transaction with Stripe payment intent ID
      const updatedTransaction = await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          blockchainTxHash: stripePayment.paymentId, // Store Stripe payment intent ID
          validationResult: {
            ...validation,
            paymentMethod: "stripe",
            stripePaymentIntentId: stripePayment.paymentId,
            stripeClientSecret: stripePayment.metadata?.clientSecret,
          } as any,
        },
      });

      return {
        ...updatedTransaction,
        stripePayment, // Include Stripe payment details
      };
    }

    // Handle PayPal payments
    if (paymentMethod === "paypal") {
      if (!this.paymentProviderService) {
        throw new Error("Payment provider service not configured for PayPal payments");
      }

      // Create payment transaction first
      const transaction = await prisma.paymentTransaction.create({
        data: {
          planId: plan.id,
          participantId,
          providerId,
          workerId: data.workerId,
          serviceCode,
          serviceDescription: serviceDescription || "",
          amount,
          status: "PENDING",
          validationResult: {
            ...validation,
            paymentMethod: "paypal",
          } as any,
        },
      });

      // Initiate PayPal payment
      const paypalPayment = await this.paymentProviderService.initiatePayment(
        {
          amount,
          currency: "AUD",
          description: serviceDescription || `NDIS Payment - ${serviceCode}`,
          reference: transaction.id,
          metadata: {
            transactionId: transaction.id,
            planId: plan.id,
            participantId,
            providerId,
            serviceCode,
            categoryId,
            returnUrl: data.paypalReturnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?transactionId=${transaction.id}`,
            cancelUrl: data.paypalCancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel?transactionId=${transaction.id}`,
          },
        },
        "paypal"
      );

      // Update transaction with PayPal order ID
      const updatedTransaction = await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          blockchainTxHash: paypalPayment.paymentId, // Store PayPal order ID
          validationResult: {
            ...validation,
            paymentMethod: "paypal",
            paypalOrderId: paypalPayment.paymentId,
            paypalApprovalUrl: paypalPayment.hostedUrl,
          } as any,
        },
      });

      return {
        ...updatedTransaction,
        paypalPayment, // Include PayPal payment details
      };
    }

    // Handle Coinbase payments
    if (paymentMethod === "coinbase") {
      if (!this.paymentProviderService) {
        throw new Error("Payment provider service not configured for Coinbase payments");
      }

      // Create payment transaction first
      const transaction = await prisma.paymentTransaction.create({
        data: {
          planId: plan.id,
          participantId,
          providerId,
          workerId: data.workerId,
          serviceCode,
          serviceDescription: serviceDescription || "",
          amount,
          status: "PENDING",
          validationResult: {
            ...validation,
            paymentMethod: "coinbase",
          } as any,
        },
      });

      // Initiate Coinbase payment
      const coinbasePayment = await this.paymentProviderService.initiatePayment(
        {
          amount,
          currency: "AUD",
          description: serviceDescription || `NDIS Payment - ${serviceCode}`,
          reference: transaction.id,
          redirectUrl: data.coinbaseRedirectUrl,
          cancelUrl: data.coinbaseCancelUrl,
          metadata: {
            transactionId: transaction.id,
            planId: plan.id,
            participantId,
            providerId,
            serviceCode,
            categoryId,
          },
        },
        "coinbase"
      );

      // Update transaction with Coinbase charge ID
      const updatedTransaction = await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          blockchainTxHash: coinbasePayment.paymentId, // Store Coinbase charge ID
          validationResult: {
            ...validation,
            paymentMethod: "coinbase",
            coinbaseChargeId: coinbasePayment.paymentId,
            coinbaseHostedUrl: coinbasePayment.hostedUrl,
            coinbaseCode: coinbasePayment.metadata?.code,
          } as any,
        },
      });

      return {
        ...updatedTransaction,
        coinbasePayment, // Include Coinbase payment details
      };
    }

    // Handle blockchain token payments (default)
    // Check if voucher is provided, otherwise find available voucher
    let voucher;
    if (voucherId) {
      voucher = await prisma.tokenVoucher.findUnique({
        where: { id: voucherId },
      });
      if (!voucher || voucher.categoryId !== categoryId) {
        throw new Error("Invalid voucher for this category");
      }
    } else {
      // Find available voucher for this category
      voucher = await prisma.tokenVoucher.findFirst({
        where: {
          categoryId,
          planId: plan.id,
          status: {
            in: ["MINTED", "ACTIVE"],
          },
          amount: {
            gte: amount,
          },
        },
        orderBy: {
          expiresAt: "asc", // Use soonest expiring first
        },
      });
    }

    if (!voucher) {
      throw new Error("No available token voucher for this payment");
    }

    // Validate voucher rules
    const tokenValidation = await this.tokenService.validateTokenRules(
      voucher.id,
      serviceCode,
      providerId
    );

    if (!tokenValidation.valid) {
      throw new Error(`Token validation failed: ${tokenValidation.reason}`);
    }

    // Create payment transaction
    const transaction = await prisma.paymentTransaction.create({
      data: {
        planId: plan.id,
        participantId,
        providerId,
        workerId: data.workerId,
        voucherId: voucher.id,
        serviceCode,
        serviceDescription: serviceDescription || "",
        amount,
        status: "PENDING",
        validationResult: {
          ...validation,
          paymentMethod: "blockchain",
        } as any,
      },
    });

    return transaction;
  }

  /**
   * Validate a payment transaction before execution
   */
  async validatePayment(transactionId: string) {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
      include: {
        plan: true,
        voucher: {
          include: {
            category: true,
          },
        },
        participant: true,
        provider: true,
      },
    });

    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    if (transaction.status !== "PENDING") {
      throw new Error(`Transaction is not in PENDING status: ${transaction.status}`);
    }

    // Re-validate payment
    const validation = await this.validationService.validatePayment({
      planId: transaction.planId,
      categoryId: transaction.voucher!.categoryId,
      providerId: transaction.providerId,
      serviceCode: transaction.serviceCode,
      amount: Number(transaction.amount),
      workerId: transaction.workerId || undefined,
    });

    // Update validation result
    await prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: {
        validationResult: validation as any,
      },
    });

    return validation;
  }

  /**
   * Execute payment on blockchain
   */
  async executePayment(transactionId: string) {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
      include: {
        voucher: true,
        participant: true,
        provider: true,
      },
    });

    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    if (transaction.status !== "PENDING") {
      throw new Error(`Transaction cannot be executed in status: ${transaction.status}`);
    }

    // Final validation
    const validation = await this.validatePayment(transactionId);
    if (!validation.valid) {
      await prisma.paymentTransaction.update({
        where: { id: transactionId },
        data: {
          status: "FAILED",
          validationResult: validation as any,
        },
      });
      throw new Error(`Payment validation failed: ${validation.errors.join(", ")}`);
    }

    try {
      // Update status to PROCESSING
      await prisma.paymentTransaction.update({
        where: { id: transactionId },
        data: { status: "PROCESSING" },
      });

      // Execute blockchain transfer
      // Note: In a real implementation, we'd need participant and provider blockchain addresses
      // For now, we'll use mock addresses
      const participantAddress = `0x${transaction.participantId.substring(0, 40)}`;
      const providerAddress = `0x${transaction.providerId.substring(0, 40)}`;

      const txHash = await this.tokenService.transferToken(
        transaction.voucherId!,
        participantAddress,
        providerAddress,
        Number(transaction.amount)
      );

      // Update transaction with blockchain hash
      const completedTransaction = await prisma.$transaction(async (tx) => {
        // Update transaction
        const updated = await tx.paymentTransaction.update({
          where: { id: transactionId },
          data: {
            status: "COMPLETED",
            blockchainTxHash: txHash,
            completedAt: new Date(),
          },
        });

        // Update voucher status
        const voucherAmount = Number(transaction.voucher!.amount);
        const paymentAmount = Number(transaction.amount);
        const remainingAmount = voucherAmount - paymentAmount;

        if (remainingAmount <= 0) {
          await tx.tokenVoucher.update({
            where: { id: transaction.voucherId! },
            data: {
              status: "SPENT",
              spentAt: new Date(),
            },
          });
        } else {
          await tx.tokenVoucher.update({
            where: { id: transaction.voucherId! },
            data: {
              status: "ACTIVE",
              amount: remainingAmount,
            },
          });
        }

        // Update category spent amount
        await tx.budgetCategory.update({
          where: { id: transaction.voucher!.categoryId },
          data: {
            spentAmount: {
              increment: paymentAmount,
            },
            remainingAmount: {
              decrement: paymentAmount,
            },
          },
        });

        // Update plan remaining budget
        await tx.nDISPlan.update({
          where: { id: transaction.planId },
          data: {
            remainingBudget: {
              decrement: paymentAmount,
            },
          },
        });

        return updated;
      });

      return completedTransaction;
    } catch (error: any) {
      // Mark transaction as failed
      await prisma.paymentTransaction.update({
        where: { id: transactionId },
        data: {
          status: "FAILED",
          validationResult: {
            error: error.message,
          } as any,
        },
      });

      throw error;
    }
  }

  /**
   * Get transaction history for a participant
   */
  async getTransactionHistory(participantId: string) {
    const transactions = await prisma.paymentTransaction.findMany({
      where: { participantId },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        voucher: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return transactions;
  }

  /**
   * Get provider receipts (transactions where provider received payment)
   */
  async getProviderReceipts(providerId: string) {
    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        providerId,
        status: "COMPLETED",
      },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        voucher: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        completedAt: "desc",
      },
    });

    return transactions;
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(transactionId: string) {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
          },
        },
        voucher: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    return transaction;
  }
}
