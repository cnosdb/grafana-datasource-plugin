import { SelectableValue } from '@grafana/data';

import { QueryPartDef } from '../query_part';
import CnosQueryModel from '../cnosql_query_model';
import queryPart from '../cnosql_query_part';
import { CnosQuery, SelectItem } from '../types';
import { toSelectableValue, unwrap } from '../utils';
import { PartParams } from './PartListSection';

type Categories = Record<string, QueryPartDef[]>;

export function getNewSelectPartOptions(): SelectableValue[] {
  const categories: Categories = queryPart.getCategories();
  const options: SelectableValue[] = [];

  const keys = Object.keys(categories);

  keys.forEach((key) => {
    const children: SelectableValue[] = categories[key].map((x) => toSelectableValue(x.type));

    options.push({
      label: key,
      options: children,
    });
  });

  return options;
}

export async function getNewGroupByPartOptions(
  query: CnosQuery,
  getTagKeys: () => Promise<string[]>
): Promise<Array<SelectableValue<string>>> {
  const queryCopy = { ...query };
  const model = new CnosQueryModel(queryCopy);
  const options: Array<SelectableValue<string>> = [];
  if (!model.hasFill()) {
    options.push(toSelectableValue('fill(null)'));
  }
  if (!model.hasGroupByTime()) {
    options.push(toSelectableValue('time($interval)'));
  }
  options.push(toSelectableValue('tag(default_tag)'));
  return options;
}

type Part = {
  name: string;
  params: PartParams;
};

function getPartParams(part: SelectItem, dynamicParamOptions: Map<string, () => Promise<string[]>>): PartParams {
  const def = queryPart.create(part).def;

  const paramValues = (part.params ?? []).map((p) => p.toString());
  if (paramValues.length !== def.params.length) {
    throw new Error('Invalid query-segment');
  }

  return paramValues.map((val, index) => {
    const defParam = def.params[index];
    if (defParam.dynamicLookup) {
      return {
        value: val,
        options: unwrap(dynamicParamOptions.get(`${def.type}_${index}`)),
      };
    }

    if (defParam.options != null) {
      return {
        value: val,
        options: () => Promise.resolve(defParam.options),
      };
    }

    return {
      value: val,
      options: null,
    };
  });
}

export function makePartList(
  queryParts: SelectItem[],
  dynamicParamOptions: Map<string, () => Promise<string[]>>
): Part[] {
  return queryParts.map((qp) => {
    return {
      name: qp.type,
      params: getPartParams(qp, dynamicParamOptions),
    };
  });
}
