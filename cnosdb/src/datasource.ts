import { lastValueFrom, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  DataFrameJSON,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceInstanceSettings,
  MetricFindValue,
  ScopedVars,
} from '@grafana/data';
import { BackendSrvRequest, DataSourceWithBackend, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';

import { CnosDataSourceOptions, CnosQuery, SelectItem, TagItem } from './types';
import { cloneDeep, each, findIndex, zip } from 'lodash';
import {
  customQuerySchema,
  describeTableSchema,
  MetaSchema,
  showTablesSchema,
  showTagValuesSchema,
} from './meta_schemas';

export class CnosDataSource extends DataSourceWithBackend<CnosQuery, CnosDataSourceOptions> {
  datasourceUid: string;

  constructor(
    instanceSettings: DataSourceInstanceSettings<CnosDataSourceOptions>,
    private readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings);
    this.datasourceUid = instanceSettings.uid;
  }

  async metricFindQuery(query: string, options?: any): Promise<MetricFindValue[]> {
    const interpolated = this.templateSrv.replace(query, undefined, 'regex');
    return lastValueFrom(this._fetchMetric(interpolated)).then((results) => {
      let ret = this._parseMetricFindResult(query, results);
      return ret;
    });
  }

  _fetchMetric(query: string) {
    if (!query) {
      return of({ results: [] });
    }
    return this._doRequest(query, 'MetricQuery');
  }

  _doRequest(query: string, refId: string, options?: any) {
    const req: BackendSrvRequest = {
      method: 'POST',
      url: '/api/ds/query',
      data: {
        queries: [
          {
            refId: refId,
            datasource: { uid: this.datasourceUid },
            rawQuery: true,
            queryText: query,
          },
        ],
      },
    };

    return getBackendSrv()
      .fetch(req)
      .pipe(
        map((result: any) => {
          const { data } = result;
          return data;
        })
      );
  }

  _parseMetricFindResult(query: string, results: { results: any }): MetricFindValue[] {
    if (!results?.results?.MetricQuery) {
      return [];
    }

    const frames = results.results.MetricQuery.frames;
    if (!frames || frames.length === 0) {
      return [];
    }

    const frame: DataFrameJSON = frames[0];
    if (!frame.data?.values || frame.data.values.length === 0) {
      return [];
    }

    const values: any[][] = frame.data.values;

    const stdQuery = query.toUpperCase();
    let ret = new Set<string>();

    const parseResponse = (
      frame: DataFrameJSON,
      schema: MetaSchema[],
      col2Filter: (v: string) => boolean
    ): Set<string> => {
      let colIndexes: number[] = [];
      for (let col of schema) {
        let indexes = this._parseSchema(frame, col.keys);
        if (indexes.length > 0) {
          colIndexes = indexes;
          break;
        }
      }
      const ret = new Set<string>();
      if (colIndexes.length === 0) {
        return ret;
      } else if (colIndexes.length === 1) {
        each(values[colIndexes[0]], (v) => {
          ret.add(v.toString());
        });
      } else if (colIndexes.length === 2) {
        each(zip(values[colIndexes[0]], values[colIndexes[1]]), ([col1, col2]) => {
          if (col2Filter(col2)) {
            ret.add(col1.toString());
          }
        });
      }

      return ret;
    };

    const defaultFilter = (v: string) => true;

    if (stdQuery.indexOf('SHOW TABLES') === 0) {
      ret = parseResponse(frame, showTablesSchema, defaultFilter);
    } else if (stdQuery.indexOf('-- TAG;\nDESCRIBE TABLE') === 0) {
      ret = parseResponse(frame, describeTableSchema, (v) => v === 'TAG');
    } else if (stdQuery.indexOf('-- FIELD;\nDESCRIBE TABLE') === 0) {
      ret = parseResponse(frame, describeTableSchema, (v) => v === 'FIELD');
    } else if (stdQuery.indexOf('SHOW TAG VALUES') === 0) {
      ret = parseResponse(frame, showTagValuesSchema, defaultFilter);
    } else {
      // For customized query variable sql, there is only 1 column named 'value'.
      ret = parseResponse(frame, customQuerySchema, defaultFilter);
    }

    return Array.from(ret).map((v) => ({ text: v }));
  }

  _parseSchema(frame: DataFrameJSON, fields: string[]): number[] {
    if (!frame.schema?.fields || frame.schema.fields.length === 0) {
      return [];
    }
    const schemaFields = frame.schema.fields;
    const indexes: number[] = [];
    each(fields, (f, i) => {
      const foundIndex = findIndex(schemaFields, { name: f });
      if (foundIndex !== -1) {
        indexes.push(foundIndex);
      }
    });
    return indexes;
  }

  query(request: DataQueryRequest<CnosQuery>): Observable<DataQueryResponse> {
    const scopedVars = request.scopedVars;
    request.targets = this._replace(request.targets, scopedVars);

    return super.query(request);
  }

  _replace(targets: CnosQuery[], scopedVars: ScopedVars): CnosQuery[] {
    function replaceTagItems(items: TagItem[]): TagItem[] {
      return items.map((item) => {
        item.value = getTemplateSrv().replace(item.value, scopedVars);
        return item;
      });
    }

    function replaceSelectItems(items: SelectItem[]): SelectItem[] {
      return items.map((item) => {
        if (item.params) {
          item.params = item.params.map((p) => {
            if (typeof p === 'string') {
              return getTemplateSrv().replace(p, scopedVars);
            } else {
              return p;
            }
          });
          return item;
        } else {
          return item;
        }
      });
    }

    function replaceSelectItemsList(select: SelectItem[][]): SelectItem[][] {
      return select.map((items) => {
        return replaceSelectItems(items);
      });
    }

    const tmpTargets = cloneDeep(targets);
    tmpTargets.map((query) => {
      if (query.table) {
        query.table = getTemplateSrv().replace(query.table, scopedVars);
      }
      if (query.tags && query.tags.length > 0) {
        query.tags = replaceTagItems(query.tags);
      }
      if (query.select && query.select.length > 0) {
        query.select = replaceSelectItemsList(query.select);
      }
      if (query.groupBy && query.groupBy.length > 0) {
        query.groupBy = replaceSelectItems(query.groupBy);
      }
      if (query.rawQuery && query.queryText) {
        query.queryText = getTemplateSrv().replace(query.queryText, scopedVars);
      }
      if (query.alias) {
        query.alias = getTemplateSrv().replace(query.alias, scopedVars);
      }
    });
    return tmpTargets;
  }
}
