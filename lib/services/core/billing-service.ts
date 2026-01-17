/**
 * MapAble Core - Centralized Billing Service
 * Manages invoices, payments, and billing across all MapAble services
 */

import { PrismaClient, Invoice, InvoiceStatus, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface CreateInvoiceInput {
  userId: string;
  subscriptionId?: string;
  amount: number;
  taxAmount?: number;
  currency?: string;
  dueDate: Date;
  lineItems: InvoiceLineItem[];
  metadata?: Record<string, unknown>;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  serviceType?: string;
}

export interface PaymentInput {
  invoiceId: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  amount?: number; // Optional override
}

export class BillingService {
  private db: PrismaClient;

  constructor(db: PrismaClient = prisma) {
    this.db = db;
  }

  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const prefix = "INV";
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Create a new invoice
   */
  async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    try {
      const invoiceNumber = await this.generateInvoiceNumber();
      const taxAmount = input.taxAmount ?? 0;
      const totalAmount = input.amount + taxAmount;

      const invoice = await this.db.invoice.create({
        data: {
          invoiceNumber,
          userId: input.userId,
          subscriptionId: input.subscriptionId,
          amount: input.amount,
          taxAmount,
          totalAmount,
          currency: input.currency ?? "AUD",
          dueDate: input.dueDate,
          lineItems: input.lineItems as unknown as Prisma.JsonValue,
          metadata: input.metadata as Prisma.JsonValue,
          status: InvoiceStatus.DRAFT,
        },
      });

      logger.info("Invoice created", { invoiceId: invoice.id, invoiceNumber });
      return invoice;
    } catch (error) {
      logger.error("Failed to create invoice", error);
      throw error;
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    return this.db.invoice.findUnique({
      where: { id: invoiceId },
    });
  }

  /**
   * Get invoice by invoice number
   */
  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | null> {
    return this.db.invoice.findUnique({
      where: { invoiceNumber },
    });
  }

  /**
   * Get all invoices for a user
   */
  async getUserInvoices(
    userId: string,
    options?: {
      status?: InvoiceStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<Invoice[]> {
    return this.db.invoice.findMany({
      where: {
        userId,
        ...(options?.status && { status: options.status }),
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit,
      skip: options?.offset,
    });
  }

  /**
   * Record payment for an invoice
   */
  async recordPayment(input: PaymentInput): Promise<Invoice> {
    try {
      const invoice = await this.getInvoice(input.invoiceId);
      if (!invoice) {
        throw new Error("Invoice not found");
      }

      if (invoice.status === InvoiceStatus.PAID) {
        throw new Error("Invoice already paid");
      }

      const paymentAmount = input.amount ?? invoice.totalAmount;

      const updatedInvoice = await this.db.invoice.update({
        where: { id: input.invoiceId },
        data: {
          status: InvoiceStatus.PAID,
          paidAt: new Date(),
          paymentMethod: input.paymentMethod,
          paymentReference: input.paymentReference,
        },
      });

      logger.info("Payment recorded", {
        invoiceId: invoice.id,
        amount: paymentAmount,
        method: input.paymentMethod,
      });

      return updatedInvoice;
    } catch (error) {
      logger.error("Failed to record payment", error);
      throw error;
    }
  }

  /**
   * Mark invoice as overdue
   */
  async markOverdue(invoiceId: string): Promise<Invoice> {
    const invoice = await this.getInvoice(invoiceId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.status !== InvoiceStatus.PENDING) {
      return invoice;
    }

    return this.db.invoice.update({
      where: { id: invoiceId },
      data: { status: InvoiceStatus.OVERDUE },
    });
  }

  /**
   * Get invoices that are overdue
   */
  async getOverdueInvoices(): Promise<Invoice[]> {
    return this.db.invoice.findMany({
      where: {
        status: InvoiceStatus.OVERDUE,
        dueDate: { lt: new Date() },
      },
    });
  }

  /**
   * Get billing summary for a user
   */
  async getBillingSummary(userId: string) {
    const [totalInvoices, paidInvoices, pendingInvoices, overdueInvoices] =
      await Promise.all([
        this.db.invoice.count({ where: { userId } }),
        this.db.invoice.count({
          where: { userId, status: InvoiceStatus.PAID },
        }),
        this.db.invoice.count({
          where: { userId, status: InvoiceStatus.PENDING },
        }),
        this.db.invoice.count({
          where: { userId, status: InvoiceStatus.OVERDUE },
        }),
      ]);

    const [totalPaid, totalPending, totalOverdue] = await Promise.all([
      this.db.invoice.aggregate({
        where: { userId, status: InvoiceStatus.PAID },
        _sum: { totalAmount: true },
      }),
      this.db.invoice.aggregate({
        where: { userId, status: InvoiceStatus.PENDING },
        _sum: { totalAmount: true },
      }),
      this.db.invoice.aggregate({
        where: { userId, status: InvoiceStatus.OVERDUE },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      totalPaid: totalPaid._sum.totalAmount ?? 0,
      totalPending: totalPending._sum.totalAmount ?? 0,
      totalOverdue: totalOverdue._sum.totalAmount ?? 0,
    };
  }
}

// Export singleton instance
export const billingService = new BillingService();
