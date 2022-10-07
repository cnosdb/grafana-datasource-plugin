import { cx, css } from '@emotion/css';
import React from 'react';

import { SelectableValue } from '@grafana/data';
import { Select } from '@grafana/ui';

import { unwrap } from '../utils';

type Mode = 'ASC' | 'DESC';

const OPTIONS: Array<SelectableValue<Mode>> = [
  { label: 'ascending', value: 'ASC' },
  { label: 'descending', value: 'DESC' },
];

const className = cx(
  'width-9',
  css({
    paddingRight: '4px',
  })
);

type Props = {
  value: Mode;
  onChange: (value: Mode) => void;
  inputId?: string;
};

// OrderBySection:
// > Tag $tag: $column in TagOptions
// > $order: > [ ascending, descending ]
//   => sql: order by $tag $order
export const OrderBySection = ({ value, onChange, inputId }: Props): JSX.Element => {
  return (
    <>
      <Select<Mode>
        inputId={inputId}
        className={className}
        onChange={(v) => {
          onChange(unwrap(v.value));
        }}
        value={value}
        options={OPTIONS}
      />
    </>
  );
};
