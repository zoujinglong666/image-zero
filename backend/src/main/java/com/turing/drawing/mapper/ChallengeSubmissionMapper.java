package com.turing.drawing.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.turing.drawing.entity.ChallengeSubmission;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Update;

/**
 * 挑战投稿 Mapper
 */
@Mapper
public interface ChallengeSubmissionMapper extends BaseMapper<ChallengeSubmission> {

    /** 递增点赞数 */
    @Update("UPDATE challenge_submissions SET like_count = like_count + 1 WHERE id = #{id}")
    void incrementLikeCount(Long id);
}