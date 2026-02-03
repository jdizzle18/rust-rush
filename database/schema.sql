-- Rust Rush Database Schema
-- PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players table
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    total_games_played INT DEFAULT 0,
    total_time_played_seconds INT DEFAULT 0
);

-- Game sessions table
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    waves_completed INT NOT NULL DEFAULT 0,
    final_score INT NOT NULL DEFAULT 0,
    towers_built INT DEFAULT 0,
    towers_upgraded INT DEFAULT 0,
    enemies_killed INT DEFAULT 0,
    gold_earned INT DEFAULT 0,
    gold_spent INT DEFAULT 0,
    game_mode VARCHAR(20) DEFAULT 'classic',
    difficulty VARCHAR(20) DEFAULT 'normal',
    map_name VARCHAR(50) DEFAULT 'default',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    game_duration_seconds INT,
    victory BOOLEAN DEFAULT false,
    base_health_remaining INT DEFAULT 100
);

-- Tower statistics (tracks which towers are most effective)
CREATE TABLE tower_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    tower_type VARCHAR(30) NOT NULL,
    tower_level INT DEFAULT 1,
    position_x INT NOT NULL,
    position_y INT NOT NULL,
    total_damage_dealt INT DEFAULT 0,
    enemies_killed INT DEFAULT 0,
    shots_fired INT DEFAULT 0,
    upgrade_cost INT DEFAULT 0,
    time_active_seconds INT DEFAULT 0
);

-- Wave configurations
CREATE TABLE wave_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wave_number INT NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'normal',
    enemy_type VARCHAR(30) NOT NULL,
    enemy_count INT NOT NULL,
    enemy_health INT NOT NULL,
    enemy_speed DECIMAL(4,2) NOT NULL,
    enemy_reward INT NOT NULL,
    spawn_delay_ms INT DEFAULT 1000,
    is_boss_wave BOOLEAN DEFAULT false
);

-- Leaderboards
CREATE TABLE leaderboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    game_mode VARCHAR(20) DEFAULT 'classic',
    difficulty VARCHAR(20) DEFAULT 'normal',
    high_score INT NOT NULL DEFAULT 0,
    max_wave INT NOT NULL DEFAULT 0,
    fastest_time_seconds INT,
    perfect_waves INT DEFAULT 0,
    total_victories INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(player_id, game_mode, difficulty)
);

-- Achievements
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(100),
    tier VARCHAR(20) DEFAULT 'bronze', -- bronze, silver, gold, platinum
    requirement_type VARCHAR(30) NOT NULL, -- waves_completed, enemies_killed, etc
    requirement_value INT NOT NULL,
    points INT DEFAULT 10
);

-- Player achievements (junction table)
CREATE TABLE player_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress INT DEFAULT 0,
    UNIQUE(player_id, achievement_id)
);

-- Daily challenges
CREATE TABLE daily_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_date DATE UNIQUE NOT NULL,
    challenge_name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    challenge_type VARCHAR(30) NOT NULL, -- complete_wave, no_tower_type, budget_limit
    constraint_rules JSONB, -- flexible JSON for different challenge types
    reward_points INT DEFAULT 100,
    active BOOLEAN DEFAULT true
);

-- Challenge completions
CREATE TABLE challenge_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES daily_challenges(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    score INT,
    time_taken_seconds INT,
    UNIQUE(player_id, challenge_id)
);

-- Friend system (for multiplayer features)
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES players(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, blocked
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(player_id, friend_id),
    CHECK (player_id != friend_id)
);

-- Game rooms (for multiplayer)
CREATE TABLE game_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_code VARCHAR(10) UNIQUE NOT NULL,
    host_player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    max_players INT DEFAULT 2,
    current_players INT DEFAULT 1,
    game_mode VARCHAR(20) DEFAULT 'coop',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Room participants
CREATE TABLE room_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_ready BOOLEAN DEFAULT false,
    UNIQUE(room_id, player_id)
);

-- Indexes for performance
CREATE INDEX idx_game_sessions_player ON game_sessions(player_id);
CREATE INDEX idx_game_sessions_score ON game_sessions(final_score DESC);
CREATE INDEX idx_game_sessions_waves ON game_sessions(waves_completed DESC);
CREATE INDEX idx_tower_stats_session ON tower_stats(session_id);
CREATE INDEX idx_leaderboards_score ON leaderboards(high_score DESC);
CREATE INDEX idx_leaderboards_wave ON leaderboards(max_wave DESC);
CREATE INDEX idx_player_achievements_player ON player_achievements(player_id);
CREATE INDEX idx_friendships_player ON friendships(player_id);
CREATE INDEX idx_room_participants_room ON room_participants(room_id);

-- Views for common queries
CREATE VIEW leaderboard_global AS
SELECT 
    p.username,
    l.high_score,
    l.max_wave,
    l.total_victories,
    l.game_mode,
    l.difficulty,
    l.updated_at
FROM leaderboards l
JOIN players p ON l.player_id = p.id
ORDER BY l.high_score DESC
LIMIT 100;

