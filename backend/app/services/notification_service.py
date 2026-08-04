import logging
from sqlalchemy.orm import Session
from app.models.notification import Notification

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    def send_notification(db: Session, user_id: int, title: str, message: str, type: str):
        """
        Runs as a BackgroundTask to generate the in-app Notification record
        and simulate sending an email.
        """
        try:
            notification = Notification(
                user_id=user_id,
                title=title,
                message=message,
                type=type
            )
            db.add(notification)
            db.commit()
            
            # Simulate Email Sending
            logger.info(f"--- EMAIL SIMULATION ---")
            logger.info(f"To User ID: {user_id}")
            logger.info(f"Subject: {title}")
            logger.info(f"Body: {message}")
            logger.info(f"------------------------")
        except Exception as e:
            logger.error(f"Failed to send notification to user {user_id}: {e}")
