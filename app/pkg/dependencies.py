import aiohttp
import databases
import random
import hashlib
import time
import os

# https://www.youtube.com/watch?v=aIAcEKWur-E
db = databases.Database("postgresql://adamthedog@localhost:5432/adamthedog", password="password")


class HttpClient:
    session = None

    def __init__(self):
        pass

    def start(self):
        self.session = aiohttp.ClientSession()

    async def stop(self):
        await self.session.close()
        self.session = None

    def __call__(self) -> aiohttp.ClientSession:
        return self.session


def csrf():
    return hashlib.md5(bytes(str(random.SystemRandom().random()+time.time()), "utf-8")).hexdigest()[0:10]


client_id = "956657160979374090"
client_secret = "99zkVEX7Blps6WjJQaXzkahayZxeQ7rf"
redirect_uri = "http://localhost:8000/register"
grant_type = "authorization_code"


# wordlist singleton, why not
class Wordlist:
    wordlist = None

    def __init__(self):
        pass

    @classmethod
    def get_list(cls):
        if cls.wordlist is None:
            print(os.listdir())
            with open("words.txt", "r") as words:
                cls.wordlist = words.read().split("\n")
        return cls.wordlist


def gen_csrf():
    return hashlib.md5(bytes(str(random.SystemRandom().random() + time.time()), "utf-8")).hexdigest()[:10]


async def validate_user(session_token: str, csrf_token: str = None):
    users = await db.fetch_one("SELECT * from users where webToken = :sess_token", {"sess_token": session_token})
    # no user by that token
    if not users:
        return 0

    # csrf is not a concern with wordle
    if csrf_token is not None:
        if users["csrfToken"] is not csrf_token:
            # potential attack attempted, gen new token and log
            # can also occur by someone going back on an old page (older than csrf token expiry)
            new_token = gen_csrf()
            await db.execute("UPDATE users SET csrfToken = :new_token WHERE webToken = :sess_token",
                             {"sess_token": session_token,
                              "new_token": new_token})
            return 0
    return 1
