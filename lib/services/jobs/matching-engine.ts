/**
 * Job Matching Engine
 * Matches job seekers with job opportunities based on skills and requirements
 */

import { JobService } from "./job-service";

export interface ApplicantProfile {
  applicantId: string;
  skills: string[];
  experience: number; // years
  location?: {
    address: string;
    latitude: number;
    longitude: number;
  };
  accessibilityNeeds?: string[];
  preferredJobTypes?: string[];
}

export interface JobListing {
  id: string;
  title: string;
  requiredSkills: string[];
  preferredSkills?: string[];
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  accessibilityRequirements: string[];
  jobType: string;
}

export interface MatchScore {
  jobId: string;
  score: number; // 0-100
  factors: {
    skillsMatch: number;
    locationProximity: number;
    accessibilityMatch: number;
    experienceMatch: number;
  };
  reasons: string[];
}

export class JobMatchingEngine {
  private jobService: JobService;

  constructor() {
    this.jobService = new JobService();
  }

  /**
   * Find matching jobs for an applicant
   */
  async findMatchingJobs(
    applicant: ApplicantProfile,
    limit: number = 10
  ): Promise<MatchScore[]> {
    // Get all active job listings
    const jobs = await this.jobService.getJobListings({});

    // Calculate match scores
    const scores: MatchScore[] = jobs.map((job: JobListing) => {
      const skillsMatch = this.calculateSkillsMatch(
        applicant.skills,
        job.requiredSkills,
        job.preferredSkills || []
      );

      const locationProximity = applicant.location
        ? this.calculateLocationProximity(
            applicant.location,
            job.location
          )
        : 50; // Neutral score if no location

      const accessibilityMatch = this.calculateAccessibilityMatch(
        applicant.accessibilityNeeds || [],
        job.accessibilityRequirements
      );

      const experienceMatch = 70; // Placeholder - would calculate based on job requirements

      // Weighted average
      const overallScore =
        skillsMatch * 0.4 +
        locationProximity * 0.2 +
        accessibilityMatch * 0.3 +
        experienceMatch * 0.1;

      const reasons: string[] = [];
      if (skillsMatch >= 80) {
        reasons.push("Strong skills match");
      }
      if (locationProximity >= 80) {
        reasons.push("Close to your location");
      }
      if (accessibilityMatch >= 80) {
        reasons.push("Meets accessibility requirements");
      }

      return {
        jobId: job.id,
        score: Math.round(overallScore),
        factors: {
          skillsMatch,
          locationProximity,
          accessibilityMatch,
          experienceMatch,
        },
        reasons,
      };
    });

    // Sort by score and return top matches
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .filter((s) => s.score >= 50); // Only return matches with score >= 50
  }

  /**
   * Calculate skills match score
   */
  private calculateSkillsMatch(
    applicantSkills: string[],
    requiredSkills: string[],
    preferredSkills: string[]
  ): number {
    if (requiredSkills.length === 0) return 100;

    // Calculate required skills match
    const requiredMatch =
      applicantSkills.filter((skill) =>
        requiredSkills.some(
          (req) => skill.toLowerCase() === req.toLowerCase()
        )
      ).length / requiredSkills.length;

    // Calculate preferred skills bonus
    const preferredMatch =
      preferredSkills.length > 0
        ? applicantSkills.filter((skill) =>
            preferredSkills.some(
              (pref) => skill.toLowerCase() === pref.toLowerCase()
            )
          ).length / preferredSkills.length
        : 0;

    // Required skills are mandatory (70% weight), preferred are bonus (30%)
    return Math.min(
      100,
      requiredMatch * 100 * 0.7 + preferredMatch * 100 * 0.3
    );
  }

  /**
   * Calculate location proximity score
   */
  private calculateLocationProximity(
    applicantLocation: { latitude: number; longitude: number },
    jobLocation: { latitude: number; longitude: number }
  ): number {
    const distance = this.haversineDistance(
      applicantLocation,
      jobLocation
    );

    // Score based on distance (0-50km = 100, 50-100km = 80, etc.)
    if (distance <= 5) return 100;
    if (distance <= 10) return 90;
    if (distance <= 25) return 80;
    if (distance <= 50) return 70;
    if (distance <= 100) return 60;
    return Math.max(0, 100 - distance);
  }

  /**
   * Haversine distance calculation
   */
  private haversineDistance(
    loc1: { latitude: number; longitude: number },
    loc2: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(loc2.latitude - loc1.latitude);
    const dLon = this.toRad(loc2.longitude - loc1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(loc1.latitude)) *
        Math.cos(this.toRad(loc2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Calculate accessibility match score
   */
  private calculateAccessibilityMatch(
    applicantNeeds: string[],
    jobRequirements: string[]
  ): number {
    if (applicantNeeds.length === 0) return 100; // No specific needs

    if (jobRequirements.length === 0) return 50; // Job doesn't specify accessibility

    // Check if job meets all applicant needs
    const metNeeds = applicantNeeds.filter((need) =>
      jobRequirements.some(
        (req) => need.toLowerCase() === req.toLowerCase()
      )
    ).length;

    return (metNeeds / applicantNeeds.length) * 100;
  }

  /**
   * Find applicants matching a job
   */
  async findMatchingApplicants(jobId: string): Promise<MatchScore[]> {
    // TODO: Implement reverse matching (job -> applicants)
    // This would query applicant profiles and match them to the job
    return [];
  }
}
