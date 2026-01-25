/**
 * Analytics Filter
 * Filters analytics data based on user role to hide sensitive information
 */

import { UserRole } from "@/lib/security/authorization-utils";

export interface FilteredAnalytics {
  allowed: boolean;
  data?: any;
  message?: string;
}

/**
 * Analytics Filter
 * Ensures non-admin users cannot access sensitive analytics data
 */
export class AnalyticsFilter {
  /**
   * Filter usage analytics based on role
   */
  filterUsageAnalytics(
    analytics: any,
    userRole: string | null
  ): FilteredAnalytics {
    if (userRole !== UserRole.NDIA_ADMIN) {
      return {
        allowed: false,
        message: "Admin access required",
      };
    }

    return {
      allowed: true,
      data: analytics,
    };
  }

  /**
   * Filter billing analytics based on role
   */
  filterBillingAnalytics(
    analytics: any,
    userRole: string | null
  ): FilteredAnalytics {
    if (userRole !== UserRole.NDIA_ADMIN) {
      return {
        allowed: false,
        message: "Admin access required",
      };
    }

    return {
      allowed: true,
      data: analytics,
    };
  }

  /**
   * Filter payment analytics based on role
   */
  filterPaymentAnalytics(
    analytics: any,
    userRole: string | null
  ): FilteredAnalytics {
    if (userRole !== UserRole.NDIA_ADMIN) {
      return {
        allowed: false,
        message: "Admin access required",
      };
    }

    return {
      allowed: true,
      data: analytics,
    };
  }

  /**
   * Sanitize invoice data for non-admin users
   */
  sanitizeInvoiceForUser(invoice: any, userId: string, userRole: string | null): any {
    // Users can see their own invoices but without cost breakdowns
    if (invoice.userId === userId && userRole !== UserRole.NDIA_ADMIN) {
      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        currency: invoice.currency,
        status: invoice.status,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
        createdAt: invoice.createdAt,
        // Hide line items and metadata from non-admins
      };
    }

    // Admins see everything
    if (userRole === UserRole.NDIA_ADMIN) {
      return invoice;
    }

    // Users cannot see other users' invoices
    return null;
  }

  /**
   * Sanitize usage summary for non-admin users
   */
  sanitizeUsageSummary(
    summary: any,
    userId: string,
    userRole: string | null
  ): any {
    // Users can see their own usage but without costs
    if (summary.userId === userId && userRole !== UserRole.NDIA_ADMIN) {
      return {
        totalApiCalls: summary.totalApiCalls,
        totalServiceHours: summary.totalServiceHours,
        totalStorageGB: summary.totalStorageGB,
        // Hide costs
      };
    }

    // Admins see everything
    if (userRole === UserRole.NDIA_ADMIN) {
      return summary;
    }

    return null;
  }
}

// Export singleton instance
export const analyticsFilter = new AnalyticsFilter();
