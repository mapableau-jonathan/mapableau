/**
 * MapAble Core Dashboard
 * Unified dashboard showing account overview, billing, messages, notifications, and support
 */

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  billingService,
  messagingService,
  notificationService,
  supportService,
} from "@/lib/services/core";
import {
  CreditCard,
  Bell,
  MessageSquare,
  HelpCircle,
  Settings,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { SupportTicketStatus } from "@prisma/client";

export default async function CoreDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Fetch dashboard data directly from services
  const [
    billingSummary,
    unreadMessages,
    unreadNotifications,
    openTickets,
  ] = await Promise.all([
    billingService
      .getBillingSummary(session.user.id)
      .then((summary) => ({ summary }))
      .catch(() => ({ summary: null })),
    messagingService.getUnreadCount(session.user.id).catch(() => 0),
    notificationService.getUnreadCount(session.user.id).catch(() => 0),
    supportService
      .getUserTickets(session.user.id, {
        status: SupportTicketStatus.OPEN,
        limit: 100,
      })
      .then((tickets) => tickets.length)
      .catch(() => 0),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">MapAble Core Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {session.user?.name || session.user?.email}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold">
                {billingSummary?.summary?.totalInvoices || 0}
              </p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
          {billingSummary?.summary?.totalOverdue > 0 && (
            <p className="text-sm text-red-600 mt-2">
              {billingSummary.summary.totalOverdue} overdue
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unread Messages</p>
              <p className="text-2xl font-bold">{unreadMessages}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Notifications</p>
              <p className="text-2xl font-bold">{unreadNotifications}</p>
            </div>
            <Bell className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Open Tickets</p>
              <p className="text-2xl font-bold">{openTickets}</p>
            </div>
            <HelpCircle className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Billing Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing & Invoices
            </h2>
            <Link
              href="/core/billing"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View All
            </Link>
          </div>
          {billingSummary?.summary ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Paid</span>
                <span className="font-semibold">
                  ${billingSummary.summary.totalPaid?.toFixed(2) || "0.00"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pending</span>
                <span className="font-semibold">
                  ${billingSummary.summary.totalPending?.toFixed(2) || "0.00"}
                </span>
              </div>
              {billingSummary.summary.totalOverdue > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Overdue</span>
                  <span className="font-semibold">
                    ${billingSummary.summary.totalOverdue?.toFixed(2) || "0.00"}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No billing information available</p>
          )}
        </div>

        {/* Messages Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Messages
            </h2>
            <Link
              href="/core/messages"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View All
            </Link>
          </div>
          {unreadMessages > 0 ? (
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                {unreadMessages} unread message{unreadMessages !== 1 ? "s" : ""}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">All messages read</span>
            </div>
          )}
        </div>

        {/* Notifications Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </h2>
            <Link
              href="/core/notifications"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View All
            </Link>
          </div>
          {unreadNotifications > 0 ? (
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                {unreadNotifications} unread notification
                {unreadNotifications !== 1 ? "s" : ""}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">All notifications read</span>
            </div>
          )}
        </div>

        {/* Support Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Support
            </h2>
            <Link
              href="/core/support"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View All
            </Link>
          </div>
          {openTickets > 0 ? (
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                {openTickets} open ticket{openTickets !== 1 ? "s" : ""}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">No open tickets</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/core/billing/invoices/new"
            className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <CreditCard className="h-6 w-6 text-blue-600 mb-2" />
            <span className="text-sm">New Invoice</span>
          </Link>
          <Link
            href="/core/messages/new"
            className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <MessageSquare className="h-6 w-6 text-green-600 mb-2" />
            <span className="text-sm">New Message</span>
          </Link>
          <Link
            href="/core/support/tickets/new"
            className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <HelpCircle className="h-6 w-6 text-purple-600 mb-2" />
            <span className="text-sm">New Ticket</span>
          </Link>
          <Link
            href="/core/settings"
            className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <Settings className="h-6 w-6 text-gray-600 mb-2" />
            <span className="text-sm">Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
