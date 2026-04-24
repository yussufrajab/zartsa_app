export type AnnouncementCategory =
  | 'FARE_ADJUSTMENT'
  | 'ROAD_CLOSURE'
  | 'SCHEDULE_CHANGE'
  | 'REGULATORY_UPDATE'
  | 'GENERAL_NOTICE';

export interface Announcement {
  id: string;
  titleSw: string;
  titleEn: string;
  contentSw: string;
  contentEn: string;
  category: AnnouncementCategory;
  publishedAt: string | null;
  sourceAuthority: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}