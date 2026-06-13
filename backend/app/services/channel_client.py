import httpx
import logging
from app.core.config import settings

logger = logging.getLogger("backend.channel_client")

class ChannelClient:
    def __init__(self):
        self.base_url = settings.STUB_CHANNEL_URL.rstrip('/')
        
    async def send_message(self, message_id: str, campaign_id: str, recipient: str, message_text: str, channel: str) -> bool:
        """Calls the stubbed channel service send API"""
        url = f"{self.base_url}/send"
        payload = {
            "message_id": str(message_id),
            "campaign_id": str(campaign_id),
            "recipient": recipient,
            "message": message_text,
            "channel": channel
        }
        
        async with httpx.AsyncClient() as client:
            try:
                logger.info(f"Posting message {message_id} to stub channel via {channel}")
                response = await client.post(url, json=payload, timeout=5.0)
                if response.status_code == 200:
                    logger.info(f"Message {message_id} accepted by stub channel service")
                    return True
                else:
                    logger.error(f"Stub channel service returned status {response.status_code}: {response.text}")
                    return False
            except Exception as e:
                logger.error(f"Failed to connect to stub channel service at {url}: {e}")
                return False

channel_client = ChannelClient()
