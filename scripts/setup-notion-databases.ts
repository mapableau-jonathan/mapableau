#!/usr/bin/env tsx
/**
 * Setup Notion Databases for Participant CRM
 * Creates all required databases with proper schema in Notion
 * 
 * Usage:
 *   pnpm tsx scripts/setup-notion-databases.ts [parent-page-id]
 * 
 * If parent-page-id is not provided, databases will be created in the root
 */

import { getNotionConfig } from "../lib/config/notion";

const NOTION_API_VERSION = "2022-06-28";

interface NotionProperty {
  name: string;
  type: string;
  [key: string]: any;
}

/**
 * Create a Notion database
 */
async function createDatabase(
  apiKey: string,
  parentPageId: string | null,
  title: string,
  properties: NotionProperty[]
): Promise<{ id: string; url: string }> {
  const parent = parentPageId
    ? { page_id: parentPageId }
    : { workspace: true };

  const response = await fetch("https://api.notion.com/v1/databases", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Notion-Version": NOTION_API_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent,
      title: [{ type: "text", text: { content: title } }],
      properties: properties.reduce((acc, prop) => {
        acc[prop.name] = {
          type: prop.type,
          ...Object.fromEntries(
            Object.entries(prop).filter(([key]) => key !== "name" && key !== "type")
          ),
        };
        return acc;
      }, {} as Record<string, any>),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create database: ${response.status} ${error}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    url: data.url,
  };
}

/**
 * Main execution
 */
