type PaginationInput = {
  page?: number;
  limit?: number;
  all?: boolean;
  defaultPage?: number;
  defaultLimit?: number;
  maxLimit?: number;
};

export const resolvePagination = ({
  page,
  limit,
  all,
  defaultPage = 1,
  defaultLimit = 20,
  maxLimit = 100,
}: PaginationInput) => {
  const isAll = all === true;
  const safePage = Math.max(1, page ?? defaultPage);
  const safeLimit = Math.min(maxLimit, Math.max(1, limit ?? defaultLimit));
  const skip = (safePage - 1) * safeLimit;

  return {
    page: safePage,
    limit: safeLimit,
    skip,
    take: safeLimit,
    isAll,
  };
};

export const buildPaginationMeta = ({
  page,
  limit,
  total,
  isAll,
}: {
  page: number;
  limit: number;
  total: number;
  isAll: boolean;
}) => {
  if (isAll) {
    return {
      page: 1,
      limit: total,
      total,
      pages: total === 0 ? 0 : 1,
    };
  }

  return {
    page,
    limit,
    total,
    pages: total === 0 ? 0 : Math.ceil(total / limit),
  };
};

