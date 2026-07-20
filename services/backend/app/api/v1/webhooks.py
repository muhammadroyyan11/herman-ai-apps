from fastapi import APIRouter, Depends, Request, HTTPException
from loguru import logger

router = APIRouter()


@router.post("/deepseek")
async def deepseek_webhook(request: Request):
    payload = await request.json()
    logger.info(f"DeepSeek webhook received: {payload}")
    return {"status": "received"}


@router.post("/stripe")
async def stripe_webhook(request: Request):
    payload = await request.json()
    logger.info(f"Stripe webhook received: {payload}")
    return {"status": "received"}
