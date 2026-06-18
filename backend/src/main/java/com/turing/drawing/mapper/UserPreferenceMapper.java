package com.turing.drawing.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.turing.drawing.entity.UserPreference;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

/**
 * 用户偏好 Mapper 接口
 * 迁移自 UserPreferenceRepository
 */
@Mapper
public interface UserPreferenceMapper extends BaseMapper<UserPreference> {

    /** 根据用户ID和偏好键查询 */
    @Select("SELECT * FROM user_preferences WHERE user_id = #{userId} AND pref_key = #{prefKey}")
    UserPreference findByUserIdAndPrefKey(Long userId, String prefKey);
}