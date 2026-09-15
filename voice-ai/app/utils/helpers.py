def clamp(value, minimum=0.0, maximum=1.0):
    """
    Restrict value between minimum and maximum.
    """
    return max(minimum, min(float(value), maximum))