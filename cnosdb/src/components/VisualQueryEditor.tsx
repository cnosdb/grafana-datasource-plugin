import { css } from '@emotion/css';
import React, { useMemo } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { InlineLabel, SegmentSection, useStyles2 } from '@grafana/ui';
import { getTemplateSrv } from '@grafana/runtime';

import {
  getAllMeasurementsForTags,
  getFieldKeysForMeasurement,
  getTagKeysForMeasurementAndTags,
  getTagValues,
} from '../influxql_meta_query';
import { DataSource } from '../datasource';
import { MyQuery, TagItem } from '../types';
import { useUniqueId } from '../utils';
import {
  addNewGroupByPart,
  addNewSelectPart,
  changeGroupByPart,
  changeSelectPart,
  normalizeQuery,
  removeGroupByPart,
  removeSelectPart,
} from '../query_utils';
import { getNewGroupByPartOptions, getNewSelectPartOptions, makePartList } from './part_list_utils';
import { FromSection } from './FromSection';
import { TagsSection } from './TagsSection';
import { PartListSection } from './PartListSection';
import { OrderBySection } from './OrderBySection';
import { InputSection } from './InputSection';

function getTemplateVariableOptions() {
  return (
    getTemplateSrv()
      .getVariables()
      // we make them regex-params, i'm not 100% sure why.
      // probably because this way multi-value variables work ok too.
      .map((v) => `/^$${v.name}$/`)
  );
}

// helper function to make it easy to call this from the widget-render-code
function withTemplateVariableOptions(optionsPromise: Promise<string[]>): Promise<string[]> {
  return optionsPromise.then((options) => [...getTemplateVariableOptions(), ...options]);
}

// it is possible to add fields into the `InfluxQueryTag` structures, and they do work,
// but in some cases, when we do metadata queries, we have to remove them from the queries.
function filterTags(parts: TagItem[], allTagKeys: Set<string>): TagItem[] {
  return parts.filter((t) => allTagKeys.has(t.key));
}

type Props = {
  query: MyQuery;
  onChange: (query: MyQuery) => void;
  onRunQuery: () => void;
  datasource: DataSource;
};

