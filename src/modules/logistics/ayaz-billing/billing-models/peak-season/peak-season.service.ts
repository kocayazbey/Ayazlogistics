import { Injectable } from '@nestjs/common';

@Injectable()
export class PeakSeasonService {
  private readonly peakSeasons = [
    { name: 'Black Friday', startMonth: 11, startDay: 20, endMonth: 11, endDay: 30, surcharge: 0.30 },
    { name: 'New Year', startMonth: 12, startDay: 15, endMonth: 1, endDay: 5, surcharge: 0.25 },
    { name: 'Ramadan', startMonth: 3, startDay: 10, endMonth: 4, endDay: 15, surcharge: 0.20 },
  ];

  calculatePeakSeasonSurcharge(date: Date, baseAmount: number): {
    isPeakSeason: boolean;
    seasonName?: string;
    surchargePercentage: number;
    surchargeAmount: number;
    totalAmount: number;
  } {
    const month = date.getMonth() + 1;
    const day = date.getDate();

    for (const season of this.peakSeasons) {
      const isInSeason = this.isDateInSeason(month, day, season);

      if (isInSeason) {
        const surchargeAmount = baseAmount * season.surcharge;
        return {
          isPeakSeason: true,
          seasonName: season.name,
          surchargePercentage: season.surcharge * 100,
          surchargeAmount: Math.round(surchargeAmount * 100) / 100,
          totalAmount: Math.round((baseAmount + surchargeAmount) * 100) / 100,
        };
      }
    }

    return {
      isPeakSeason: false,
      surchargePercentage: 0,
      surchargeAmount: 0,
      totalAmount: baseAmount,
    };
  }

  private isDateInSeason(month: number, day: number, season: any): boolean {
    if (season.startMonth === season.endMonth) {
      return month === season.startMonth && day >= season.startDay && day <= season.endDay;
    } else if (season.startMonth < season.endMonth) {
      return (
        (month === season.startMonth && day >= season.startDay) ||
        (month === season.endMonth && day <= season.endDay) ||
        (month > season.startMonth && month < season.endMonth)
      );
    } else {
      return (
        (month === season.startMonth && day >= season.startDay) ||
        (month === season.endMonth && day <= season.endDay) ||
        month > season.startMonth ||
        month < season.endMonth
      );
    }
  }
}

