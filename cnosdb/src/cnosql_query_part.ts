import { clone, map } from 'lodash';

import { functionRenderer, QueryPart, QueryPartDef } from './query_part';

const index: any[] = [];
const categories: any = {
  Aggregations: [],
  Selectors: [],
  Transformations: [],
  Predictors: [],
  Math: [],
  Aliasing: [],
  Fields: [],
};

function createPart(part: any): any {
  const def = index[part.type];
  if (!def) {
    console.log('[Error] Unexpected query part', part);
    throw { message: 'Could not find query part ' + part.type };
  }

  return new QueryPart(part, def);
}

function register(options: any) {
  index[options.type] = new QueryPartDef(options);
  options.category.push(index[options.type]);
}

const groupByTimeFunctions: any[] = [];

function aliasRenderer(part: { params: string[] }, innerExpr: string) {
  return innerExpr + ' AS ' + '"' + part.params[0] + '"';
}

function fieldRenderer(part: { params: string[] }, innerExpr: any) {
  if (part.params[0] === '*') {
    return '*';
  }
  return '"' + part.params[0] + '"';
}

export function timeRenderer(part: any, innerExpr: string) {
  if (part.params[0]) {
    return "DATE_BIN(INTERVAL '" + part.params[0] + "', time, TIMESTAMP '1970-01-01T00:00:00Z')";
  } else {
    return 'time';
  }
}

function replaceAggregationAddStrategy(selectParts: any[], partModel: { def: { type: string } }) {
  // look for existing aggregation
  for (let i = 0; i < selectParts.length; i++) {
    const part = selectParts[i];
    if (part.def.category === categories.Aggregations) {
      if (part.def.type === partModel.def.type) {
        return;
      }
      // count distinct is allowed
      if (part.def.type === 'count' && partModel.def.type === 'distinct') {
        break;
      }
      // remove next aggregation if distinct was replaced
      if (part.def.type === 'distinct') {
        const morePartsAvailable = selectParts.length >= i + 2;
        if (partModel.def.type !== 'count' && morePartsAvailable) {
          const nextPart = selectParts[i + 1];
          if (nextPart.def.category === categories.Aggregations) {
            selectParts.splice(i + 1, 1);
          }
        } else if (partModel.def.type === 'count') {
          if (!morePartsAvailable || selectParts[i + 1].def.type !== 'count') {
            selectParts.splice(i + 1, 0, partModel);
          }
          return;
        }
      }
      selectParts[i] = partModel;
      return;
    }
    if (part.def.category === categories.Selectors) {
      selectParts[i] = partModel;
      return;
    }
  }

  selectParts.splice(1, 0, partModel);
}

function addAliasStrategy(selectParts: any[], partModel: any) {
  const partCount = selectParts.length;
  if (partCount > 0) {
    // if last is alias, replace it
    if (selectParts[partCount - 1].def.type === 'alias') {
      selectParts[partCount - 1] = partModel;
      return;
    }
  }
  selectParts.push(partModel);
}

function addFieldStrategy(selectParts: any, partModel: any, query: { selectModels: any[][] }) {
  // copy all parts
  const parts = map(selectParts, (part: any) => {
    return createPart({ type: part.def.type, params: clone(part.params) });
  });

  query.selectModels.push(parts);
}

register({
  type: 'field',
  addStrategy: addFieldStrategy,
  category: categories.Fields,
  params: [{ type: 'field', dynamicLookup: true }],
  defaultParams: ['default_field'],
  renderer: fieldRenderer,
});

// Aggregations
register({
  type: 'avg',
  addStrategy: replaceAggregationAddStrategy,
  category: categories.Aggregations,
  params: [],
  defaultParams: [],
  renderer: functionRenderer,
});

register({
  type: 'count',
  addStrategy: replaceAggregationAddStrategy,
  category: categories.Aggregations,
  params: [],
  defaultParams: [],
  renderer: functionRenderer,
});

register({
  type: 'min',
  addStrategy: replaceAggregationAddStrategy,
  category: categories.Aggregations,
  params: [],
  defaultParams: [],
  renderer: functionRenderer,
});

register({
  type: 'max',
  addStrategy: replaceAggregationAddStrategy,
  category: categories.Aggregations,
  params: [],
  defaultParams: [],
  renderer: functionRenderer,
});

register({
  type: 'sum',
  addStrategy: replaceAggregationAddStrategy,
  category: categories.Aggregations,
  params: [],
  defaultParams: [],
  renderer: functionRenderer,
});

register({
  type: 'stddev',
  addStrategy: replaceAggregationAddStrategy,
  category: categories.Aggregations,
  params: [],
  defaultParams: [],
  renderer: functionRenderer,
});

register({
  type: 'variance',
  addStrategy: replaceAggregationAddStrategy,
  category: categories.Aggregations,
  params: [],
  defaultParams: [],
  renderer: functionRenderer,
});

// transformations
//
register({
  type: 'time',
  category: groupByTimeFunctions,
  params: [
    {
      name: 'interval',
      type: 'time',
      // TODO: Use simplified time '1s', '10s', '1m'...
      options: ['1 second', '10 seconds', '1 minute', '5 minutes', '10 minutes', '15 minutes', '1 hour'],
    },
  ],
  defaultParams: ['1 minute'],
  renderer: timeRenderer,
});

register({
  type: 'fill',
  category: groupByTimeFunctions,
  params: [
    {
      name: 'fill',
      type: 'string',
      options: ['null', '0', 'previous'],
    },
  ],
  defaultParams: ['null'],
  renderer: functionRenderer,
});

// predictions

register({
  type: 'tag',
  category: groupByTimeFunctions,
  params: [{ name: 'tag', type: 'string', dynamicLookup: true }],
  defaultParams: ['tag'],
  renderer: fieldRenderer,
});

register({
  type: 'alias',
  addStrategy: addAliasStrategy,
  category: categories.Aliasing,
  params: [{ name: 'name', type: 'string', quote: 'double' }],
  defaultParams: ['alias'],
  renderMode: 'suffix',
  renderer: aliasRenderer,
});

export default {
  create: createPart,
  getCategories: () => {
    return categories;
  },
  replaceAggregationAdd: replaceAggregationAddStrategy,
};
