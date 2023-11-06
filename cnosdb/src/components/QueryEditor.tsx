import { css } from '@emotion/css';
import React from 'react';

import { QueryEditorProps } from '@grafana/data';

import { CnosDataSource } from '../datasource';
import { CnosDataSourceOptions, CnosQuery } from '../types';
import { buildRawQuery } from '../query_utils';
import { RawQueryEditor } from './RawQueryEditor';
import { QueryEditorModeSwitcher } from './QueryEditorModeSwitcher';
import { VisualQueryEditor } from './VisualQueryEditor';

type Props = QueryEditorProps<CnosDataSource, CnosQuery, CnosDataSourceOptions>;

export const QueryEditor = ({ query, onChange, onRunQuery, datasource }: Props): React.JSX.Element => {
  return (
    <div className={css({ display: 'flex' })}>
      <div className={css({ flexGrow: 1 })}>
        {query.rawQuery ? (
          <RawQueryEditor query={query} onChange={onChange} onRunQuery={onRunQuery} />
        ) : (
          <VisualQueryEditor query={query} onChange={onChange} onRunQuery={onRunQuery} datasource={datasource} />
        )}
      </div>
      <QueryEditorModeSwitcher
        isRaw={query.rawQuery ?? false}
        onChange={(value) => {
          onChange({ ...query, queryText: buildRawQuery(query), rawQuery: value });
          onRunQuery();
        }}
      />
    </div>
  );
};
