import { cloneDeep } from 'lodash';

import InfluxQueryModel from './influxql_query_model';
import { MyQuery } from './types';

export function buildRawQuery(query: MyQuery): string {
  const queryCopy = cloneDeep(query);
  const model = new InfluxQueryModel(queryCopy);
  return model.render(false);
}

export function normalizeQuery(query: MyQuery): MyQuery {
  // we return the original query if there is no need to update it
  if (
    query.orderByTime !== undefined &&
    query.tags !== undefined &&
    query.groupBy !== undefined &&
    query.select !== undefined
  ) {
    return query;
  }

  const queryCopy = cloneDeep(query);
  return new InfluxQueryModel(queryCopy).target;
}

export function addNewSelectPart(query: MyQuery, type: string, index: number): MyQuery {
  const queryCopy = cloneDeep(query);
  const model = new InfluxQueryModel(queryCopy);
  model.addSelectPart(model.selectModels[index], type);
  return model.target;
}

export function removeSelectPart(query: MyQuery, partIndex: number, index: number): MyQuery {
  const queryCopy = cloneDeep(query);
  const model = new InfluxQueryModel(queryCopy);
  const selectModel = model.selectModels[index];
  model.removeSelectPart(selectModel, selectModel[partIndex]);
  return model.target;
}

export function changeSelectPart(query: MyQuery, listIndex: number, partIndex: number, newParams: string[]): MyQuery {
  // we need to make shallow copy of `query.select` down to `query.select[listIndex][partIndex]`
  const newSel = [...(query.select ?? [])];
  newSel[listIndex] = [...newSel[listIndex]];
  newSel[listIndex][partIndex] = {
    ...newSel[listIndex][partIndex],
    params: newParams,
  };
  return { ...query, select: newSel };
}

export function addNewGroupByPart(query: MyQuery, type: string): MyQuery {
  const queryCopy = cloneDeep(query);
  const model = new InfluxQueryModel(queryCopy);
  model.addGroupBy(type);
  return model.target;
}

export function removeGroupByPart(query: MyQuery, partIndex: number): MyQuery {
  const queryCopy = cloneDeep(query);
  const model = new InfluxQueryModel(queryCopy);
  model.removeGroupByPart(model.groupByParts[partIndex], partIndex);
  return model.target;
}

export function changeGroupByPart(query: MyQuery, partIndex: number, newParams: string[]): MyQuery {
  // we need to make shallow copy of `query.groupBy` down to `query.groupBy[partIndex]`
  const newGroupBy = [...(query.groupBy ?? [])];
  newGroupBy[partIndex] = {
    ...newGroupBy[partIndex],
    params: newParams,
  };
  return { ...query, groupBy: newGroupBy };
}
