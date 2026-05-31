export function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatDisplayText(value: unknown): string {
  if (value === null || value === undefined) return '';

  return String(value)
    .replace(/[_-]+/g, ' ')
    .split(/(\s*[|·/]\s*)/)
    .map((part) => {
      if (/^\s*[|·/]\s*$/.test(part)) return part;

      return part.replace(/\b\w\S*/g, (word) => {
        if (word === word.toUpperCase()) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      });
    })
    .join('');
}
