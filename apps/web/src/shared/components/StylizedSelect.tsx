import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import {
  CheckIcon,
  ChevronUpDownIcon,
} from '@heroicons/react/20/solid';

import { classNames } from '../utils/StyleUtils';

export type StylizedSelectOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

type StylizedSelectProps<T extends string> = {
  id?: string;
  value: T;
  options: ReadonlyArray<StylizedSelectOption<T>>;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
};

export function StylizedSelect<T extends string>({
  id,
  value,
  options,
  onChange,
  disabled,
  className,
  buttonClassName,
}: StylizedSelectProps<T>) {
  const selectedOption =
    options.find((option) => option.value === value) ?? options[0];

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className={classNames('relative', className ?? '')}>
        <Listbox.Button
          id={id}
          className={classNames(
            'relative min-h-[38px] w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left text-sm text-gray-900 shadow-sm transition-colors focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400',
            buttonClassName ?? '',
          )}
        >
          <span className="block truncate">{selectedOption?.label}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
          </span>
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            {options.map((option) => (
              <Listbox.Option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={({ active, disabled: optionDisabled }) =>
                  classNames(
                    'relative cursor-default select-none py-2 pl-9 pr-3',
                    active ? 'bg-primary-50 text-primary-900' : 'text-gray-900',
                    optionDisabled ? 'text-gray-400' : '',
                  )
                }
              >
                {({ selected }) => (
                  <>
                    <span
                      className={classNames(
                        'block truncate',
                        selected ? 'font-semibold' : 'font-normal',
                      )}
                    >
                      {option.label}
                    </span>
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-primary-600">
                        <CheckIcon className="h-5 w-5" />
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}
