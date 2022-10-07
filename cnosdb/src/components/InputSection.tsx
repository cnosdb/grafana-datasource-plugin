import { cx, css } from '@emotion/css';
import React from 'react';

import { Input } from '@grafana/ui';

import { useShadowedState } from './use_shadowed_state';

type Props = {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  isWide?: boolean;
  placeholder?: string;
};

export const InputSection = ({ value, onChange, isWide, placeholder }: Props): JSX.Element => {
  const [currentValue, setCurrentValue] = useShadowedState(value);

  const onBlur = () => {
    // we send empty-string as undefined
    const newValue = currentValue === '' ? undefined : currentValue;
    onChange(newValue);
  };

  return (
    <>
      <Input
        placeholder={placeholder}
        className={cx(
          isWide ?? false ? 'width-14' : 'width-8',
          css({
            paddingRight: '4px',
          })
        )}
        type="text"
        spellCheck={false}
        onBlur={onBlur}
        onChange={(e) => {
          setCurrentValue(e.currentTarget.value);
        }}
        value={currentValue ?? ''}
      />
    </>
  );
};
