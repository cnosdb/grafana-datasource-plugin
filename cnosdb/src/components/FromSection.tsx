import React from 'react';

import { toSelectableValue } from '../utils';
import { Seg } from './Seg';

type FromSectionProps = {
  onChange: (table: string | undefined) => void;
  table: string | undefined;
  getTableOptions: (filter: string) => Promise<string[]>;
};

// FromSection:
// > FROM $table: TableOptions
// > Time column $time: $column in FieldOptions
// > Metric column $metric: $column in TagOptions
//   => sql: select "$time", "$metric", "$field" from "$table" group by "metric"
export const FromSection = ({ onChange, table, getTableOptions }: FromSectionProps): JSX.Element => {
  const handleTableLoadOptions = async (filter: string) => {
    const allTables = await getTableOptions(filter);
    return allTables.map(toSelectableValue);
  };
  // return (
  //   <div className="gf-form-inline">
  //     <div className="gf-form">
  //       <InlineLabel width={7}>FROM</InlineLabel>
  //       <Select options={tableOptions} onChange={onSelectChange} />

  //       <InlineLabel width={14}>Time column</InlineLabel>
  //       <Select options={columnOptions} onChange={onSelectChange} />

  //       <InlineLabel width={14}>Metric column</InlineLabel>
  //       <Select options={columnOptions} onChange={onSelectChange} />
  //     </div>
  //   </div>
  // );
  return (
    <>
      <Seg
        allowCustomValue
        value={table ?? 'select table'}
        loadOptions={handleTableLoadOptions}
        filterByLoadOptions
        onChange={(v) => {
          onChange(v.value);
        }}
      />
    </>
  );
};
