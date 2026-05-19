package com.turing.drawing.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.turing.drawing.dto.response.PageResult;
import com.turing.drawing.entity.History;
import com.turing.drawing.entity.User;
import com.turing.drawing.entity.UserPreference;
import com.turing.drawing.mapper.HistoryMapper;
import com.turing.drawing.mapper.UserMapper;
import com.turing.drawing.mapper.UserPreferenceMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 数据服务 - 历史记录/偏好/用户信息
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DataService {

    private final HistoryMapper historyMapper;
    private final UserMapper userMapper;
    private final UserPreferenceMapper userPreferenceMapper;

    /**
     * 分页查询历史记录
     */
    public PageResult<History> listHistory(Long userId, int page, int pageSize,
                                            String type, Boolean favorite, String keyword) {
        Page<History> p = new Page<>(page, pageSize);
        IPage<History> result;

        if (keyword != null && !keyword.isBlank()) {
            result = historyMapper.searchByKeyword(p, userId, keyword);
        } else if (Boolean.TRUE.equals(favorite)) {
            result = historyMapper.findByUserIdAndFavoriteTrueOrderByCreatedAtDesc(p, userId);
        } else if (type != null && !type.isBlank()) {
            result = historyMapper.findByUserIdAndTypeOrderByCreatedAtDesc(p, userId, type);
        } else {
            result = historyMapper.findByUserIdOrderByCreatedAtDesc(p, userId);
        }

        return PageResult.of(result);
    }

    /**
     * 创建历史记录
     */
    public Long createHistory(History history) {
        historyMapper.insert(history);
        return history.getId();
    }

    /**
     * 切换收藏状态
     */
    public boolean toggleFavorite(Long id, Long userId) {
        LambdaQueryWrapper<History> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(History::getId, id).eq(History::getUserId, userId);
        History history = historyMapper.selectOne(wrapper);
        if (history == null) return false;
        boolean newFav = !Boolean.TRUE.equals(history.getFavorite());
        historyMapper.updateFavorite(id, userId, newFav);
        return newFav;
    }

    /**
     * 删除历史记录
     */
    public void deleteHistory(Long id, Long userId) {
        LambdaQueryWrapper<History> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(History::getId, id).eq(History::getUserId, userId);
        historyMapper.delete(wrapper);
    }

    /**
     * 清空所有历史
     */
    public int clearAllHistory(Long userId) {
        LambdaQueryWrapper<History> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(History::getUserId, userId);
        return historyMapper.delete(wrapper);
    }

    /**
     * 获取用户偏好
     */
    public Map<String, String> getPreferences(Long userId) {
        LambdaQueryWrapper<UserPreference> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserPreference::getUserId, userId);
        List<UserPreference> prefs = userPreferenceMapper.selectList(wrapper);
        return prefs.stream().collect(Collectors.toMap(
                UserPreference::getPrefKey, UserPreference::getPrefValue, (a, b) -> b));
    }

    /**
     * 更新用户偏好
     */
    public void updatePreferences(Long userId, Map<String, String> prefs) {
        for (Map.Entry<String, String> entry : prefs.entrySet()) {
            UserPreference existing = userPreferenceMapper.findByUserIdAndPrefKey(userId, entry.getKey());
            if (existing != null) {
                existing.setPrefValue(entry.getValue());
                userPreferenceMapper.updateById(existing);
            } else {
                UserPreference pref = UserPreference.builder()
                        .userId(userId)
                        .prefKey(entry.getKey())
                        .prefValue(entry.getValue())
                        .build();
                userPreferenceMapper.insert(pref);
            }
        }
    }

    /**
     * 获取用户信息
     */
    public Map<String, Object> getProfile(Long userId) {
        Optional<User> userOpt = Optional.ofNullable(userMapper.selectById(userId));
        if (userOpt.isEmpty()) return Map.of();
        User user = userOpt.get();
        Map<String, Object> profile = new HashMap<>();
        profile.put("uid", user.getUid());
        profile.put("nickname", user.getNickname());
        profile.put("avatarUrl", user.getAvatarUrl());
        profile.put("type", user.getType());
        profile.put("vip", Map.of(
                "level", user.getVipLevel() != null ? user.getVipLevel() : 0,
                "active", user.getVipExpireAt() != null && user.getVipExpireAt() > System.currentTimeMillis(),
                "expireAt", user.getVipExpireAt() != null ? user.getVipExpireAt() : 0
        ));
        profile.put("dailyQuota", user.getDailyQuota());
        return profile;
    }

    /**
     * 更新用户信息
     */
    public void updateProfile(Long userId, String nickname, String avatarUrl) {
        User user = userMapper.selectById(userId);
        if (user == null) return;
        if (nickname != null) user.setNickname(nickname);
        if (avatarUrl != null) user.setAvatarUrl(avatarUrl);
        userMapper.updateById(user);
    }
}