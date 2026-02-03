/**
 * NDIS registration group lookup: Index (from outlet RegGroup array) → RegGroup name and Group.
 * Used to map outlet.RegGroup (number[]) to provider categories.
 */
export const REG_GROUP_OPTIONS = [
  {
    Index: 1,
    RegGroup: "Accommodation / Tenancy Assistance",
    Group: "Assistive Services",
  },
  { Index: 2, RegGroup: "Assistance Animals", Group: "Assistive Services" },
  {
    Index: 3,
    RegGroup:
      "Assistance with daily life tasks in a group or shared living arrangement",
    Group: "Assistive Services",
  },
  {
    Index: 4,
    RegGroup: "Assistance with travel/transport arrangements",
    Group: "Assistive Services",
  },
  {
    Index: 5,
    RegGroup: "Daily Personal Activities",
    Group: "Assistive Services",
  },
  {
    Index: 6,
    RegGroup: "Group and Centre Based Activities",
    Group: "Assistive Services",
  },
  {
    Index: 7,
    RegGroup: "High Intensity Daily Personal Activities",
    Group: "Assistive Services",
  },
  { Index: 8, RegGroup: "Household tasks", Group: "Assistive Services" },
  {
    Index: 9,
    RegGroup: "Interpreting and translation",
    Group: "Assistive Services",
  },
  {
    Index: 10,
    RegGroup: "Participation in community/social and civic activities",
    Group: "Assistive Services",
  },
  {
    Index: 11,
    RegGroup: "Assistive equipment for recreation",
    Group: "Assistive Technology",
  },
  {
    Index: 12,
    RegGroup: "Assistive products for household tasks",
    Group: "Assistive Technology",
  },
  {
    Index: 13,
    RegGroup: "Assistance products for personal care and safety",
    Group: "Assistive Technology",
  },
  {
    Index: 14,
    RegGroup: "Communication and information equipment",
    Group: "Assistive Technology",
  },
  {
    Index: 15,
    RegGroup: "Customised Prosthetics",
    Group: "Assistive Technology",
  },
  { Index: 16, RegGroup: "Hearing Equipment", Group: "Assistive Technology" },
  { Index: 17, RegGroup: "Hearing Services", Group: "Assistive Technology" },
  {
    Index: 18,
    RegGroup: "Personal Mobility Equipment",
    Group: "Assistive Technology",
  },
  {
    Index: 19,
    RegGroup: "Specialised Hearing Services",
    Group: "Assistive Technology",
  },
  { Index: 20, RegGroup: "Vision Equipment", Group: "Assistive Technology" },
  {
    Index: 21,
    RegGroup:
      "Assistance in coordinating or managing life stages/transitions and supports",
    Group: "Capacity Building Services",
  },
  {
    Index: 22,
    RegGroup: "Behaviour Support",
    Group: "Capacity Building Services",
  },
  {
    Index: 23,
    RegGroup: "Community nursing care for high needs",
    Group: "Capacity Building Services",
  },
  {
    Index: 24,
    RegGroup: "Development of daily living and life skills",
    Group: "Capacity Building Services",
  },
  {
    Index: 25,
    RegGroup: "Early Intervention supports for early childhood",
    Group: "Capacity Building Services",
  },
  {
    Index: 26,
    RegGroup: "Exercise Physiology and Physical Wellbeing activities",
    Group: "Capacity Building Services",
  },
  {
    Index: 27,
    RegGroup: "Innovative Community Participation",
    Group: "Capacity Building Services",
  },
  {
    Index: 28,
    RegGroup: "Specialised Driving Training",
    Group: "Capacity Building Services",
  },
  {
    Index: 29,
    RegGroup: "Therapeutic Supports",
    Group: "Capacity Building Services",
  },
  {
    Index: 30,
    RegGroup: "Home modification design and construction",
    Group: "Capital Services",
  },
  {
    Index: 31,
    RegGroup: "Specialist Disability Accommodation",
    Group: "Capital Services",
  },
  { Index: 32, RegGroup: "Vehicle Modifications", Group: "Capital Services" },
  {
    Index: 33,
    RegGroup: "Plan Management",
    Group: "Choice and Control Support Services",
  },
  {
    Index: 34,
    RegGroup: "Support Coordination",
    Group: "Choice and Control Support Services",
  },
  {
    Index: 35,
    RegGroup:
      "Assistance to access and/or maintain employment and/or education",
    Group: "Employment and Education Support Services",
  },
  {
    Index: 36,
    RegGroup: "Specialised Supported Employment",
    Group: "Employment and Education Support Services",
  },
] as const;

const REG_GROUP_BY_INDEX = new Map<number, string>(
  REG_GROUP_OPTIONS.map((r) => [r.Index, r.RegGroup]),
);

/** Map outlet RegGroup indices (number[]) to NDIS category names (string[]). */
export function regGroupIndicesToCategories(indices: number[]): string[] {
  const out: string[] = [];
  for (const idx of indices) {
    const name = REG_GROUP_BY_INDEX.get(idx);
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}
