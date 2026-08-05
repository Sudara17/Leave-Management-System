import bcrypt

def get_password_bytes(password: str) -> bytes:
    """
    Encode password to bytes and safely truncate to 72 bytes.
    This maintains compatibility with older bcrypt versions (<4.0.0) and passlib
    which silently truncated passwords to 72 bytes, and prevents ValueError in bcrypt >=4.0.0.
    """
    password_bytes = password.encode('utf-8')
    return password_bytes[:72]

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(get_password_bytes(plain_password), hashed_password.encode('utf-8'))
    except ValueError:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(get_password_bytes(password), salt).decode('utf-8')
