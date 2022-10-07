import { cloneDeep, isString, map } from 'lodash';
import { Observable, of, map as map_rx, lastValueFrom } from 'rxjs';

import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  FieldType,
  dateMath,
  QueryResultMeta,
  TimeSeries,
  DataFrame,
  TIME_SERIES_TIME_FIELD_NAME,
  ArrayVector,
  TIME_SERIES_VALUE_FIELD_NAME,
} from '@grafana/data';
import { getTemplateSrv, TemplateSrv } from '@grafana/runtime';

import { MyQuery, MyDataSourceOptions } from './types';
import { HttpClient } from 'http_client';
import InfluxQueryModel from 'influxql_query_model';
import { InfluxQueryBuilder } from 'influxql_query_builder';
import ResponseParser from './response_parser';
import InfluxSeries from 'series_influx';

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  url: string;
  database: string;
  httpClient: HttpClient;
  responseParser: ResponseParser;
  constructor(
    instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>,
    private readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings);
    console.log('Datasource constructing by', instanceSettings);

    this.url = instanceSettings.url ?? '';
    this.database = instanceSettings.database ?? instanceSettings.jsonData.database ?? '';
    this.httpClient = new HttpClient();
    this.responseParser = new ResponseParser();
    console.log('Datasource constructed', this);
  }

  query(options: DataQueryRequest<MyQuery>): Observable<DataQueryResponse> {
    return this._query(options);
  }

  async testDatasource() {
    // Implement a health check for your data source.
    return {
      status: 'success',
      message: 'Success',
    };
  }

  async metricFindQuery(
    query: string,
    options?: any
  ): Promise<
    Array<{
      text: string;
      value?: string | number;
      expandable?: boolean;
    }>
  > {
    console.log('Quering metrics', query, options);
    if (options && options.range) {
      const timeFilter = this.getTimeFilter({ rangeRaw: options.range, timezone: options.timezone });
      query = query.replace('$timeFilter', timeFilter);
    }
    const interpolated = this.templateSrv.replace(query, undefined, 'regex');

    return lastValueFrom(this.httpClient.post('/query', '', { q: interpolated, db: this.database })).then((resp) => {
      return this.responseParser.parse(query, resp);
    });
  }

  _query(options: DataQueryRequest<MyQuery>): Observable<DataQueryResponse> {
    const scopedVars = options.scopedVars;
    const targets = cloneDeep(options.targets);

    let queryTargets: any[] = [];

    let allQueries = map(targets, (target) => {
      if (target.hide) {
        return '';
      }
      queryTargets.push(target);
      scopedVars.interval = scopedVars.__interval;
      return new InfluxQueryModel(target, this.templateSrv, scopedVars).render(true);
    }).reduce((acc, current) => {
      if (current !== '') {
        acc += ';' + current;
      }
      return acc;
    });

    console.log('Request', allQueries);

    if (allQueries === '') {
      return of({ data: [] });
    }

    // // add global adhoc filters to timeFilter
    // const adhocFilters = this.templateSrv.getAdhocFilters(this.name);
    // if (adhocFilters.length > 0) {
    //   const tmpQuery = new InfluxQueryModel({ refId: 'A' }, this.templateSrv, scopedVars);
    //   timeFilter += ' AND ' + tmpQuery.renderAdhocFilters(adhocFilters);
    // }

    // // replace grafana variables
    // scopedVars.timeFilter = { value: timeFilter };

    // replace templated variables
    allQueries = this.templateSrv.replace(allQueries, scopedVars);
    if (options && options.range) {
      const timeFilter = this.getTimeFilter({ rangeRaw: options.range, timezone: options.timezone });
      allQueries = allQueries.replace('$timeFilter', timeFilter);
    }

    console.log('Replaces request', allQueries);

    return this._request(allQueries, queryTargets, options);
  }

  _request(query: string, targets: any[], options: DataQueryRequest<MyQuery>) {
    return this.httpClient.post('/query', '', { q: query, db: this.database }).pipe(
      map_rx((data: any) => {
        console.log('Response', data);
        if (!data || !data.results) {
          return { data: [] };
        }

        let i, y;
        const seriesList = [];
        for (i = 0; i < data.results.length; i++) {
          const result = data.results[i];
          if (!result || !result.series) {
            continue;
          }

          if (targets.length > i) {
            const target = targets[i];
            let alias = target.alias;
            if (alias) {
              alias = this.templateSrv.replace(target.alias, options.scopedVars);
            }

            const meta: QueryResultMeta = {
              executedQueryString: data.executedQueryString,
            };

            const influxSeries = new InfluxSeries({
              refId: target.refId,
              series: data.results[i].series,
              alias: alias,
              meta,
            });

            switch (target.resultFormat) {
              case 'logs':
                meta.preferredVisualisationType = 'logs';
              case 'table': {
                seriesList.push(influxSeries.getTable());
                break;
              }
              default: {
                const timeSeries = influxSeries.getTimeSeries();
                for (y = 0; y < timeSeries.length; y++) {
                  seriesList.push(timeSeriesToDataFrame(timeSeries[y]));
                }
                break;
              }
            }
          }
        }

        return { data: seriesList };
      })
    );
  }

  queryTagKeys(options: any = {}) {
    const queryBuilder = new InfluxQueryBuilder({ table: options.table || '', tags: [] }, this.database);
    const query = queryBuilder.buildExploreQuery('TAG_KEYS');
    return this.metricFindQuery(query, options);
  }

  queryTagValues(options: any = {}) {
    const queryBuilder = new InfluxQueryBuilder({ table: options.table || '', tags: [] }, this.database);
    const query = queryBuilder.buildExploreQuery('TAG_VALUES', options.key);
    return this.metricFindQuery(query, options);
  }

  getTimeFilter(options: any) {
    const from = this.getInfluxTime(options.rangeRaw.from, false, options.timezone);
    const to = this.getInfluxTime(options.rangeRaw.to, true, options.timezone);

    return 'time >= ' + from + ' and time <= ' + to;
  }

  getInfluxTime(date: any, roundUp: any, timezone: any) {
    if (isString(date)) {
      if (date === 'now') {
        return 'now()';
      }

      const parts = /^now-(\d+)([dhms])$/.exec(date);
      if (parts) {
        const amount = parseInt(parts[1], 10);
        const unit = parts[2];
        return 'now() - ' + amount + unit;
      }
      date = dateMath.parse(date, roundUp, timezone);
    }

    return date.valueOf() + 'ms';
  }
}

