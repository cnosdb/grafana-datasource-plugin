import { cloneDeep } from 'lodash';

import { CnosQuery } from './types';
import CnosQueryModel from './cnosql_query_model';

export function buildRawQuery(query: CnosQuery): string {
  const queryCopy = cloneDeep(query);
  const model = new CnosQueryModel(queryCopy);
  return model.render(false);
}

export function normalizeQuery(query: CnosQuery): CnosQuery {
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
  const model = new CnosQueryModel(queryCopy);
  return model.target;
}

export function addNewSelectPart(query: CnosQuery, type: string, index: number): CnosQuery {
  const queryCopy = cloneDeep(query);
  const model = new CnosQueryModel(queryCopy);
  model.addSelectPart(model.selectModels[index], type);
  return model.target;
}

export function removeSelectPart(query: CnosQuery, partIndex: number, index: number): CnosQuery {
  const queryCopy = cloneDeep(query);
  const model = new CnosQueryModel(queryCopy);
  const selectModel = model.selectModels[index];
  model.removeSelectPart(selectModel, selectModel[partIndex]);
  return model.target;
}

export function changeSelectPart(
  query: CnosQuery,
  listIndex: number,
  partIndex: number,
  newParams: string[]
): CnosQuery {
  // we need to make shallow copy of `query.select` down to `query.select[listIndex][partIndex]`
  const newSel = [...(query.select ?? [])];
  newSel[listIndex] = [...newSel[listIndex]];
  newSel[listIndex][partIndex] = {
    ...newSel[listIndex][partIndex],
    params: newParams,
  };
  return { ...query, select: newSel };
}

export function addNewGroupByPart(query: CnosQuery, type: string): CnosQuery {
  const queryCopy = cloneDeep(query);
  const model = new CnosQueryModel(queryCopy);
  model.addGroupBy(type);
  return model.target;
}

export function removeGroupByPart(query: CnosQuery, partIndex: number): CnosQuery {
  const queryCopy = cloneDeep(query);
  const model = new CnosQueryModel(queryCopy);
  model.removeGroupByPart(model.groupByParts[partIndex], partIndex);
  return model.target;
}

export function changeGroupByPart(query: CnosQuery, partIndex: number, newParams: string[]): CnosQuery {
  // we need to make shallow copy of `query.groupBy` down to `query.groupBy[partIndex]`
  const newGroupBy = [...(query.groupBy ?? [])];
  newGroupBy[partIndex] = {
    ...newGroupBy[partIndex],
    params: newParams,
  };
  return { ...query, groupBy: newGroupBy };
}