CREATE VIEW player_statistics AS
SELECT 
    p.id,
    p.username,
    p.total_games_played,
    COALESCE(AVG(gs.final_score), 0) as avg_score,
    COALESCE(MAX(gs.waves_completed), 0) as best_wave,
    COALESCE(SUM(gs.enemies_killed), 0) as total_enemies_killed,
    COALESCE(COUNT(CASE WHEN gs.victory = true THEN 1 END), 0) as total_wins,
    COUNT(pa.achievement_id) as achievements_unlocked
FROM players p
LEFT JOIN game_sessions gs ON p.id = gs.player_id
LEFT JOIN player_achievements pa ON p.id = pa.player_id
GROUP BY p.id, p.username, p.total_games_played;

-- Seed data for wave configurations (first 5 waves)
INSERT INTO wave_configs (wave_number, difficulty, enemy_type, enemy_count, enemy_health, enemy_speed, enemy_reward, spawn_delay_ms, is_boss_wave) VALUES
(1, 'normal', 'basic', 10, 10, 1.0, 5, 1500, false),
(2, 'normal', 'basic', 15, 12, 1.0, 5, 1400, false),
(3, 'normal', 'fast', 12, 8, 1.5, 7, 1200, false),
(4, 'normal', 'basic', 20, 15, 1.0, 5, 1300, false),
(5, 'normal', 'tank', 5, 50, 0.8, 20, 2000, true);

-- Seed achievements
INSERT INTO achievements (name, description, tier, requirement_type, requirement_value, points) VALUES
('First Blood', 'Kill your first enemy', 'bronze', 'enemies_killed', 1, 10),
('Wave Warrior', 'Complete wave 10', 'silver', 'waves_completed', 10, 25),
('Tower Master', 'Build 50 towers in a single game', 'silver', 'towers_built', 50, 25),
('Century Club', 'Kill 100 enemies in a single game', 'gold', 'enemies_killed', 100, 50),
('Perfectionist', 'Complete a game without losing any base health', 'gold', 'perfect_game', 1, 75),
('Minimalist', 'Complete wave 5 using 5 or fewer towers', 'gold', 'minimal_towers', 5, 50),
('Millionaire', 'Accumulate 10,000 gold in a single game', 'platinum', 'gold_earned', 10000, 100),
('Speed Runner', 'Complete wave 20 in under 10 minutes', 'platinum', 'speed_run', 600, 100);

-- Function to update leaderboard
CREATE OR REPLACE FUNCTION update_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO leaderboards (player_id, game_mode, difficulty, high_score, max_wave, fastest_time_seconds, total_victories)
    VALUES (
        NEW.player_id,
        NEW.game_mode,
        NEW.difficulty,
        NEW.final_score,
        NEW.waves_completed,
        NEW.game_duration_seconds,
        CASE WHEN NEW.victory THEN 1 ELSE 0 END
    )
    ON CONFLICT (player_id, game_mode, difficulty)
    DO UPDATE SET
        high_score = GREATEST(leaderboards.high_score, NEW.final_score),
        max_wave = GREATEST(leaderboards.max_wave, NEW.waves_completed),
        fastest_time_seconds = CASE 
            WHEN NEW.victory AND (leaderboards.fastest_time_seconds IS NULL OR NEW.game_duration_seconds < leaderboards.fastest_time_seconds)
            THEN NEW.game_duration_seconds
            ELSE leaderboards.fastest_time_seconds
        END,
        total_victories = leaderboards.total_victories + CASE WHEN NEW.victory THEN 1 ELSE 0 END,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update leaderboard when game ends
CREATE TRIGGER update_leaderboard_on_game_end
AFTER INSERT ON game_sessions
FOR EACH ROW
WHEN (NEW.ended_at IS NOT NULL)
EXECUTE FUNCTION update_leaderboard();

-- Function to check and unlock achievements
CREATE OR REPLACE FUNCTION check_achievements()
RETURNS TRIGGER AS $$
DECLARE
    achievement RECORD;
BEGIN
    FOR achievement IN 
        SELECT a.id, a.requirement_type, a.requirement_value
        FROM achievements a
        WHERE NOT EXISTS (
            SELECT 1 FROM player_achievements pa
            WHERE pa.player_id = NEW.player_id AND pa.achievement_id = a.id
        )
    LOOP
        IF (achievement.requirement_type = 'waves_completed' AND NEW.waves_completed >= achievement.requirement_value) OR
           (achievement.requirement_type = 'enemies_killed' AND NEW.enemies_killed >= achievement.requirement_value) OR
           (achievement.requirement_type = 'towers_built' AND NEW.towers_built >= achievement.requirement_value) OR
           (achievement.requirement_type = 'gold_earned' AND NEW.gold_earned >= achievement.requirement_value) OR
           (achievement.requirement_type = 'perfect_game' AND NEW.base_health_remaining = 100 AND NEW.victory) OR
           (achievement.requirement_type = 'speed_run' AND NEW.game_duration_seconds <= achievement.requirement_value AND NEW.waves_completed >= 20)
        THEN
            INSERT INTO player_achievements (player_id, achievement_id, progress)
            VALUES (NEW.player_id, achievement.id, 100);
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check achievements after game ends
CREATE TRIGGER check_achievements_on_game_end
AFTER INSERT ON game_sessions
FOR EACH ROW
WHEN (NEW.ended_at IS NOT NULL)
EXECUTE FUNCTION check_achievements();

-- Grant permissions (adjust as needed for your user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
