import { uniqueId } from 'lodash';
import { useRef } from 'react';

import { SelectableValue } from '@grafana/data';

import { TagItem } from './types';

function isRegex(text: string): boolean {
  return /^\/.*\/$/.test(text);
}

export function regexEscape(value: string) {
  return value.replace(/[\\^$*+?.()|[\]{}\/]/g, '\\$&');
}

export function unwrap<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error('value must not be nullish');
  }
  return value;
}

export function useUniqueId(): string {
  // we need to lazy-init this ref.
  // otherwise we would call `uniqueId`
  // on every render. unfortunately
  // useRef does not have lazy-init builtin,
  // like useState does. we do it manually.
  const idRefLazy = useRef<string | null>(null);

  if (idRefLazy.current == null) {
    idRefLazy.current = uniqueId();
  }

  return idRefLazy.current;
}

export function toSelectableValue<T extends string>(t: T): SelectableValue<T> {
  return { label: t, value: t };
}

export function getOperator(tag: TagItem): string {
  return tag.operator ?? (isRegex(tag.value) ? '=~' : '=');
}

// FIXME: sync these to the query-string-generation-code
// probably it's in influx_query_model.ts
export function getCondition(tag: TagItem, isFirst: boolean): string | undefined {
  return isFirst ? undefined : tag.condition ?? 'AND';
}

export function adjustOperatorIfNeeded(currentOperator: string, newTagValue: string): string {
  const isCurrentOperatorRegex = currentOperator === '=~' || currentOperator === '!~';
  const isNewTagValueRegex = isRegex(newTagValue);

  if (isNewTagValueRegex) {
    return isCurrentOperatorRegex ? currentOperator : '=~';
  } else {
    return isCurrentOperatorRegex ? '=' : currentOperator;
  }
}
