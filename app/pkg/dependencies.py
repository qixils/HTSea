import json
import typing
from http import HTTPStatus

import aiohttp
import databases
import random
import hashlib
import time
import os
import yaml

if not os.path.exists("config.yml"):
    raise Exception("config.yml not found; please create one using the provided example_config.yml")
config = None
with open("config.yml", "rb") as config_file:
    config = yaml.safe_load(config_file)
print(config)
db = databases.Database(config["db-url"], password=config["db-password"])


# wordlist singleton, why not
class Wordlist:
    wordlist = None

    def __init__(self):
        pass

    @classmethod
    def get_list(cls):
        if cls.wordlist is None:
            print(os.listdir())
            with open("app/words.txt", "r") as words:
                cls.wordlist = words.read().split("\n")
        return cls.wordlist


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


class ApiException(Exception):
    def __init__(self, message: str, status_code: int):
        self.message = message
        self.status_code = status_code


_client_id = "956657160979374090"
_client_secret = "99zkVEX7Blps6WjJQaXzkahayZxeQ7rf"
_redirect_uri = "http://localhost:8000/register"
_grant_type = "authorization_code"
_headers = {'Content-Type': 'application/x-www-form-urlencoded'}


def gen_hash(text_to_hash: str):
    return hashlib.md5(bytes(text_to_hash, "utf-8")).hexdigest()[:10]


def gen_csrf():
    return gen_hash(str(random.SystemRandom().random() + time.time()))


def gen_mc_secret():
    return gen_csrf()


def gen_discord_oauth_payload(code: str, redirect_uri: typing.Optional[str] = None):
    if redirect_uri is None:
        redirect_uri = _redirect_uri
    return {
        "client_id": _client_id,
        "client_secret": _client_secret,
        "grant_type": _grant_type,
        "code": code,
        "redirect_uri": redirect_uri
    }


async def get_user_data(http_client: aiohttp.ClientSession,
                        code: str,
                        redirect_uri: typing.Optional[str] = None) -> typing.Dict[str, typing.Any]:
    if code is None:
        raise ApiException("This page must be accessed through the Discord OAuth flow.",
                           HTTPStatus.UNAUTHORIZED)
    res = await http_client.post("https://discord.com/api/v8/oauth2/token",
                                 data=gen_discord_oauth_payload(code, redirect_uri),
                                 headers=_headers)
    print(res.status)
    if res.status != 200:
        raise ApiException("Failed to retrieve OAuth data. "
                           "Please ensure you are not trying to break our website.",
                           HTTPStatus.FORBIDDEN)
    res = json.loads(await res.read())
    access_token: str = res["access_token"]
    refresh_token: str = res["refresh_token"]
    headers: dict[str, str] = {"Authorization": f"Bearer {access_token}"}
    res = await http_client.get("https://discord.com/api/v9/users/@me", headers=headers)
    res = json.loads(await res.read())
    # web token secret
    secret: str = gen_hash(access_token + res["id"])
    res['secret'] = secret
    res['avatar'] = f"https://cdn.discordapp.com/avatars/{res['id']}/{res['avatar']}.jpg"
    res['accesstoken'] = access_token
    res['refreshtoken'] = refresh_token
    res['discriminator'] = int(res['discriminator'])
    # res['id'] = int(res['id'])
    # sqlalchemy errors if it encounters a dict key for which the query has no matching parameter
    del res["public_flags"]
    del res["public_flags"]
    del res["flags"]
    del res["banner"]
    del res["banner_color"]
    del res["accent_color"]
    del res["locale"]
    del res["mfa_enabled"]
    print(res)
    return res


async def validate_user(session_token: str, csrf_token: str = None):
    users = await db.fetch_one("SELECT * from users where webToken = :sess_token",
                               {"sess_token": session_token})
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
