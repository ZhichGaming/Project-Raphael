export const recursiveToCamel = (item: unknown): unknown => {
    if (Array.isArray(item)) {
        return item.map((el: unknown) => recursiveToCamel(el));
    } else if (typeof item === 'function' || item !== Object(item)) {
        return item;
    }
    return Object.fromEntries(
        Object.entries(item as Record<string, unknown>).map(
            ([key, value]: [string, unknown]) => [
                key.replace(/([-_][a-z])/gi, c => c.toUpperCase().replace(/[-_]/g, '')),
                recursiveToCamel(value),
            ],
        ),
    );
};
