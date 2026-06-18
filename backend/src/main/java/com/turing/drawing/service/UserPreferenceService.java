package com.turing.drawing.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.turing.drawing.entity.UserPreference;
import com.turing.drawing.mapper.UserPreferenceMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Map;

/**
 * 用户偏好 & 广告记录服务
 * 复用 user_preferences 表存储广告观看记录和每日生成计数
 *
 * 存储格式:
 *   pref_key = "watched_ads"  → pref_value = JSON { "2026-05-23": 1, ... }
 *   pref_key = "gen_count_YYYY_MM_DD" → pref_value = "3" (今日已生成次数)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserPreferenceService {

    private final UserPreferenceMapper userPreferenceMapper;

    @Value("${zhipu.enable-ad-gate:true}")
    private boolean adGateEnabled;

    @Value("${wechat.mini-program-ad-unit-id:}")
    private String adUnitId;

    // ═════════════════════════════════════════════════════
    //  广告墙
    // ═════════════════════════════════════════════════════

    /** 是否开启广告墙 */
    public boolean isAdGateEnabled() {
        return adGateEnabled;
    }

    /** 获取微信广告单元 ID */
    public String getAdUnitId() {
        return adUnitId != null ? adUnitId : "";
    }

    /** 检查用户今日是否已观看广告 */
    public boolean hasWatchedAdToday(Long userId) {
        UserPreference pref = userPreferenceMapper.selectOne(
                new LambdaQueryWrapper<UserPreference>()
                        .eq(UserPreference::getUserId, userId)
                        .eq(UserPreference::getPrefKey, "watched_ads")
        );
        if (pref == null || pref.getPrefValue() == null) return false;

        @SuppressWarnings("unchecked")
        Map<String, Object> watched = parseJsonMap(pref.getPrefValue());
        String today = LocalDate.now().toString();
        return watched.containsKey(today);
    }

    /** 记录用户今日已观看广告 */
    public void markAdWatched(Long userId) {
        UserPreference pref = userPreferenceMapper.selectOne(
                new LambdaQueryWrapper<UserPreference>()
                        .eq(UserPreference::getUserId, userId)
                        .eq(UserPreference::getPrefKey, "watched_ads")
        );

        Map<String, Object> watched;
        if (pref == null) {
            pref = new UserPreference();
            pref.setUserId(userId);
            pref.setPrefKey("watched_ads");
            watched = new java.util.HashMap<>();
        } else {
            watched = parseJsonMap(pref.getPrefValue());
        }

        String today = LocalDate.now().toString();
        watched.put(today, 1);
        pref.setPrefValue(toString(watched));

        if (pref.getId() == null) {
            userPreferenceMapper.insert(pref);
        } else {
            userPreferenceMapper.updateById(pref);
        }
        log.info("[广告] userId={} 今日广告已记录", userId);
    }

    // ═════════════════════════════════════════════════════
    //  每日生成计数（防刷）
    // ═════════════════════════════════════════════════════

    /** 获取用户今日已生成次数 */
    public int getTodayGenCount(Long userId) {
        String key = "gen_count_" + LocalDate.now();
        UserPreference pref = userPreferenceMapper.selectOne(
                new LambdaQueryWrapper<UserPreference>()
                        .eq(UserPreference::getUserId, userId)
                        .eq(UserPreference::getPrefKey, key)
        );
        if (pref == null || pref.getPrefValue() == null) return 0;
        try {
            return Integer.parseInt(pref.getPrefValue());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    /** 递增用户今日生成计数 */
    public void incrementTodayGenCount(Long userId) {
        String key = "gen_count_" + LocalDate.now();
        UserPreference pref = userPreferenceMapper.selectOne(
                new LambdaQueryWrapper<UserPreference>()
                        .eq(UserPreference::getUserId, userId)
                        .eq(UserPreference::getPrefKey, key)
        );

        int newCount;
        if (pref == null) {
            pref = new UserPreference();
            pref.setUserId(userId);
            pref.setPrefKey(key);
            newCount = 1;
            pref.setPrefValue(String.valueOf(newCount));
            userPreferenceMapper.insert(pref);
        } else {
            newCount = Integer.parseInt(pref.getPrefValue()) + 1;
            userPreferenceMapper.update(null,
                    new LambdaUpdateWrapper<UserPreference>()
                            .eq(UserPreference::getId, pref.getId())
                            .set(UserPreference::getPrefValue, String.valueOf(newCount))
            );
        }
        log.debug("[防刷] userId={} 今日生成次数={}", userId, newCount);
    }

    // ═════════════════════════════════════════════════════
    //  内部工具
    // ═════════════════════════════════════════════════════

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJsonMap(String json) {
        if (json == null || json.isBlank()) return new java.util.HashMap<>();
        try {
            com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
            return om.readValue(json, Map.class);
        } catch (Exception e) {
            return new java.util.HashMap<>();
        }
    }

    private String toString(Map<String, Object> map) {
        try {
            com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
            return om.writeValueAsString(map);
        } catch (Exception e) {
            return "{}";
        }
    }
}
