package game

import (
	"encoding/json"
	"log"
	"sync"
	"time"
)

// GameState represents the current state of a game room (legacy)
type GameState struct {
	RoomID   string          `json:"room_id"`
	Players  []string        `json:"players"`
	GameData json.RawMessage `json:"game_data"` // Raw JSON from Rust engine
}

// Manager handles multiple game rooms
type Manager struct {
	rooms         map[string]*GameState
	shootingRooms map[string]*GameStateWithShooting
	mu            sync.RWMutex
	broadcast     chan BroadcastMessage
}

// BroadcastMessage contains room ID and data to broadcast
type BroadcastMessage struct {
	RoomID string
	Data   []byte
}

// NewManager creates a new game manager
func NewManager() *Manager {
	return &Manager{
		rooms:         make(map[string]*GameState),
		shootingRooms: make(map[string]*GameStateWithShooting),
		broadcast:     make(chan BroadcastMessage, 256),
	}
}

// CreateRoom creates a new game room
func (m *Manager) CreateRoom(roomID string) *GameState {
	m.mu.Lock()
	defer m.mu.Unlock()

	state := &GameState{
		RoomID:  roomID,
		Players: make([]string, 0),
	}

	m.rooms[roomID] = state
	return state
}

// CreateShootingRoom creates a new game room with shooting mechanics
func (m *Manager) CreateShootingRoom(roomID string) *GameStateWithShooting {
	m.mu.Lock()
	defer m.mu.Unlock()

	state := NewGameStateWithShooting(roomID)
	m.shootingRooms[roomID] = state

	return state
}

// GetRoom retrieves a game room by ID
func (m *Manager) GetRoom(roomID string) (*GameState, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	room, exists := m.rooms[roomID]
	return room, exists
}

// GetShootingRoom retrieves a shooting game room by ID
func (m *Manager) GetShootingRoom(roomID string) (*GameStateWithShooting, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	room, exists := m.shootingRooms[roomID]
	return room, exists
}

// DeleteRoom removes a game room
func (m *Manager) DeleteRoom(roomID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	delete(m.rooms, roomID)
	delete(m.shootingRooms, roomID)
}

// AddPlayer adds a player to a room
func (m *Manager) AddPlayer(roomID, playerID string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Try shooting room first
	if room, exists := m.shootingRooms[roomID]; exists {
		room.mu.Lock()
		room.Players = append(room.Players, playerID)
		room.mu.Unlock()
		return true
	}

	// Fall back to legacy room
	room, exists := m.rooms[roomID]
	if !exists {
		return false
	}

	room.Players = append(room.Players, playerID)
	return true
}

// RemovePlayer removes a player from a room
func (m *Manager) RemovePlayer(roomID, playerID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Try shooting room first
	if room, exists := m.shootingRooms[roomID]; exists {
		room.mu.Lock()
		for i, id := range room.Players {
			if id == playerID {
				room.Players = append(room.Players[:i], room.Players[i+1:]...)
				break
			}
		}
		room.mu.Unlock()
		return
	}

	// Fall back to legacy room
	room, exists := m.rooms[roomID]
	if !exists {
		return
	}

	for i, id := range room.Players {
		if id == playerID {
			room.Players = append(room.Players[:i], room.Players[i+1:]...)
			break
		}
	}
}

// StartGameLoop starts the 60 FPS game loop for a room
func (m *Manager) StartGameLoop(roomID string) {
	log.Printf("🎮 Starting game loop for room: %s", roomID)

	ticker := time.NewTicker(time.Second / 60) // 60 FPS
	defer ticker.Stop()

	frameCount := 0
	lastLog := time.Now()

	for range ticker.C {
		m.mu.RLock()
		room, exists := m.shootingRooms[roomID]
		m.mu.RUnlock()

		if !exists {
			log.Printf("⚠️ Room %s deleted, stopping game loop", roomID)
			return
		}

		// Update game state
		room.Update(1.0 / 60.0) // deltaTime in seconds

		// Get snapshot for broadcasting
		snapshot := room.GetSnapshot()

		// Log every 60 frames (once per second)
		frameCount++
		if frameCount%60 == 0 {
			elapsed := time.Since(lastLog)
			fps := float64(60) / elapsed.Seconds()
			log.Printf("📊 Room %s - FPS: %.1f | Towers: %d | Enemies: %d | Projectiles: %d",
				roomID, fps, len(snapshot.Towers), len(snapshot.Enemies), len(snapshot.Projectiles))
			lastLog = time.Now()
		}

		// Marshal to JSON
		data, err := json.Marshal(snapshot)
		if err != nil {
			log.Printf("❌ Failed to marshal game state: %v", err)
			continue
		}

		// Send to broadcast channel
		select {
		case m.broadcast <- BroadcastMessage{
			RoomID: roomID,
			Data:   data,
		}:
		default:
			// Channel full, skip this frame
			if frameCount%300 == 0 { // Log every 5 seconds if channel is full
				log.Printf("⚠️ Broadcast channel full for room %s", roomID)
			}
		}
	}
}

// GetBroadcastChannel returns the broadcast channel for the hub to read from
func (m *Manager) GetBroadcastChannel() <-chan BroadcastMessage {
	return m.broadcast
}
