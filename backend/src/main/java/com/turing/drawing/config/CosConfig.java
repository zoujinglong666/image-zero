package com.turing.drawing.config;

import com.qcloud.cos.COSClient;
import com.qcloud.cos.ClientConfig;
import com.qcloud.cos.auth.BasicCOSCredentials;
import com.qcloud.cos.auth.COSCredentials;
import com.qcloud.cos.region.Region;
import lombok.Data;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 腾讯云COS配置
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "cos")
public class CosConfig {

    private String secretId;
    private String secretKey;
    private String region;
    private String bucket;

    @Bean
    @ConditionalOnProperty(prefix = "cos", name = {"secret-id", "secret-key", "bucket"}, matchIfMissing = false)
    public COSClient cosClient() {
        COSCredentials credentials = new BasicCOSCredentials(secretId, secretKey);
        ClientConfig clientConfig = new ClientConfig(new Region(region != null ? region : "ap-guangzhou"));
        return new COSClient(credentials, clientConfig);
    }
}