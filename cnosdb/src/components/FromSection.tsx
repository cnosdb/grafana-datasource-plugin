import React from 'react';
import { toSelectableValue } from 'utils';

import {Seg} from "./Seg";

type FromSectionProps = {
  table: string | undefined;
  onChange: (table: string | undefined) => void;
  getTableOptions: (filter: string) => Promise<string[]>;
};

// TODO Use <select/> to get FROM table.
export const FromSection = ({table, onChange, getTableOptions}: FromSectionProps): JSX.Element => {
  const loadFromOptions = async (filter: string) => {
    const tables = await getTableOptions(filter);
    return tables.map(toSelectableValue);
  };
  return (
    <Seg
      allowCustomValue
      value={table ?? 'default_table'}
      loadOptions={loadFromOptions}
      onChange={(v) => {
        onChange(v.value);
      }}
    />
  );
};
