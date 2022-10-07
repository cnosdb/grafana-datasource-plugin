import { DataSource } from './datasource';
import { InfluxQueryBuilder } from './influxql_query_builder';
import { TagItem } from './types';

const runExploreQuery = (
  type: string,
  withKey: string | undefined,
  withMeasurementFilter: string | undefined,
  target: { table: string | undefined; tags: TagItem[] },
  datasource: DataSource
): Promise<Array<{ text: string }>> => {
  const builder = new InfluxQueryBuilder(target, datasource.database);
  const q = builder.buildExploreQuery(type, withKey, withMeasurementFilter);
  return datasource.metricFindQuery(q);
};

export async function getAllPolicies(datasource: DataSource): Promise<string[]> {
  const target = { tags: [], table: undefined };
  const data = await runExploreQuery('RETENTION POLICIES', undefined, undefined, target, datasource);
  return data.map((item) => item.text);
}

export async function getAllMeasurementsForTags(
  measurementFilter: string | undefined,
  tags: TagItem[],
  datasource: DataSource
): Promise<string[]> {
  const target = { tags, table: undefined };
  const data = await runExploreQuery('MEASUREMENTS', undefined, measurementFilter, target, datasource);
  return data.map((item) => item.text);
}

export async function getTagKeysForMeasurementAndTags(
  table: string | undefined,
  tags: TagItem[],
  datasource: DataSource
): Promise<string[]> {
  const target = { tags, table };
  const data = await runExploreQuery('TAG_KEYS', undefined, undefined, target, datasource);
  return data.map((item) => item.text);
}

export async function getTagValues(
  tagKey: string,
  table: string | undefined,
  tags: TagItem[],
  datasource: DataSource
): Promise<string[]> {
  const target = { tags, table };
  const data = await runExploreQuery('TAG_VALUES', tagKey, undefined, target, datasource);
  return data.map((item) => item.text);
}

export async function getFieldKeysForMeasurement(table: string, datasource: DataSource): Promise<string[]> {
  const target = { tags: [], table };
  const data = await runExploreQuery('FIELDS', undefined, undefined, target, datasource);
  return data.map((item) => item.text);
}