export const VisualQueryEditor = (props: Props): JSX.Element => {
  const uniqueId = useUniqueId();
  const orderByTimeId = `influxdb-qe-order-by${uniqueId}`;

  const styles = useStyles2(getStyles);
  const query = normalizeQuery(props.query);
  const { datasource } = props;
  const { table } = query;

  console.log('Building VisualQueryEditor', query);

  const allTagKeys = useMemo(() => {
    return getTagKeysForMeasurementAndTags(table, [], datasource).then((tags) => {
      return new Set(tags);
    });
  }, [table, datasource]);

  const selectLists = useMemo(() => {
    const dynamicSelectPartOptions = new Map([
      [
        'field_0',
        () => {
          return table !== undefined ? getFieldKeysForMeasurement(table, datasource) : Promise.resolve([]);
        },
      ],
    ]);
    return (query.select ?? []).map((sel) => makePartList(sel, dynamicSelectPartOptions));
  }, [table, query.select, datasource]);

  // the following function is not complicated enough to memoize, but it's result
  // is used in both memoized and un-memoized parts, so we have no choice
  const getTagKeys = useMemo(() => {
    return () =>
      allTagKeys.then((keys) => getTagKeysForMeasurementAndTags(table, filterTags(query.tags ?? [], keys), datasource));
  }, [table, query.tags, datasource, allTagKeys]);

  const groupByList = useMemo(() => {
    const dynamicGroupByPartOptions = new Map([['tag_0', getTagKeys]]);

    return makePartList(query.groupBy ?? [], dynamicGroupByPartOptions);
  }, [getTagKeys, query.groupBy]);

  const onAppliedChange = (newQuery: MyQuery) => {
    props.onChange(newQuery);
    props.onRunQuery();
  };

  const handleFromSectionChange = (table: string | undefined) => {
    onAppliedChange({
      ...query,
      table: table,
    });
  };

  const handleTagsSectionChange = (tags: TagItem[]) => {
    // we set empty-arrays to undefined
    onAppliedChange({
      ...query,
      tags: tags.length === 0 ? undefined : tags,
    });
  };

  return (
    <div>
      <SegmentSection label="FROM" fill={true}>
        <FromSection
          table={table}
          getTableOptions={(filter) =>
            withTemplateVariableOptions(
              allTagKeys.then((keys) =>
                getAllMeasurementsForTags(
                  filter === '' ? undefined : filter,
                  filterTags(query.tags ?? [], keys),
                  datasource
                )
              )
            )
          }
          onChange={handleFromSectionChange}
        />
        <InlineLabel width="auto" className={styles.inlineLabel}>
          WHERE
        </InlineLabel>
        <TagsSection
          tags={query.tags ?? []}
          onChange={handleTagsSectionChange}
          getTagKeyOptions={getTagKeys}
          getTagValueOptions={(key: string) =>
            withTemplateVariableOptions(
              allTagKeys.then((keys) => getTagValues(key, table, filterTags(query.tags ?? [], keys), datasource))
            )
          }
        />
      </SegmentSection>
      {selectLists.map((sel, index) => (
        <SegmentSection key={index} label={index === 0 ? 'SELECT' : ''} fill={true}>
          <PartListSection
            parts={sel}
            getNewPartOptions={() => Promise.resolve(getNewSelectPartOptions())}
            onChange={(partIndex, newParams) => {
              const newQuery = changeSelectPart(query, index, partIndex, newParams);
              onAppliedChange(newQuery);
            }}
            onAddNewPart={(type) => {
              onAppliedChange(addNewSelectPart(query, type, index));
            }}
            onRemovePart={(partIndex) => {
              onAppliedChange(removeSelectPart(query, partIndex, index));
            }}
          />
        </SegmentSection>
      ))}
      <SegmentSection label="GROUP BY" fill={true}>
        <PartListSection
          parts={groupByList}
          getNewPartOptions={() => getNewGroupByPartOptions(query, getTagKeys)}
          onChange={(partIndex, newParams) => {
            const newQuery = changeGroupByPart(query, partIndex, newParams);
            onAppliedChange(newQuery);
          }}
          onAddNewPart={(type) => {
            onAppliedChange(addNewGroupByPart(query, type));
          }}
          onRemovePart={(partIndex) => {
            onAppliedChange(removeGroupByPart(query, partIndex));
          }}
        />
      </SegmentSection>
      <SegmentSection label="TIMEZONE" fill={true}>
        <InlineLabel htmlFor={orderByTimeId} width="auto" className={styles.inlineLabel}>
          ORDER BY TIME
        </InlineLabel>
        <OrderBySection
          inputId={orderByTimeId}
          value={query.orderByTime === 'DESC' ? 'DESC' : 'ASC' /* FIXME: make this shared with influx_query_model */}
          onChange={(v) => {
            onAppliedChange({ ...query, orderByTime: v });
          }}
        />
      </SegmentSection>
      {/* query.fill is ignored in the query-editor, and it is deleted whenever
          query-editor changes. the influx_query_model still handles it, but the new
          approach seem to be to handle "fill" inside query.groupBy. so, if you
          have a panel where in the json you have query.fill, it will be applied,
          as long as you do not edit that query. */}
      <SegmentSection label="LIMIT" fill={true}>
        <InputSection
          placeholder="(optional)"
          value={query.limit?.toString()}
          onChange={(limit) => {
            onAppliedChange({ ...query, limit });
          }}
        />
      </SegmentSection>
    </div>
  );
};

export const SelectSection = (): JSX.Element => {
  return (
    <div className="gf-form-inline">
      <div className="gf-form">
        <SegmentSection key="kEY" label="LABEL" fill={true}>
          {/* <div className={cx('gf-form-label', css({ paddingLeft: '0' }))}></div> */}
          {/*<Segment Component={AddButton} onChange={({ value }) => action('New value added')(value)} options={options} />*/}
        </SegmentSection>
      </div>
    </div>
  );
};

// SelectSection:
// > SelectFieldPart: type=[ Field, Function, Relation ], alias=string
//   > Field $field: $column in FieldOptions
//     => sql: select "$field" as "$alias"
//   > Function: > [ FunctionOption, FieldOption ]
//     => sql: select function("field") as "$alias"
//   > Relation: > [ SelectFieldPart, OperatorOption, SelectFieldPart ]
//     => sql: select ("$field" operator "$field") as "$alias"
//     => sql: select (function("$field") operator function("$field")) as "$alias"
export const SelectField = (): JSX.Element => {
  return (
    <div>
      <InlineLabel width={7}>SELECT</InlineLabel>
    </div>
  );
};

// GroupBySection:
// > GroupByPart: Field, Interval
//   > Field $field: $column in FieldOptions
//   => sql: group by "$field"
//   > Interval $interval: customized | $string in IntervalOptions
//   => sql: group by time($imterval)
export const GroupBySection = (): JSX.Element => {
  return (
    <div>
      <InlineLabel width={14}>GROUP BY</InlineLabel>
    </div>
  );
};

// LimitSection:
// > ByLimit: $limit: number
//   => sql: limit limit
// > ByOffsetLimit: $offset, $limit
//   => sql: $offset, $limit
export const LimitSection = (): JSX.Element => {
  return (
    <div>
      <InlineLabel width={14}>LIMIT</InlineLabel>
    </div>
  );
};

function getStyles(theme: GrafanaTheme2) {
  return {
    inlineLabel: css`
      color: ${theme.colors.primary.text};
    `,
  };
}
