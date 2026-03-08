import numpy as np

def normalize_landmarks(frame_landmarks):
    """
    Normalizes a single frame of 126 hand landmarks (2 hands * 21 points * 3 coordinates [x, y, z]).
    Normalizes relative to the wrist (point 0).
    """
    landmarks = np.array(frame_landmarks)
    if len(landmarks) != 126:
        # If less than 126, pad with zeros (e.g., only one hand detected)
        if len(landmarks) < 126:
            landmarks = np.pad(landmarks, (0, 126 - len(landmarks)), 'constant')
        else:
            landmarks = landmarks[:126]

    # Hand 1: Indices 0 to 62
    # Hand 2: Indices 63 to 125
    
    normalized = np.zeros(126)
    
    # Process Hand 1
    h1_wrist = landmarks[0:3]
    if not np.all(h1_wrist == 0): # Hand is present
        for i in range(21):
            idx = i * 3
            # x, y, z rel to wrist
            normalized[idx] = landmarks[idx] - h1_wrist[0]
            normalized[idx+1] = landmarks[idx+1] - h1_wrist[1]
            normalized[idx+2] = landmarks[idx+2] - h1_wrist[2]
            
        # Scale normalization (divide by max distance to wrist)
        h1_dists = np.linalg.norm(normalized[0:63].reshape(21, 3), axis=1)
        max_dist_h1 = np.max(h1_dists)
        if max_dist_h1 > 0:
            normalized[0:63] = normalized[0:63] / max_dist_h1

    # Process Hand 2
    h2_wrist = landmarks[63:66]
    if not np.all(h2_wrist == 0): # Hand is present
        for i in range(21):
            idx = 63 + (i * 3)
            # x, y, z rel to wrist
            normalized[idx] = landmarks[idx] - h2_wrist[0]
            normalized[idx+1] = landmarks[idx+1] - h2_wrist[1]
            normalized[idx+2] = landmarks[idx+2] - h2_wrist[2]
            
        # Scale normalization
        h2_dists = np.linalg.norm(normalized[63:126].reshape(21, 3), axis=1)
        max_dist_h2 = np.max(h2_dists)
        if max_dist_h2 > 0:
            normalized[63:126] = normalized[63:126] / max_dist_h2

    return normalized

def extract_velocity(current_frame, previous_frame):
    """
    Computes velocity between current and previous frame landmarks.
    """
    if previous_frame is None:
        return np.zeros(126)
    return current_frame - previous_frame

def normalize_wrist_only(frame_landmarks):
    """
    Normalizes a single frame by subtracting the wrist (point 0) from all points.
    Matches the logic in train_word_lstm.py and train_landmarks.py.
    """
    landmarks = np.array(frame_landmarks)
    if len(landmarks) != 126:
        if len(landmarks) < 126:
            landmarks = np.pad(landmarks, (0, 126 - len(landmarks)), 'constant')
        else:
            landmarks = landmarks[:126]

    normalized = np.zeros(126)
    
    # Process Hand 1 (0-62)
    h1_wrist = landmarks[0:3]
    for i in range(21):
        idx = i * 3
        normalized[idx] = landmarks[idx] - h1_wrist[0]
        normalized[idx+1] = landmarks[idx+1] - h1_wrist[1]
        normalized[idx+2] = landmarks[idx+2] - h1_wrist[2]

    # Process Hand 2 (63-125)
    h2_wrist = landmarks[63:66]
    for i in range(21):
        idx = 63 + (i * 3)
        normalized[idx] = landmarks[idx] - h2_wrist[0]
        normalized[idx+1] = landmarks[idx+1] - h2_wrist[1]
        normalized[idx+2] = landmarks[idx+2] - h2_wrist[2]

    return normalized

def preprocess_sequence(raw_sequence, use_velocity=True):
    """
    Preprocesses a full sequence of frames.
    If use_velocity=True: returns (num_frames, 252)
    If use_velocity=False: returns (num_frames, 126)
    """
    processed_seq = []
    prev_norm = None
    
    for frame in raw_sequence:
        # Use wrist-only normalization for Word LSTM model
        norm_frame = normalize_wrist_only(frame)
        
        if use_velocity:
            velocity = extract_velocity(norm_frame, prev_norm)
            combined_features = np.concatenate([norm_frame, velocity])
            processed_seq.append(combined_features)
        else:
            processed_seq.append(norm_frame)
            
        prev_norm = norm_frame
        
    return np.array(processed_seq)
