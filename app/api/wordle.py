from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from ..dependencies import *
import random
import collections
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
    word = user["wordleWord"]
    wordslist = words.getList()
    if guess not in wordslist:
        return "not a word"
    result = guessword(word, guess)
    if result == "ggggg":
        # update diamonds here
        return "correct"
    return result


@route.get("/info")
async def wordle_info():
    return "hi"
