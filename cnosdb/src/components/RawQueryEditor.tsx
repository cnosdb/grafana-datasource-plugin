import React from 'react';

import {CodeEditor, HorizontalGroup, InlineFormLabel, Input} from '@grafana/ui';

import {CnosQuery} from '../types';
import {useShadowedState} from './use_shadowed_state';
import {useUniqueId} from './use_unique_id';

type Props = {
  query: CnosQuery;
  onChange: (query: CnosQuery) => void;
  onRunQuery: () => void;
};

export const RawQueryEditor = ({query, onChange, onRunQuery}: Props): JSX.Element => {
  const [currentAlias, setCurrentAlias] = useShadowedState(query.alias);
  const aliasElementId = useUniqueId();

  const onRawQueryChange = (newQuery: string) => {
    onChange({
      ...query,
      queryText: newQuery,
    });
    onRunQuery();
  };

  const onAliasChange = () => {
    onChange({
      ...query,
      alias: currentAlias,
    });
    onRunQuery();
  }

  return (
    <div>
      <CodeEditor
        width=""
        height="100px"
        language="sql"
        value={query.queryText ?? ''}
        onBlur={onRawQueryChange}
        onSave={onRawQueryChange}
        showMiniMap={false}
        showLineNumbers={true}
      />
      <HorizontalGroup>
        <InlineFormLabel htmlFor={aliasElementId}>Alias by</InlineFormLabel>
        <Input
          id={aliasElementId}
          type="text"
          spellCheck={false}
          placeholder="Naming pattern"
          onBlur={onAliasChange}
          onChange={(e) => {
            setCurrentAlias(e.currentTarget.value);
          }}
          value={currentAlias ?? ''}
        />
      </HorizontalGroup>
    </div>
  );
};
