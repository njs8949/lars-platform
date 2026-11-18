"""
Local file-based user storage for development
Simple JSON file storage for user authentication
"""

import json
import os
from pathlib import Path
from typing import Dict, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class LocalUserStore:
    """File-based user storage for local development"""

    def __init__(self, data_dir: str = ".lars"):
        self.data_dir = Path(data_dir)
        self.users_file = self.data_dir / "users.json"
        self.data_dir.mkdir(exist_ok=True)
        self._load_users()

    def _load_users(self):
        """Load users from JSON file"""
        if self.users_file.exists():
            try:
                with open(self.users_file, 'r', encoding='utf-8') as f:
                    content = json.load(f)
                    # Handle both dict and list formats
                    if isinstance(content, list):
                        # Convert list to dict if needed
                        self.users = {user['email']: user for user in content if isinstance(user, dict) and 'email' in user}
                    else:
                        self.users = content
                logger.info(f"✓ Loaded {len(self.users)} users from {self.users_file}")
            except Exception as e:
                logger.error(f"Error loading users: {e}")
                self.users = {}
        else:
            self.users = {}

        # Ensure default production user exists
        default_email = os.environ.get("CONTACT_EMAIL", "lars@lars-technologies.com")
        if not self.users or default_email not in self.users:
            self.users[default_email] = {
                "email": default_email,
                "username": "lars",
                "password_hash": "$2b$12$x2eTTz3gpddPHVMeaHHNIuw3lhq8ujiSZ3KDQ1KiIPXAdjoRfZzvu",
                "created_at": "2026-08-03T09:10:16.8",
                "active": True,
            }
            logger.info(f"✓ Initialized with default production user: {default_email}")

    def _save_users(self):
        """Save users to JSON file"""
        try:
            with open(self.users_file, 'w', encoding='utf-8') as f:
                json.dump(self.users, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error saving users: {e}")

    def create_user(self, email: str, username: str, password_hash: str) -> bool:
        """Create a new user"""
        try:
            if email in self.users:
                return False

            self.users[email] = {
                "email": email,
                "username": username,
                "password_hash": password_hash,
                "created_at": datetime.utcnow().isoformat(),
                "active": True,
            }
            self._save_users()
            logger.info(f"✓ User created: {email}")
            return True

        except Exception as e:
            logger.error(f"Error creating user: {e}")
            return False

    def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email"""
        return self.users.get(email)

    def get_user_by_username(self, username: str) -> Optional[Dict]:
        """Get user by username"""
        for user in self.users.values():
            if user.get("username") == username:
                return user
        return None

    def user_exists(self, email: str) -> bool:
        """Check if user exists"""
        return email in self.users

    def update_user_password(self, email: str, new_password_hash: str) -> bool:
        """Update user password"""
        try:
            if email not in self.users:
                return False

            self.users[email]["password_hash"] = new_password_hash
            self._save_users()
            logger.info(f"✓ Password updated: {email}")
            return True

        except Exception as e:
            logger.error(f"Error updating password: {e}")
            return False
