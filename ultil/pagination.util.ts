export const parsePagination = (query: Record<string, string>) => {
    const page = Math.max(1, parseInt(query.page ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? "10", 10)));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

export const buildMeta = (total: number, page: number, limit: number) => ({
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
});
