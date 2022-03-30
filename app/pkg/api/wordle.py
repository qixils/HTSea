from fastapi import APIRouter, Depends, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from ..dependencies import *
import collections
import datetime
import random

route = APIRouter(prefix="/api/wordle")

COOLDOWN_PERIOD = datetime.timedelta(minutes=5)

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

'''Gets the Wordle info state for a given request/session, updating it if the cooldown period has passed'''
async def get_wordle_info(user_req: Request, words: Wordlist) -> typing.Dict:
    user = await get_session_data(user_req)
    if not user:
        raise Exception("not logged in")
    secret = user['webtoken']

    user = dict(await db.fetch_one("SELECT * FROM users WHERE webToken = :secret", {"secret": secret}))
    word = user['wordleword']
    guesses = user['wordleguesses']
    cooldown = user['wordlecooldown']

    # reset game after timeout period
    if cooldown is not None and cooldown <= datetime.datetime.now():
        # generate new word, empty out guesses array, clear cooldown
        word = random.choice(words.get_list())
        guesses = []
        cooldown = None
        await db.execute("UPDATE users SET (wordleWord, wordleGuesses, wordleCooldown) ="
                        "(:new_word, ARRAY[]::CHAR(5)[], NULL)"
                        "WHERE webToken = :sess_token",
                        {
                            "sess_token": secret,
                            "new_word": word
                        })

    data = {
        'secret': secret,
        'word': word,
        'guesses': [{'word': guess, 'result': guessword(word, guess)} for guess in guesses],
        'cooldown': None if cooldown is None else cooldown.timestamp(),
        'diamonds': user['diamonds']
    }
    return data

'''Make the full Wordle info response-friendly'''
def wordle_info_to_response(info: typing.Dict) -> typing.Dict:
    return {
        'guesses': info['guesses'],
        'cooldown': info['cooldown'],
        'diamonds': info['diamonds']
    }

@route.post("/guess")
async def guess_wordle(user_req: Request, guess: str, words: Wordlist = Depends(Wordlist)):
    info = await get_wordle_info(user_req, words)

    # only allow guessing if there's no cooldown period
    if info['cooldown'] is not None:
        return JSONResponse(content=jsonable_encoder({
            'success': False,
            'error': 'COOLDOWN'
        }))

    word = info['word']
    guesses = info['guesses']

    wordslist = words.get_list()
    if guess not in wordslist:
        return JSONResponse(content=jsonable_encoder({
            'success': False,
            'error': 'NOT_A_WORD'
        }))

    result = guessword(word, guess)
    if result == "ggggg":
        # they won :) give them the payout
        payment_table = [1/2, 1/5, 1/10, 1/20, 1/50, 1/100]
        cooldown = datetime.datetime.now() + COOLDOWN_PERIOD
        await db.execute("UPDATE users SET (diamonds, wordleCooldown, wordleGuesses) = "
                        "(diamonds + :payment, :timestamp, array_append(wordleGuesses, :guess))"
                        "WHERE webToken = :sess_token",
                        {
                            "sess_token": info['secret'],
                            "guess": guess,
                            "timestamp": cooldown,
                            "payment": payment_table[len(guesses)]
                        })
    elif len(guesses) >= 5:
        # they lost :(
        cooldown = datetime.datetime.now() + COOLDOWN_PERIOD
        await db.execute("UPDATE users SET (wordleCooldown, wordleGuesses) = "
                        "(:timestamp, array_append(wordleGuesses, :guess))"
                        "WHERE webToken = :sess_token",
                        {
                            "sess_token": info['secret'],
                            "guess": guess,
                            "timestamp": cooldown
                        })
    else:
        # add to existing guesses
        await db.execute("UPDATE users SET wordleGuesses = array_append(wordleGuesses, :guess)", {
            'guess': guess
        })

    # re-fetch info
    info = await get_wordle_info(user_req, words)
    return JSONResponse(content=jsonable_encoder({
            'success': True,
            'new_state': wordle_info_to_response(info)
    }))

@route.get("/info")
async def wordle_info(user_req: Request, words: Wordlist = Depends(Wordlist)):
    info = await get_wordle_info(user_req, words)
    return JSONResponse(content=jsonable_encoder(wordle_info_to_response(info)))