async function main() {
  console.log("🔧 Setting up Notion databases for Participant CRM\n");

  try {
    const config = getNotionConfig();

    if (!config.enabled) {
      console.error("❌ Notion sync is disabled. Enable it in configuration first.");
      process.exit(1);
    }

    const args = process.argv.slice(2);
    const parentPageId = args[0] || null;

    if (parentPageId) {
      console.log(`📄 Using parent page: ${parentPageId}\n`);
    } else {
      console.log("📄 Creating databases in workspace root\n");
    }

    // 1. Participants Database
    console.log("Creating Participants database...");
    const participantsDb = await createDatabase(
      config.apiKey,
      parentPageId,
      "Participants",
      [
        { name: "Name", type: "title" },
        { name: "Email", type: "email" },
        { name: "Participant ID", type: "rich_text" },
        {
          name: "Status",
          type: "select",
          select: {
            options: [
              { name: "Active", color: "green" },
              { name: "Inactive", color: "gray" },
              { name: "Suspended", color: "red" },
            ],
          },
        },
        { name: "NDIS Plan Number", type: "relation", relation: { database_id: "" } }, // Will be updated after NDIS Plans DB is created
        { name: "System ID", type: "rich_text" },
        { name: "Created At", type: "created_time" },
        { name: "Updated At", type: "last_edited_time" },
      ]
    );
    console.log(`✅ Created: ${participantsDb.url}\n`);
    console.log(`   Database ID: ${participantsDb.id}\n`);

    // 2. NDIS Plans Database
    console.log("Creating NDIS Plans database...");
    const ndisPlansDb = await createDatabase(
      config.apiKey,
      parentPageId,
      "NDIS Plans",
      [
        { name: "Plan Number", type: "title" },
        {
          name: "Participant",
          type: "relation",
          relation: { database_id: participantsDb.id },
        },
        {
          name: "Status",
          type: "select",
          select: {
            options: [
              { name: "DRAFT", color: "gray" },
              { name: "ACTIVE", color: "green" },
              { name: "SUSPENDED", color: "yellow" },
              { name: "EXPIRED", color: "red" },
              { name: "CANCELLED", color: "red" },
            ],
          },
        },
        { name: "Total Budget", type: "number", number: { format: "currency", currency_code: "AUD" } },
        { name: "Remaining Budget", type: "number", number: { format: "currency", currency_code: "AUD" } },
        { name: "Start Date", type: "date" },
        { name: "End Date", type: "date" },
        { name: "Plan Manager", type: "rich_text" },
        { name: "System ID", type: "rich_text" },
      ]
    );
    console.log(`✅ Created: ${ndisPlansDb.url}\n`);
    console.log(`   Database ID: ${ndisPlansDb.id}\n`);

    // Update Participants DB to link to NDIS Plans
    await fetch(`https://api.notion.com/v1/databases/${participantsDb.id}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Notion-Version": NOTION_API_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          "NDIS Plan Number": {
            relation: {
              database_id: ndisPlansDb.id,
            },
          },
        },
      }),
    });

    // 3. Care Plans Database
    console.log("Creating Care Plans database...");
    const carePlansDb = await createDatabase(
      config.apiKey,
      parentPageId,
      "Care Plans",
      [
        { name: "Plan Name", type: "title" },
        {
          name: "Participant",
          type: "relation",
          relation: { database_id: participantsDb.id },
        },
        { name: "Worker", type: "rich_text" },
        {
          name: "Status",
          type: "select",
          select: {
            options: [
              { name: "Active", color: "green" },
              { name: "Completed", color: "blue" },
              { name: "On Hold", color: "yellow" },
            ],
          },
        },
        { name: "Start Date", type: "date" },
        { name: "Review Date", type: "date" },
        { name: "Goals", type: "rich_text" },
        { name: "System ID", type: "rich_text" },
      ]
    );
    console.log(`✅ Created: ${carePlansDb.url}\n`);
    console.log(`   Database ID: ${carePlansDb.id}\n`);

    // 4. Incidents Database
    console.log("Creating Incidents database...");
    const incidentsDb = await createDatabase(
      config.apiKey,
      parentPageId,
      "Incidents",
      [
        {
          name: "Incident Type",
          type: "select",
          select: {
            options: [
              { name: "SERIOUS_INCIDENT", color: "red" },
              { name: "REPORTABLE_INCIDENT", color: "orange" },
              { name: "NEAR_MISS", color: "yellow" },
              { name: "MINOR_INCIDENT", color: "blue" },
              { name: "OTHER", color: "gray" },
            ],
          },
        },
        {
          name: "Participant",
          type: "relation",
          relation: { database_id: participantsDb.id },
        },
        { name: "Description", type: "rich_text" },
        { name: "Occurred At", type: "date" },
        {
          name: "Status",
          type: "select",
          select: {
            options: [
              { name: "REPORTED", color: "yellow" },
              { name: "UNDER_INVESTIGATION", color: "orange" },
              { name: "RESOLVED", color: "green" },
              { name: "CLOSED", color: "gray" },
              { name: "NDIS_REPORTED", color: "blue" },
            ],
          },
        },
        { name: "NDIS Reported", type: "checkbox" },
        { name: "System ID", type: "rich_text" },
      ]
    );
    console.log(`✅ Created: ${incidentsDb.url}\n`);
    console.log(`   Database ID: ${incidentsDb.id}\n`);

    // 5. Complaints Database
    console.log("Creating Complaints database...");
    const complaintsDb = await createDatabase(
      config.apiKey,
      parentPageId,
      "Complaints",
      [
        { name: "Complaint Number", type: "title" },
        {
          name: "Participant",
          type: "relation",
          relation: { database_id: participantsDb.id },
        },
        {
          name: "Source",
          type: "select",
          select: {
            options: [
              { name: "PARTICIPANT", color: "blue" },
              { name: "FAMILY", color: "green" },
              { name: "WORKER", color: "yellow" },
              { name: "ANONYMOUS", color: "gray" },
              { name: "OTHER", color: "orange" },
            ],
          },
        },
        { name: "Description", type: "rich_text" },
        {
          name: "Status",
          type: "select",
          select: {
            options: [
              { name: "RECEIVED", color: "yellow" },
              { name: "ACKNOWLEDGED", color: "blue" },
              { name: "UNDER_INVESTIGATION", color: "orange" },
              { name: "RESOLVED", color: "green" },
              { name: "CLOSED", color: "gray" },
              { name: "ESCALATED", color: "red" },
            ],
          },
        },
        { name: "Received At", type: "date" },
        { name: "System ID", type: "rich_text" },
      ]
    );
    console.log(`✅ Created: ${complaintsDb.url}\n`);
    console.log(`   Database ID: ${complaintsDb.id}\n`);

    // 6. Risks Database
    console.log("Creating Risks database...");
    const risksDb = await createDatabase(
      config.apiKey,
      parentPageId,
      "Risks",
      [
        { name: "Title", type: "title" },
        {
          name: "Participant",
          type: "relation",
          relation: { database_id: participantsDb.id },
        },
        {
          name: "Risk Level",
          type: "select",
          select: {
            options: [
              { name: "LOW", color: "green" },
              { name: "MEDIUM", color: "yellow" },
              { name: "HIGH", color: "orange" },
              { name: "CRITICAL", color: "red" },
            ],
          },
        },
        {
          name: "Status",
          type: "select",
          select: {
            options: [
              { name: "IDENTIFIED", color: "yellow" },
              { name: "ASSESSED", color: "blue" },
              { name: "MITIGATED", color: "green" },
              { name: "MONITORED", color: "orange" },
              { name: "CLOSED", color: "gray" },
            ],
          },
        },
        { name: "Category", type: "rich_text" },
        { name: "System ID", type: "rich_text" },
      ]
    );
    console.log(`✅ Created: ${risksDb.url}\n`);
    console.log(`   Database ID: ${risksDb.id}\n`);

    // 7. Payment Transactions Database
    console.log("Creating Payment Transactions database...");
    const paymentsDb = await createDatabase(
      config.apiKey,
      parentPageId,
      "Payment Transactions",
      [
        { name: "Transaction ID", type: "title" },
        {
          name: "Participant",
          type: "relation",
          relation: { database_id: participantsDb.id },
        },
        { name: "Provider", type: "rich_text" },
        { name: "Amount", type: "number", number: { format: "currency", currency_code: "AUD" } },
        {
          name: "Status",
          type: "select",
          select: {
            options: [
              { name: "PENDING", color: "yellow" },
              { name: "PROCESSING", color: "blue" },
              { name: "COMPLETED", color: "green" },
              { name: "FAILED", color: "red" },
              { name: "REVERSED", color: "gray" },
            ],
          },
        },
        { name: "Service Code", type: "rich_text" },
        { name: "Created At", type: "date" },
        { name: "System ID", type: "rich_text" },
      ]
    );
    console.log(`✅ Created: ${paymentsDb.url}\n`);
    console.log(`   Database ID: ${paymentsDb.id}\n`);

    // Summary
    console.log("=".repeat(60));
    console.log("✨ All databases created successfully!\n");
    console.log("Add these to your .env file:\n");
    console.log(`NOTION_PARTICIPANTS_DB_ID=${participantsDb.id}`);
    console.log(`NOTION_NDIS_PLANS_DB_ID=${ndisPlansDb.id}`);
    console.log(`NOTION_CARE_PLANS_DB_ID=${carePlansDb.id}`);
    console.log(`NOTION_INCIDENTS_DB_ID=${incidentsDb.id}`);
    console.log(`NOTION_COMPLAINTS_DB_ID=${complaintsDb.id}`);
    console.log(`NOTION_RISKS_DB_ID=${risksDb.id}`);
    console.log(`NOTION_PAYMENTS_DB_ID=${paymentsDb.id}`);
    console.log("\n" + "=".repeat(60));
  } catch (error: any) {
    console.error("\n❌ Error setting up databases:", error.message);
    process.exit(1);
  }
}

main();