// we detect the field type based on the value-array
function getFieldType(values: unknown[]): FieldType {
  // the values-array may contain a lot of nulls.
  // we need the first not-null item
  const firstNotNull = values.find((v) => v !== null);

  if (firstNotNull === undefined) {
    // we could not find any not-null values
    return FieldType.number;
  }

  const valueType = typeof firstNotNull;

  switch (valueType) {
    case 'string':
      return FieldType.string;
    case 'boolean':
      return FieldType.boolean;
    case 'number':
      return FieldType.number;
    default:
      // this should never happen, influxql values
      // can only be numbers, strings and booleans.
      throw new Error(`InfluxQL: invalid value type ${valueType}`);
  }
}

// this conversion function is specialized to work with the timeseries
// data returned by InfluxDatasource.getTimeSeries()
function timeSeriesToDataFrame(timeSeries: TimeSeries): DataFrame {
  const times: number[] = [];
  const values: unknown[] = [];

  // the data we process here is not correctly typed.
  // the typescript types say every data-point is number|null,
  // but in fact it can be string or boolean too.

  const points = timeSeries.datapoints;
  for (const point of points) {
    values.push(point[0]);
    times.push(point[1] as number);
  }

  const timeField = {
    name: TIME_SERIES_TIME_FIELD_NAME,
    type: FieldType.time,
    config: {},
    values: new ArrayVector<number>(times),
  };

  const valueField = {
    name: TIME_SERIES_VALUE_FIELD_NAME,
    type: getFieldType(values),
    config: {
      displayNameFromDS: timeSeries.title,
    },
    values: new ArrayVector<unknown>(values),
    labels: timeSeries.tags,
  };

  const fields = [timeField, valueField];

  return {
    name: timeSeries.target,
    refId: timeSeries.refId,
    meta: timeSeries.meta,
    fields,
    length: values.length,
  };
}
