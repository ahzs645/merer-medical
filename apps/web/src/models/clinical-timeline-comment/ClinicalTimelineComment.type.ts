export interface ClinicalTimelineComment {
  id: string;
  user_id: string;
  /** Stable identity of the commented point: `${category}|${item}|${day_key}`. */
  target_key: string;
  category: string;
  item: string;
  lane_title?: string;
  /** ISO date (yyyy-MM-dd) of the data point. */
  day_key: string;
  body: string;
  author?: string;
  created_at: string;
}
