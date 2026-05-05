export function parseContentDate(date: string) {
  const [year, month = 1, day = 1] = date
    .slice(0, 10)
    .split("-")
    .map((part) => Number(part));

  if (!year || Number.isNaN(year)) return new Date(date);
  return new Date(year, month - 1, day);
}

export function getContentDateTime(date: string) {
  return parseContentDate(date).getTime();
}
