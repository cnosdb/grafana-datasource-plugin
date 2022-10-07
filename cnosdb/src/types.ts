import { DataQuery, DataSourceJsonData } from '@grafana/data';

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  url?: string;
  database?: string;

  timeInterval?: string;
  httpMode?: string;

  maxSeries?: number;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */ export interface MySecureJsonData {
  password?: string;
}

export interface MyQuery extends DataQuery {
  table?: string;
  select: SelectItem[][];
  tags?: TagItem[];
  groupBy?: SelectItem[];
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
