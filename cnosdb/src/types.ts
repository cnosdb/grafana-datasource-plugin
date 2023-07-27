import { DataQuery, DataSourceJsonData } from '@grafana/data';

/**
 * These are options configured for each DataSource instance
 */
export interface CnosDataSourceOptions extends DataSourceJsonData {
  url?: string;
  database?: string;
  user?: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface CnosSecureJsonData {
  password?: string;
}

export interface CnosQuery extends DataQuery {
  table?: string;
  select: SelectItem[][];
  tags?: TagItem[];
  rawTagsExpr?: string;
  groupBy?: SelectItem[];
  interval?: string;
  fill?: string;
  orderByTime?: string;
  limit?: string | number;
  tz?: string;

  rawQuery?: boolean;
  queryText?: string;
  alias?: string;
}

export interface SelectItem {
  type: string;
  params?: Array<string | number>;
}

export interface TagItem {
  key: string;
  operator?: string;
  condition?: string;
  value: string;
}
