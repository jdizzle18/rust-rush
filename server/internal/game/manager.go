package game

import (
	"encoding/json"
	"sync"
)

// GameState represents the current state of a game room
type GameState struct {
	RoomID   string          `json:"room_id"`
	Players  []string        `json:"players"`
	GameData json.RawMessage `json:"game_data"` // Raw JSON from Rust engine
}

// Manager handles multiple game rooms
type Manager struct {
	rooms map[string]*GameState
	mu    sync.RWMutex
}

// NewManager creates a new game manager
func NewManager() *Manager {
	return &Manager{
		rooms: make(map[string]*GameState),
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

// GetRoom retrieves a game room by ID
func (m *Manager) GetRoom(roomID string) (*GameState, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	room, exists := m.rooms[roomID]
	return room, exists
}

// DeleteRoom removes a game room
func (m *Manager) DeleteRoom(roomID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	delete(m.rooms, roomID)
}

// AddPlayer adds a player to a room
func (m *Manager) AddPlayer(roomID, playerID string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()

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
