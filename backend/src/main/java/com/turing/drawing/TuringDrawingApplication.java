package com.turing.drawing;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class TuringDrawingApplication {

    public static void main(String[] args) {
        SpringApplication.run(TuringDrawingApplication.class, args);
    }
}