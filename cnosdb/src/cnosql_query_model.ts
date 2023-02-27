import {filter, find, indexOf, map} from 'lodash';

import {ScopedVars} from '@grafana/data';
import {TemplateSrv} from '@grafana/runtime';

import {CnosQuery, SelectItem, TagItem} from './types';
import {QueryPart} from './query_part';
import {regexEscape} from './utils';
import queryPart from './cnosql_query_part';

export default class CnosQueryModel {
  target: CnosQuery;
  selectModels: any[] = [];
  queryBuilder: any;
  groupByParts: any;
  templateSrv?: TemplateSrv;
  scopedVars: any;
  refId?: string;

  /** @ngInject */
  constructor(target: CnosQuery, templateSrv?: TemplateSrv, scopedVars?: ScopedVars) {
    this.target = target;
    this.templateSrv = templateSrv;
    this.scopedVars = scopedVars;

    target.orderByTime = target.orderByTime || 'ASC';
    target.tags = target.tags || [];
    target.groupBy = target.groupBy || [
      {type: 'time', params: ['1 minute']},
      {type: 'fill', params: ['null']},
    ];
    target.select = target.select || [
      [
        {type: 'field', params: ['default_field']},
        {type: 'avg', params: []},
      ],
    ];

    this.updateProjection();
  }

  updateProjection() {
    this.selectModels = map(this.target.select, (parts: any) => {
      return map(parts, queryPart.create);
    });
    delete this.target.interval;
    delete this.target.fill;
    this.groupByParts = map(this.target.groupBy, (part: any) => {
      if (part.type === 'time') {
        // from: GROUP BY time($interval)
        // to: "GROUP BY time", "DATE_BIN(... $interval ...) AS time"
        this.target.interval = part.params[0];
      } else if (part.type === 'fill') {
        this.target.fill = part.params[0];
      }
      return queryPart.create(part);
    });
  }

  updatePersistedParts() {
    this.target.select = map(this.selectModels, (selectParts) => {
      return map(selectParts, (part: any) => {
        return {type: part.def.type, params: part.params};
      });
    });
  }

  hasGroupByTime() {
    return find(this.target.groupBy, (g: any) => g.type === 'time');
  }

  hasFill() {
    return find(this.target.groupBy, (g: any) => g.type === 'fill');
  }

  addGroupBy(value: string) {
    let stringParts = value.match(/^(\w+)\((.*)\)$/);

    if (!stringParts || !this.target.groupBy) {
      return;
    }

    const typePart = stringParts[1];
    const arg = stringParts[2];
    const partModel = queryPart.create({type: typePart, params: [arg]});
    const partCount = this.target.groupBy.length;

    if (partCount === 0) {
      this.target.groupBy.push(partModel.part);
    } else if (typePart === 'time') {
      this.target.groupBy.splice(0, 0, partModel.part);
    } else if (typePart === 'tag') {
      if (this.target.groupBy[partCount - 1].type === 'fill') {
        this.target.groupBy.splice(partCount - 1, 0, partModel.part);
      } else {
        this.target.groupBy.push(partModel.part);
      }
    } else {
      this.target.groupBy.push(partModel.part);
    }

    this.updateProjection();
  }

  removeGroupByPart(part: QueryPart, index: number) {
    const categories = queryPart.getCategories();

    if (part.def.type === 'time') {
      // remove fill
      this.target.groupBy = filter(this.target.groupBy, (g: SelectItem) => g.type !== 'fill');
      // remove aggregations
      this.target.select = map(this.target.select, (s: SelectItem[]) => {
        return filter(s, (part) => {
          const partModel = queryPart.create(part);
          if (partModel.def.category === categories.Aggregations) {
            return false;
          }
          if (partModel.def.category === categories.Selectors) {
            return false;
          }
          return true;
        });
      });
    }

    this.target.groupBy!.splice(index, 1);
    this.updateProjection();
  }

  removeSelect(index: number) {
    this.target.select!.splice(index, 1);
    this.updateProjection();
  }

