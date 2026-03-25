import {
  AdminDashboardRepository,
  type AdminDashboardStatsRecord
} from "@/repositories/admin-dashboard-repository";

export class AdminDashboardService {
  public constructor(private readonly adminDashboardRepository: AdminDashboardRepository) {}

  public async getStats(): Promise<AdminDashboardStatsRecord> {
    return this.adminDashboardRepository.getStats();
  }
}
