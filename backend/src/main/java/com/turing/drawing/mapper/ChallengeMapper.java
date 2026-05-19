package com.turing.drawing.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.turing.drawing.entity.Challenge;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

/**
 * 主题挑战 Mapper
 */
@Mapper
public interface ChallengeMapper extends BaseMapper<Challenge> {

    /** 递增参与人数 */
    @Update("UPDATE challenges SET participant_count = participant_count + 1 WHERE id = #{id}")
    void incrementParticipantCount(Long id);
}