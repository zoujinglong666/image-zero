package com.turing.drawing.dto.response;

import com.baomidou.mybatisplus.core.metadata.IPage;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 分页结果封装
 * 对齐前端 { list, pagination: { page, pageSize, total, totalPages } } 格式
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageResult<T> {

    private List<T> list;

    private Pagination pagination;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Pagination {
        private long page;
        private long pageSize;
        private long total;
        private long totalPages;
    }

    /**
     * 从 MyBatis Plus IPage 转换
     */
    public static <T> PageResult<T> of(IPage<T> iPage) {
        return new PageResult<>(
                iPage.getRecords(),
                new Pagination(
                        iPage.getCurrent(),
                        iPage.getSize(),
                        iPage.getTotal(),
                        iPage.getPages()
                )
        );
    }
}