  removeSelectPart(selectParts: any[], part: any) {
    // if we remove the field remove the whole statement
    if (part.def.type === 'field') {
      if (this.selectModels.length > 1) {
        const modelsIndex = indexOf(this.selectModels, selectParts);
        this.selectModels.splice(modelsIndex, 1);
      }
    } else {
      const partIndex = indexOf(selectParts, part);
      selectParts.splice(partIndex, 1);
    }

    this.updatePersistedParts();
  }

  addSelectPart(selectParts: any[], type: string) {
    const partModel = queryPart.create({type: type});
    partModel.def.addStrategy(selectParts, partModel, this);
    this.updatePersistedParts();
  }

  private renderTagCondition(tag: TagItem, index: number, interpolate?: boolean) {
    // FIXME: merge this function with query_builder/renderTagCondition
    let str = '';
    let operator = tag.operator;
    let value = tag.value;
    if (index > 0) {
      str = (tag.condition || 'AND') + ' ';
    }

    if (!operator) {
      if (/^\/.*\/$/.test(value)) {
        operator = '=~';
      } else {
        operator = '=';
      }
    }

    // quote value unless regex
    if (this.templateSrv && interpolate) {
      value = this.templateSrv.replace(value, this.scopedVars);
    }
    if (operator !== '>' && operator !== '<') {
      value = "'" + value.replace(/\\/g, '\\\\').replace(/\'/g, "\\'") + "'";
    }

    return str + '"' + tag.key + '" ' + operator + ' ' + value;
  }

  getTable(interpolate: any) {
    let table = this.target.table || 'default_table';

    if (!table.match('^/.*/$')) {
      table = '"' + table + '"';
    } else if (this.templateSrv && interpolate) {
      table = this.templateSrv.replace(table, this.scopedVars, 'regex');
    }

    return table;
  }

  interpolateQueryStr(value: any[], variable: { multi: any; includeAll: any }, defaultFormatFn: any) {
    // if no multi or include all do not regexEscape
    if (!variable.multi && !variable.includeAll) {
      return value;
    }

    if (typeof value === 'string') {
      return regexEscape(value);
    }

    const escapedValues = map(value, regexEscape);
    return '(' + escapedValues.join('|') + ')';
  }

  render(interpolate?: boolean) {
    const target = this.target;

    if (target.rawQuery) {
      if (this.templateSrv && interpolate) {
        return this.templateSrv.replace(target.queryText, this.scopedVars, this.interpolateQueryStr);
      } else {
        return target.queryText ?? '';
      }
    }

    let query = 'SELECT ';
    if (target.interval) {
      query += "DATE_BIN(INTERVAL '" + target.interval + "', time, TIMESTAMP '1970-01-01T00:00:00Z') AS time, ";
    } else {
      query += 'time, ';
    }

    let i, y;
    for (i = 0; i < this.selectModels.length; i++) {
      const parts = this.selectModels[i];
      let selectText = '';
      for (y = 0; y < parts.length; y++) {
        const part = parts[y];
        selectText = part.render(selectText);
      }

      if (i > 0) {
        query += ', ';
      }
      query += selectText;
    }

    query += '\nFROM ' + this.getTable(interpolate) + '\nWHERE ';
    const conditions = map(target.tags, (tag, index) => {
      return this.renderTagCondition(tag, index, interpolate);
    });

    if (conditions.length > 0) {
      query += '(' + conditions.join(' ') + ') AND ';
    }

    query += '$timeFilter';

    let groupBySection = '';
    for (i = 0; i < this.groupByParts.length; i++) {
      const part = this.groupByParts[i];
      if (part.def.type === 'fill') {
        continue;
      }
      if (i > 0) {
        groupBySection += ', ';
      }
      groupBySection += part.render('');
    }

    if (groupBySection.length) {
      query += '\nGROUP BY ' + groupBySection;
    }

    if (target.orderByTime === 'DESC') {
      query += '\nORDER BY time DESC';
    } else {
      query += '\nORDER BY time ASC';
    }

    if (target.limit) {
      query += '\nLIMIT ' + target.limit;
    }

    return query;
  }

  renderAdhocFilters(filters: any[]) {
    const conditions = map(filters, (tag, index) => {
      return this.renderTagCondition(tag, index, true);
    });
    return conditions.join(' ');
  }

  replace() {
  }
}
