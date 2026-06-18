package com.turing.drawing.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 微信配置属性
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "wechat")
public class WechatConfig {

    /** 微信公众号AppId */
    private String appId;

    /** 微信公众号AppSecret */
    private String appSecret;

    /** 微信小程序AppId */
    private String miniProgramAppId;

    /** 微信小程序AppSecret */
    private String miniProgramAppSecret;
}