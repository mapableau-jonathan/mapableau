/**
 * Note Templates Service
 * Provides templates for different types of case notes
 */

import type { CareNoteType } from "@prisma/client";

export interface NoteTemplate {
  type: CareNoteType;
  name: string;
  description: string;
  template: string;
  fields: Array<{
    name: string;
    type: "text" | "date" | "time" | "number" | "select";
    required: boolean;
    options?: string[];
  }>;
}

export class NoteTemplatesService {
  /**
   * Get all available templates
   */
  getTemplates(): NoteTemplate[] {
    return [
      {
        type: "PROGRESS",
        name: "Progress Note",
        description: "Daily progress update",
        template: `Date: {{date}}
Time: {{time}}

Progress Summary:
{{progress}}

Goals Addressed:
{{goals}}

Next Steps:
{{nextSteps}}`,
        fields: [
          { name: "date", type: "date", required: true },
          { name: "time", type: "time", required: true },
          { name: "progress", type: "text", required: true },
          { name: "goals", type: "text", required: false },
          { name: "nextSteps", type: "text", required: false },
        ],
      },
      {
        type: "MEDICATION",
        name: "Medication Record",
        description: "Medication administration log",
        template: `Date: {{date}}
Time: {{time}}

Medication: {{medicationName}}
Dosage: {{dosage}}
Route: {{route}}
Given By: {{givenBy}}

Notes:
{{notes}}`,
        fields: [
          { name: "date", type: "date", required: true },
          { name: "time", type: "time", required: true },
          { name: "medicationName", type: "text", required: true },
          { name: "dosage", type: "text", required: true },
          {
            name: "route",
            type: "select",
            required: true,
            options: ["Oral", "Topical", "Injection", "Inhalation", "Other"],
          },
          { name: "givenBy", type: "text", required: true },
          { name: "notes", type: "text", required: false },
        ],
      },
      {
        type: "PERSONAL_CARE",
        name: "Personal Care Log",
        description: "Personal care activities",
        template: `Date: {{date}}
Time: {{time}}

Activities:
{{activities}}

Observations:
{{observations}}

Concerns:
{{concerns}}`,
        fields: [
          { name: "date", type: "date", required: true },
          { name: "time", type: "time", required: true },
          { name: "activities", type: "text", required: true },
          { name: "observations", type: "text", required: false },
          { name: "concerns", type: "text", required: false },
        ],
      },
      {
        type: "INCIDENT",
        name: "Incident Note",
        description: "Record of incidents or concerns",
        template: `Date: {{date}}
Time: {{time}}

Incident Type: {{incidentType}}
Description:
{{description}}

Actions Taken:
{{actionsTaken}}

Follow-up Required: {{followUp}}`,
        fields: [
          { name: "date", type: "date", required: true },
          { name: "time", type: "time", required: true },
          {
            name: "incidentType",
            type: "select",
            required: true,
            options: ["Minor", "Moderate", "Serious", "Other"],
          },
          { name: "description", type: "text", required: true },
          { name: "actionsTaken", type: "text", required: false },
          { name: "followUp", type: "text", required: false },
        ],
      },
      {
        type: "ACTIVITY",
        name: "Activity Note",
        description: "Activity participation record",
        template: `Date: {{date}}
Time: {{time}}

Activity: {{activityName}}
Duration: {{duration}} minutes
Location: {{location}}

Participants:
{{participants}}

Outcomes:
{{outcomes}}`,
        fields: [
          { name: "date", type: "date", required: true },
          { name: "time", type: "time", required: true },
          { name: "activityName", type: "text", required: true },
          { name: "duration", type: "number", required: true },
          { name: "location", type: "text", required: false },
          { name: "participants", type: "text", required: false },
          { name: "outcomes", type: "text", required: false },
        ],
      },
    ];
  }

  /**
   * Get template by type
   */
  getTemplateByType(type: CareNoteType): NoteTemplate | undefined {
    return this.getTemplates().find((t) => t.type === type);
  }

  /**
   * Fill template with data
   */
  fillTemplate(template: NoteTemplate, data: Record<string, string>): string {
    let filled = template.template;

    template.fields.forEach((field) => {
      const value = data[field.name] || "";
      filled = filled.replace(
        new RegExp(`{{${field.name}}}`, "g"),
        value
      );
    });

    return filled;
  }
}
