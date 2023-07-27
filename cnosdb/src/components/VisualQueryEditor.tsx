import { css } from '@emotion/css';
import React, { useMemo } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { InlineLabel, SegmentSection, useStyles2 } from '@grafana/ui';

import { CnosDataSource } from '../datasource';
import { CnosQuery, TagItem } from '../types';
import {
  addNewGroupByPart,
  addNewSelectPart,
  changeGroupByPart,
  changeSelectPart,
  normalizeQuery,
  removeGroupByPart,
  removeSelectPart,
} from '../query_utils';
import { getAllTables, getFieldNamesFromTable, getTagKeysFromTable, getTagValuesFromTable } from '../meta_query';
import { getNewGroupByPartOptions, getNewSelectPartOptions, makePartList } from './part_list_utils';
import { FromSection } from './FromSection';
import { TagsSection } from './TagsSection';
import { PartListSection } from './PartListSection';
import { InputSection } from './InputSection';
import { OrderByTimeSection } from './OrderBySection';

type Props = {
  query: CnosQuery;
  onChange: (query: CnosQuery) => void;
  onRunQuery: () => void;
  datasource: CnosDataSource;
};

export const VisualQueryEditor = (props: Props): JSX.Element => {
  const styles = useStyles2((theme: GrafanaTheme2) => {
    return {
      inlineLabel: css`
        color: ${theme.colors.primary.text};
      `,
    };
  });
  const query = normalizeQuery(props.query);
  const { datasource } = props;
  const { table } = query;

  const allTagKeys = useMemo(() => {
    return getTagKeysFromTable(table, [], datasource).then((tags) => {
      return new Set(tags);
    });
  }, [table, datasource]);

  const selectLists = useMemo(() => {
    const selectPartOptions = new Map([
      [
        'field_0',
        () => {
          return table !== undefined ? getFieldNamesFromTable(table, datasource) : Promise.resolve([]);
        },
      ],
    ]);
    return (query.select ?? []).map((sel) => makePartList(sel, selectPartOptions));
  }, [table, query.select, datasource]);

  const getTagKeys = useMemo(() => {
    return () => allTagKeys.then((keys) => getTagKeysFromTable(table, filterTags(query.tags ?? [], keys), datasource));
  }, [table, query.tags, datasource, allTagKeys]);

  function filterTags(parts: TagItem[], allTagKeys: Set<string>): TagItem[] {
    return parts.filter((t) => allTagKeys.has(t.key));
  }

  const groupByList = makePartList(
    query.groupBy ?? [],
    new Map([
      [
        'tag_0',
        () => {
          return Promise.resolve([]);
        },
      ],
    ])
  );

  const onAppliedChange = (newQuery: CnosQuery) => {
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
    onAppliedChange({
      ...query,
      tags: tags.length === 0 ? undefined : tags,
    });
  };

  return (
    <div className="gf-form-group">
      <SegmentSection label="FROM" fill={false}>
        <FromSection
          table={table}
          onChange={handleFromSectionChange}
          getTableOptions={(filter) => getAllTables(filter === '' ? undefined : filter, datasource)}
        />
        <InlineLabel width="auto" className={styles.inlineLabel}>
          WHERE
        </InlineLabel>
        <TagsSection
          tags={query.tags ?? []}
          onChange={handleTagsSectionChange}
          getTagKeyOptions={getTagKeys}
          getTagValueOptions={(key: string) => {
            return allTagKeys.then((keys) => {
              return getTagValuesFromTable(table, key, filterTags(query.tags ?? [], keys), datasource);
            });
          }}
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
          getNewPartOptions={() => getNewGroupByPartOptions(query, () => Promise.resolve([]))}
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
      <SegmentSection label="LIMIT" fill={true}>
        <InputSection
          placeholder="(optional)"
          value={query.limit?.toString()}
          onChange={(limit) => {
            onAppliedChange({ ...query, limit });
          }}
        />
        <InlineLabel width="auto" className={styles.inlineLabel}>
          ORDER BY TIME
        </InlineLabel>
        <OrderByTimeSection
          value={query.orderByTime === 'DESC' ? 'DESC' : 'ASC'}
          onChange={(v) => {
            onAppliedChange({ ...query, orderByTime: v });
          }}
        />
      </SegmentSection>
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

// GroupBySection:
// > GroupByPart: Field, Interval
//   > Field $field: $column in FieldOptions
//   => sql: group by "$field"
//   > Interval $interval: customized | $string in IntervalOptions
//   => sql: group by time($imterval)

// LimitSection:
// > ByLimit: $limit: number
//   => sql: limit limit
// > ByOffsetLimit: $offset, $limit
//   => sql: $offset, $limit
