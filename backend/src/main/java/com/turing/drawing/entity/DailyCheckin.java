package com.turing.drawing.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@TableName("daily_checkins")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyCheckin extends BaseEntity {
    private Long userId;
    private LocalDate checkinDate;
    private Integer streakDays;
    private Integer rewardTimes;
}
