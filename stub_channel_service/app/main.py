import asyncio
import random
import logging
from typing import Optional
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("stub_channel_service")

app = FastAPI(title="Xeno Stub Channel Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CRM_CALLBACK_URL = os.getenv("CRM_CALLBACK_URL", "http://backend:8000/api/v1/webhooks/channel-receipt")

class MessagePayload(BaseModel):
    message_id: str
    campaign_id: str
    recipient: str
    message: str
    channel: str

async def post_callback(payload: dict):
    """Sends webhook callback to CRM backend with retries"""
    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"Sending callback to {CRM_CALLBACK_URL}: {payload}")
            response = await client.post(CRM_CALLBACK_URL, json=payload, timeout=5.0)
            logger.info(f"Callback response: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"Failed to send callback to {CRM_CALLBACK_URL}: {e}")

async def simulate_lifecycle(payload: MessagePayload):
    """Simulates message lifecycle asynchronously: delivered -> opened -> read -> clicked -> conversion"""
    # 1. Dispatch simulation
    await asyncio.sleep(random.uniform(0.5, 1.5))
    
    # 5% chance of failure (e.g. invalid phone/email)
    is_failed = "fail" in payload.recipient.lower() or random.random() < 0.05
    
    if is_failed:
        await post_callback({
            "message_id": payload.message_id,
            "campaign_id": payload.campaign_id,
            "recipient": payload.recipient,
            "channel": payload.channel,
            "status": "failed",
            "error_message": "Invalid recipient destination or carrier timeout."
        })
        return

    # Delivered successfully
    await post_callback({
        "message_id": payload.message_id,
        "campaign_id": payload.campaign_id,
        "recipient": payload.recipient,
        "channel": payload.channel,
        "status": "delivered"
    })

    # SMS has low open tracking, but email/whatsapp/rcs support opened/read.
    # We will simulate open tracking for all channels for demo simplicity, but with differing rates.
    open_rate = 0.85 if payload.channel in ["whatsapp", "rcs"] else 0.45
    if random.random() > open_rate:
        return # Never opened

    # 2. Opened event
    await asyncio.sleep(random.uniform(1.0, 3.0))
    await post_callback({
        "message_id": payload.message_id,
        "campaign_id": payload.campaign_id,
        "recipient": payload.recipient,
        "channel": payload.channel,
        "status": "opened"
    })

    # 3. Read event (typically WhatsApp/RCS double blue ticks)
    read_rate = 0.90 if payload.channel in ["whatsapp", "rcs"] else 0.70
    if random.random() > read_rate:
        return # Opened but not read (or read receipts disabled)

    await asyncio.sleep(random.uniform(1.0, 2.0))
    await post_callback({
        "message_id": payload.message_id,
        "campaign_id": payload.campaign_id,
        "recipient": payload.recipient,
        "channel": payload.channel,
        "status": "read"
    })

    # 4. Clicked event (if they click a link in the message)
    # We will assume a 40% click rate if read
    click_rate = 0.40
    if random.random() > click_rate:
        return

    await asyncio.sleep(random.uniform(1.5, 4.0))
    await post_callback({
        "message_id": payload.message_id,
        "campaign_id": payload.campaign_id,
        "recipient": payload.recipient,
        "channel": payload.channel,
        "status": "clicked"
    })

    # 5. Conversion (Order made because of this communication)
    # 25% conversion if clicked
    conversion_rate = 0.25
    if random.random() > conversion_rate:
        return

    await asyncio.sleep(random.uniform(2.0, 5.0))
    await post_callback({
        "message_id": payload.message_id,
        "campaign_id": payload.campaign_id,
        "recipient": payload.recipient,
        "channel": payload.channel,
        "status": "converted"
    })

@app.post("/send")
async def send_message(payload: MessagePayload, background_tasks: BackgroundTasks):
    logger.info(f"Received send request for message_id {payload.message_id} via {payload.channel}")
    background_tasks.add_task(simulate_lifecycle, payload)
    return {"status": "accepted", "message_id": payload.message_id}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
