package com.turing.drawing.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.turing.drawing.entity.DailyCheckin;
import com.turing.drawing.entity.User;
import com.turing.drawing.mapper.DailyCheckinMapper;
import com.turing.drawing.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Map;

/**
 * 每日任务 & 签到服务
 * 核心召回机制：签到奖励免费生图次数
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DailyTaskService {

    private final DailyCheckinMapper checkinMapper;
    private final UserMapper userMapper;

    /**
     * 每日签到
     * 连续签到奖励递增：
     * 1天=1次, 2天=1次, 3天=2次, 5天=2次, 7天=3次
     */
    @Transactional
    public Map<String, Object> checkin(Long userId) {
        if (userId == null || userId <= 0) {
            return Map.of("success", false, "message", "请先登录");
        }

        String todayStr = LocalDate.now().toString();
        LocalDate today = LocalDate.now();

        // 检查今天是否已签到
        Long alreadyChecked = checkinMapper.selectCount(
                new LambdaQueryWrapper<DailyCheckin>()
                        .eq(DailyCheckin::getUserId, userId)
                        .eq(DailyCheckin::getCheckinDate, today));
        if (alreadyChecked > 0) {
            return Map.of("success", false, "message", "今日已签到");
        }

        // 计算连续签到天数
        int streakDays = 1;
        String yesterdayStr = today.minusDays(1).toString();

        // 查找最近一次签到
        DailyCheckin yesterday = checkinMapper.selectOne(
                new LambdaQueryWrapper<DailyCheckin>()
                        .eq(DailyCheckin::getUserId, userId)
                        .eq(DailyCheckin::getCheckinDate, today.minusDays(1)));

        if (yesterday != null) {
            streakDays = yesterday.getStreakDays() + 1;
        }

        // 根据连续天数计算奖励
        int reward = streakDays >= 7 ? 3 : streakDays >= 3 ? 2 : 1;

        // 写入签到记录
        DailyCheckin record = DailyCheckin.builder()
                .userId(userId).checkinDate(today)
                .streakDays(streakDays).rewardTimes(reward).build();
        checkinMapper.insert(record);

        // 发放奖励次数
        User user = userMapper.selectById(userId);
        if (user != null) {
            int newQuota = (user.getDailyQuota() != null ? user.getDailyQuota() : 10) + reward;
            userMapper.update(null, new LambdaUpdateWrapper<User>()
                    .eq(User::getId, userId)
                    .set(User::getDailyQuota, newQuota));
        }

        log.info("[签到] userId={}, 连续{}天, 获得{}次", userId, streakDays, reward);

        return Map.of(
                "success", true,
                "streakDays", streakDays,
                "rewardTimes", reward,
                "message", "签到成功！获得 " + reward + " 次生图奖励"
        );
    }

    /**
     * 获取今日签到状态
     */
    public Map<String, Object> getTodayStatus(Long userId) {
        if (userId == null || userId <= 0) {
            return Map.of("checkedIn", false, "streakDays", 0);
        }

        DailyCheckin today = checkinMapper.selectOne(
                new LambdaQueryWrapper<DailyCheckin>()
                        .eq(DailyCheckin::getUserId, userId)
                        .eq(DailyCheckin::getCheckinDate, LocalDate.now()));

        int streakDays = today != null ? today.getStreakDays() : 0;

        DailyCheckin yesterday = checkinMapper.selectOne(
                new LambdaQueryWrapper<DailyCheckin>()
                        .eq(DailyCheckin::getUserId, userId)
                        .eq(DailyCheckin::getCheckinDate, LocalDate.now().minusDays(1)));

        if (today == null && yesterday == null) streakDays = 0;
        else if (today == null && yesterday != null) streakDays = yesterday.getStreakDays();

        return Map.of(
                "checkedIn", today != null,
                "streakDays", streakDays,
                "nextReward", streakDays >= 7 ? 3 : streakDays >= 2 ? 2 : 1
        );
    }
}
