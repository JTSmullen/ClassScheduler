package com.classScheduler.app.security.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;

@Component
public class JwtUtil {
    private static final Logger logger = LoggerFactory.getLogger(JwtUtil.class);

    private final String jwtSecret = "FillerSecretKeyForNow!GottaChangeThisToEnvVar12345!";

    private final SecretKey key;

    private long getKeyExpiration() {
        ZoneId userZone = ZoneId.of("America/NewYork");
        ZonedDateTime now = ZonedDateTime.now(userZone);
        ZonedDateTime expirationTime = now.plusYears(1);

        return ChronoUnit.MILLIS.between(now, expirationTime);
    }

    public JwtUtil() {
        this.key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    private String generateToken(String username) {
        return Jwts.builder()
                .subject(username)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + getKeyExpiration()))
                .signWith(key)
                .compact();
    }

    public String getUsernameFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.getSubject();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            logger.error("Invalid JWT Token: {}", e.getMessage());
        }
        return false;
    }
}