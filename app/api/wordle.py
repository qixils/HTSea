from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from ..dependencies import *
import random
import json

route = APIRouter(prefix="/api/wordle")


@route.post("/guess")
async def guess_wordle(user_req: Request, guess: str, words: Wordlist = Depends(Wordlist)):
    secret = user_req.cookies.get("secret")
    status = await validate_user(secret, None)
    return random.choice(words.getList())


@route.get("/info")
async def wordle_info():
    return "hi"
