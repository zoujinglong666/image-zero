package com.turing.drawing.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.turing.drawing.entity.InviteRecord;
import com.turing.drawing.entity.User;
import com.turing.drawing.mapper.InviteRecordMapper;
import com.turing.drawing.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

/**
 * 邀请裂变服务
 * 邀请码生成、邀请关系记录、奖励发放
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InviteService {

    private final UserMapper userMapper;
    private final InviteRecordMapper inviteRecordMapper;
    private final UserPreferenceService userPreferenceService;

    /** 邀请成功奖励：双方各得 3 次免费生图 */
    private static final int INVITE_REWARD_COUNT = 3;

    // ══════════════════════════════════════════════════════
    //  邀请码管理
    // ══════════════════════════════════════════════════════

    /**
     * 生成用户邀请码（6位字母数字）
     */
    public String generateInviteCode() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
    }

    /**
     * 获取或创建用户邀请码
     */
    public String getOrCreateInviteCode(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) return null;

        if (user.getInviteCode() != null && !user.getInviteCode().isBlank()) {
            return user.getInviteCode();
        }

        // 生成唯一邀请码
        String code;
        int attempts = 0;
        do {
            code = generateInviteCode();
            attempts++;
        } while (userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getInviteCode, code)) > 0
                && attempts < 10);

        userMapper.update(null, new LambdaUpdateWrapper<User>()
                .eq(User::getId, userId)
                .set(User::getInviteCode, code));

        log.info("[邀请] 为用户 {} 生成邀请码: {}", userId, code);
        return code;
    }

    /**
     * 通过邀请码查找用户
     */
    public User findByInviteCode(String code) {
        if (code == null || code.isBlank()) return null;
        return userMapper.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getInviteCode, code));
    }

    // ══════════════════════════════════════════════════════
    //  邀请关系处理
    // ══════════════════════════════════════════════════════

    /**
     * 记录邀请关系（被邀请人注册时调用）
     * @param inviteeId 被邀请人ID
     * @param inviteCode 邀请码
     */
    @Transactional
    public void recordInvite(Long inviteeId, String inviteCode) {
        if (inviteeId == null || inviteeId <= 0 || inviteCode == null || inviteCode.isBlank()) {
            return;
        }

        // 查找邀请人
        User inviter = findByInviteCode(inviteCode);
        if (inviter == null) {
            log.warn("[邀请] 无效的邀请码: {}", inviteCode);
            return;
        }

        // 不能邀请自己
        if (inviter.getId().equals(inviteeId)) {
            log.warn("[邀请] 用户 {} 尝试邀请自己", inviteeId);
            return;
        }

        // 检查是否已有邀请关系
        Long existingCount = inviteRecordMapper.selectCount(
                new LambdaQueryWrapper<InviteRecord>()
                        .eq(InviteRecord::getInviterId, inviter.getId())
                        .eq(InviteRecord::getInviteeId, inviteeId));
        if (existingCount > 0) {
            log.info("[邀请] 邀请关系已存在: inviter={}, invitee={}", inviter.getId(), inviteeId);
            return;
        }

        // 创建邀请记录
        InviteRecord record = InviteRecord.builder()
                .inviterId(inviter.getId())
                .inviteeId(inviteeId)
                .status("registered")
                .rewardGiven(false)
                .build();
        inviteRecordMapper.insert(record);

        // 标记被邀请人的邀请人
        userMapper.update(null, new LambdaUpdateWrapper<User>()
                .eq(User::getId, inviteeId)
                .set(User::getInvitedBy, inviter.getId()));

        log.info("[邀请] 记录邀请关系: inviter={}, invitee={}", inviter.getId(), inviteeId);
    }

    /**
     * 完成邀请奖励发放（被邀请人完成首次生图后调用）
     */
    @Transactional
    public void completeInviteReward(Long inviteeId) {
        if (inviteeId == null || inviteeId <= 0) return;

        // 查找待完成的邀请记录
        InviteRecord record = inviteRecordMapper.selectOne(
                new LambdaQueryWrapper<InviteRecord>()
                        .eq(InviteRecord::getInviteeId, inviteeId)
                        .eq(InviteRecord::getStatus, "registered")
                        .eq(InviteRecord::getRewardGiven, false));

        if (record == null) return;

        // 发放奖励给邀请人
        grantReward(record.getInviterId(), "邀请好友奖励");
        // 发放奖励给被邀请人
        grantReward(inviteeId, "新用户注册奖励");

        // 更新记录状态
        record.setStatus("completed");
        record.setRewardGiven(true);
        inviteRecordMapper.updateById(record);

        log.info("[邀请] 奖励已发放: inviter={}, invitee={}", record.getInviterId(), inviteeId);
    }

    /**
     * 发放免费生图次数奖励
     */
    private void grantReward(Long userId, String reason) {
        // 通过 user_preferences 表增加今日生成次数
        // 这里简化处理：直接增加 daily_quota
        User user = userMapper.selectById(userId);
        if (user == null) return;

        int newQuota = (user.getDailyQuota() != null ? user.getDailyQuota() : 10) + INVITE_REWARD_COUNT;
        userMapper.update(null, new LambdaUpdateWrapper<User>()
                .eq(User::getId, userId)
                .set(User::getDailyQuota, newQuota));

        log.info("[邀请] {}: userId={}, +{}次", reason, userId, INVITE_REWARD_COUNT);
    }

    // ══════════════════════════════════════════════════════
    //  查询
    // ══════════════════════════════════════════════════════

    /**
     * 获取用户邀请统计
     */
    public Map<String, Object> getInviteStats(Long userId) {
        if (userId == null || userId <= 0) {
            return Map.of("inviteCode", "", "totalInvites", 0, "completedInvites", 0, "totalReward", 0);
        }

        String inviteCode = getOrCreateInviteCode(userId);

        long totalInvites = inviteRecordMapper.selectCount(
                new LambdaQueryWrapper<InviteRecord>().eq(InviteRecord::getInviterId, userId));

        long completedInvites = inviteRecordMapper.selectCount(
                new LambdaQueryWrapper<InviteRecord>()
                        .eq(InviteRecord::getInviterId, userId)
                        .eq(InviteRecord::getStatus, "completed"));

        return Map.of(
                "inviteCode", inviteCode != null ? inviteCode : "",
                "totalInvites", totalInvites,
                "completedInvites", completedInvites,
                "totalReward", completedInvites * INVITE_REWARD_COUNT
        );
    }
}
