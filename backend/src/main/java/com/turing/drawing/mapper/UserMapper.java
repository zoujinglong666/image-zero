package com.turing.drawing.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.turing.drawing.entity.User;
import org.apache.ibatis.annotations.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 用户 Mapper 接口
 * 迁移自 UserRepository
 */
@Mapper
public interface UserMapper extends BaseMapper<User> {

    /** 根据uid查找用户 */
    @Select("SELECT * FROM users WHERE uid = #{uid} AND is_active = 1")
    Optional<User> findByUid(String uid);

    /** 根据openid_hash查找用户 */
    @Select("SELECT * FROM users WHERE openid_hash = #{openidHash} AND is_active = 1")
    Optional<User> findByOpenidHash(String openidHash);

    /** 根据微信OpenID查找用户 */
    @Select("SELECT * FROM users WHERE wechat_openid = #{wechatOpenid} AND is_active = 1")
    Optional<User> findByWechatOpenid(String wechatOpenid);

    /** 根据邮箱查找用户 */
    @Select("SELECT * FROM users WHERE email = #{email} AND is_active = 1")
    Optional<User> findByEmail(String email);

    /** 检查uid是否存在 */
    @Select("SELECT COUNT(*) > 0 FROM users WHERE uid = #{uid}")
    boolean existsByUid(String uid);

    /** 检查邮箱是否存在 */
    @Select("SELECT COUNT(*) > 0 FROM users WHERE email = #{email}")
    boolean existsByEmail(String email);

    /** 检查微信OpenID是否存在 */
    @Select("SELECT COUNT(*) > 0 FROM users WHERE wechat_openid = #{wechatOpenid}")
    boolean existsByWechatOpenid(String wechatOpenid);

    /**
     * 更新用户最后登录时间
     */
    @Update("UPDATE users SET last_login_at = #{loginTime}, updated_at = NOW() WHERE id = #{userId}")
    void updateLastLoginAt(Long userId, LocalDateTime loginTime);

    /**
     * 更新用户VIP信息
     */
    @Update("UPDATE users SET vip_level = #{vipLevel}, vip_expire_at = #{expireAt}, daily_quota = #{quota}, updated_at = NOW() WHERE id = #{userId}")
    void updateVipInfo(Long userId, Integer vipLevel, Long expireAt, Integer quota);

    /**
     * 绑定微信OpenID
     */
    @Update("UPDATE users SET wechat_openid = #{openid}, wechat_unionid = #{unionid}, " +
            "wechat_nickname = #{nickname}, wechat_avatar_url = #{avatarUrl}, type = 'wechat', updated_at = NOW() " +
            "WHERE id = #{userId}")
    void bindWechat(Long userId, String openid, String unionid, String nickname, String avatarUrl);

    /**
     * 更新微信用户信息（H5网页授权获取到昵称/头像时更新）
     * 仅更新非null字段，不修改type
     */
    @Update("<script>" +
            "UPDATE users SET updated_at = NOW()" +
            "<if test='nickname != null'>, wechat_nickname = #{nickname}, nickname = COALESCE(nickname, #{nickname})</if>" +
            "<if test='avatarUrl != null'>, wechat_avatar_url = #{avatarUrl}, avatar_url = COALESCE(avatar_url, #{avatarUrl})</if>" +
            "<if test='unionid != null'>, wechat_unionid = #{unionid}</if>" +
            " WHERE id = #{userId}" +
            "</script>")
    void updateWechatInfo(Long userId, String nickname, String avatarUrl, String unionid);

    /**
     * 复杂查询：查询用户及其相关信息
     */
    User selectUserWithDetails(Long userId);

    /**
     * 动态条件查询用户列表
     */
    List<User> selectUserListWithConditions(@Param("vipLevel") Integer vipLevel,
                                           @Param("type") String type,
                                           @Param("startDate") LocalDateTime startDate,
                                           @Param("endDate") LocalDateTime endDate,
                                           @Param("keyword") String keyword);
}