package model

// Response standar — kompatibel dengan Android Retrofit DTOs

type LoginResponse struct {
	Success bool     `json:"success"`
	Message string   `json:"message"`
	Error   *string  `json:"error,omitempty"`
	Token   *string  `json:"token,omitempty"`
	User    *UserDTO `json:"user,omitempty"`
}

type MeResponse struct {
	Success bool     `json:"success"`
	Message string   `json:"message"`
	User    *UserDTO `json:"user,omitempty"`
}

type BasicResponse struct {
	Success bool    `json:"success"`
	Message string  `json:"message"`
	Error   *string `json:"error,omitempty"`
}

func ErrResponse(message string) BasicResponse {
	return BasicResponse{Success: false, Message: message}
}

func OkResponse(message string) BasicResponse {
	return BasicResponse{Success: true, Message: message}
}
