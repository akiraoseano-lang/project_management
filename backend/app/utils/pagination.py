from math import ceil


def get_pagination(
    page: int,
    page_size: int,
    total: int
):
    if page < 1:
        page = 1

    if page_size < 1:
        page_size = 20

    if page_size > 100:
        page_size = 100

    offset = (page - 1) * page_size

    total_pages = ceil(total / page_size) if total > 0 else 0

    return offset, total_pages