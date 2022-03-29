from fastapi import APIRouter, Depends, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from ..dependencies import *
import random
import collections
import datetime
import json

route = APIRouter(prefix="/api/wordle")


# copied from https://mathspp.com/blog/solving-wordle-with-python // RodrigoGS -- thanks!
def guessword(wword, wguess):
    pool = collections.Counter(s for s, g in zip(wword, wguess) if s != g)
    wscore = []
    for secret_char, guess_char in zip(wword, wguess):
        if secret_char == guess_char:
            wscore.append("g")
        elif guess_char in wword and pool[guess_char] > 0:
            wscore.append("y")
            pool[guess_char] -= 1
        else:
            wscore.append("x")
    return "".join(wscore)


@route.post("/guess")
async def guess_wordle(user_req: Request, guess: str, words: Wordlist = Depends(Wordlist)):
    secret = user_req.cookies.get("secret")
    status = await validate_user(secret, None)
    if not status:
        return "bad"
    user = dict(await db.fetch_one("SELECT * FROM users WHERE secret = :secret", {"secret": secret}))

    # ensure guesses < 5 here
    if user["wordleGuesses"] > 6:
        return "already done idot"

    word = user["wordleWord"]
    wordslist = words.getList()
    if guess not in wordslist:
        return "not a word"
    result = guessword(word, guess)
    if result == "ggggg":
        payment_table = [1/2, 1/5, 1/10, 1/20, 1/50, 1/100]
        await db.execute("UPDATE users SET diamonds = diamonds + :payment WHERE secret = :sess_token",
                         {"sess_token": secret, "payment": payment_table[user["wordleGuesses"] - 1]})
        await db.execute("UPDATE users SET wordleCooldown = :timestamp WHERE secret = :sess_token",
                         {"sess_token": secret, "timestamp": datetime.datetime.now() + datetime.timedelta(minutes=5)})
        return "congrats"

    if user["wordleGuesses"] == 6:
        await db.execute("UPDATE users SET wordleCooldown = :timestamp WHERE secret = :sess_token",
                         {"sess_token": secret, "timestamp": datetime.datetime.now() + datetime.timedelta(minutes=5)})
        return "you failed lol"


@route.get("/info")
async def wordle_info(user_req: Request):
    secret = user_req.cookies.get("secret")
    status = await validate_user(secret, None)
    if not status:
        return "stop girlbossing with the api"
    user = dict(await db.fetch_one("SELECT * FROM users WHERE secret = :secret", {"secret": secret}))
    data = [user.pop(key) for key in ["wordlecooldown", "diamonds", "name", "wordleguesses"]]
    json_compatible_item_data = jsonable_encoder(data)
    return JSONResponse(content=json_compatible_item_data)
