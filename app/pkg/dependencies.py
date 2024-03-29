import json
import typing
from http import HTTPStatus

import aiohttp
import databases
import datetime
import random
import hashlib
import time
import os

from fastapi import Request, Response

db = databases.Database("postgresql://{}@{}:5432/{}".format(
    os.getenv("POSTGRES_USER"),
    os.getenv("DB_HOSTNAME"),
    os.getenv("POSTGRES_DB"),
), password=os.getenv("POSTGRES_PASSWORD"))


# wordlist singleton, why not
class Wordlist:
    wordlist = None
    genlist = None

    def __init__(self):
        pass

    @classmethod
    def get_list(cls):
        if cls.wordlist is None:
            print(os.listdir())
            with open("words.txt", "r") as words:
                cls.wordlist = words.read().strip().split("\n")
        return cls.wordlist
    
    @classmethod
    def get_gen_list(cls):
        if cls.genlist is None:
            print(os.listdir())
            with open("popular_words.txt", "r") as words:
                cls.genlist = words.read().strip().split("\n")
        return cls.genlist

    @classmethod
    def get_random_word(cls):
        return random.choice(cls.get_gen_list())


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
    def __init__(self, status_code: int, error: str = None, comment: str = None, data: typing.Any = None):
        self.status_code = status_code
        self.error = error
        self.comment = comment
        self.data = data

client_id = os.getenv("CLIENT_ID")
client_secret = os.getenv("CLIENT_SECRET")
_grant_type = "authorization_code"
_headers = {'Content-Type': 'application/x-www-form-urlencoded'}


def gen_hash(text_to_hash: str):
    return hashlib.md5(bytes(text_to_hash, "utf-8")).hexdigest()[:10]


def gen_csrf():
    return gen_hash(str(random.SystemRandom().random() + time.time()))


def gen_mc_secret():
    return gen_csrf()


def validate_internal_request(req: Request) -> None:
    if 'Authorization' not in req.headers:
        raise ApiException(
            status_code=HTTPStatus.UNAUTHORIZED,
            error='TOKEN_REQUIRED',
            comment='This internal endpoint requires a secret token.'
        )
    if req.headers['Authorization'] != "Bearer " + os.getenv('INTERNAL_API_SECRET'):
        raise ApiException(
            status_code=HTTPStatus.UNAUTHORIZED,
            error='TOKEN_INVALID',
            comment='The provided secret token is invalid'
        )


def gen_discord_oauth_payload(code: str, redirect_uri: str):
    return {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": _grant_type,
        "code": code,
        "redirect_uri": redirect_uri
    }


async def get_user_auth_data(http_client: aiohttp.ClientSession,
                             code: str,
                             redirect_uri: str) -> typing.Dict[str, typing.Any]:
    if code is None:
        # TODO return an error and not just a comment
        raise ApiException(
            status_code=HTTPStatus.UNAUTHORIZED,
            error=None,
            comment="This page must be accessed through the Discord OAuth flow.")
    res = await http_client.post("https://discord.com/api/oauth2/token",
                                 data=gen_discord_oauth_payload(code, redirect_uri),
                                 headers=_headers)
    if res.status != 200:
        raise ApiException(
            status_code=HTTPStatus.FORBIDDEN,
            error=None,
            comment="Failed to retrieve OAuth data. Please ensure you are not trying to break our website.")
    res = json.loads(await res.read())
    access_token: str = res["access_token"]
    refresh_token: str = res["refresh_token"]
    headers: dict[str, str] = {"Authorization": f"Bearer {access_token}"}
    res = await http_client.get("https://discord.com/api/v9/users/@me", headers=headers)
    res = await res.json()
    # web token secret
    secret: str = gen_hash(access_token + res["id"])
    to_return = {
        "id": int(res["id"]),
        "username": res["username"],
        "discriminator": int(res["discriminator"]),
        "avatar": f"https://cdn.discordapp.com/avatars/{res['id']}/{res['avatar']}.webp",
        "secret": secret,
        "accesstoken": access_token,
        "refreshtoken": refresh_token,
        "cookie": {
            "key": "webToken",
            "value": secret,
            "samesite": "strict",
            "httponly": True,
            "secure": True
        }
    }
    # create a new user if they don't exist
    if not (await db.fetch_one("SELECT * FROM users WHERE snowflake = :id",
                               {"id": to_return["id"]})):
        to_return["should_set_cookie"] = True
        await db.execute("INSERT INTO users (snowflake, name, discriminator, avatar, wordleword, "
                         "accesstoken, refreshtoken, webtoken, csrftoken, csrfexpiry) VALUES (:id, "
                         ":name, :discriminator, :avatar, :wordleword, :accesstoken, "
                         ":refreshtoken, :webtoken, :csrftoken, :csrfexpiry)", {
            "id": to_return["id"], "name": to_return["username"],
            "discriminator": to_return["discriminator"], "avatar": to_return["avatar"],
            "wordleword": Wordlist.get_random_word(), "accesstoken": to_return["accesstoken"],
            "refreshtoken": to_return["refreshtoken"], "webtoken": to_return["secret"],
            "csrftoken": gen_csrf(),
            "csrfexpiry": datetime.datetime.utcnow() + datetime.timedelta(hours=12)
        })
    return to_return


async def get_session_data(req: Request) -> typing.Optional[typing.Dict[str, typing.Any]]:
    secret = req.cookies.get("webToken")
    status = await validate_user(secret)
    if not status:
        return None
    return dict(await db.fetch_one("SELECT * FROM users WHERE webToken = :secret", {"secret": secret}))


async def get_user_data(user_id: int) -> typing.Optional[typing.Dict[str, typing.Any]]:
    user = await db.fetch_one("SELECT * FROM users WHERE snowflake = :id", {"id": user_id})
    if user is None:
        return None
    return dict(user)


async def validate_user(session_token: str):
    users = await db.fetch_one("SELECT * from users where webToken = :sess_token",
                               {"sess_token": session_token})
    return bool(users)


async def validate_csrf(session_data):
    if os.getenv("SKIP_CSRF_VALIDATION") == "YES":
        return
    row = dict(await db.fetch_one("SELECT * FROM users WHERE snowflake = :id", {"id": session_data["snowflake"]}))
    if row["csrftoken"] != session_data["csrftoken"]:
        raise InvalidCSRFToken()
    if datetime.datetime.utcnow() > row["csrfexpiry"]:
        new_token = gen_csrf()
        new_expiry = datetime.datetime.utcnow() + datetime.timedelta(hours=12)
        await db.execute("UPDATE users SET csrfToken = :csrfToken, csrfExpiry = :csrfExpiry WHERE"
                         " snowflake = :id", {"csrfToken": new_token, "csrfExpiry": new_expiry,
                                              "id": session_data["snowflake"]})
        raise ExpiredCSRFToken()
    # -------------------------
    # if csrf_token is not None:
    #     if users["csrfToken"] is not csrf_token:
    #         return InvalidCSRFToken()
    #
    #     if datetime.datetime.utcnow() > users["csrfexpiry"]:
    #         new_token = gen_csrf()
    #         new_expiry = datetime.datetime.utcnow() + datetime.timedelta(hours=12)
    #         await db.execute("UPDATE users SET csrfToken = :csrfToken, csrfExpiry = :csrfExpiry",
    #                          {"csrfToken": new_token, "csrfExpiry": new_expiry})
    #         return ExpiredCSRFToken()

def user_to_api_response(user: typing.Dict) -> typing.Dict:
    return {
        'id': str(user['snowflake']),
        'name': user['name'],
        'discriminator': str(user['discriminator']).rjust(4, '0'),
        'avatar': user['avatar'],
        'diamonds': user['diamonds']
    }

async def get_user_profile_data(user_id:int) -> typing.Optional[typing.Dict[str, typing.Any]]:
    user = await db.fetch_one("SELECT * FROM users WHERE snowflake = :id", {"id": user_id})
    if user is None:
        return None
    return user_to_api_response(user)


async def session_user(req: Request, resp: Response, csrf: str = None):
    user = await get_session_data(req)
    if not user:
        raise ApiException(
            status_code=HTTPStatus.FORBIDDEN,
            error='USER_NOT_LOGGED_IN'
        )

    try:
        csrf_val = await validate_csrf(user)
    except InvalidCSRFToken:
        raise ApiException(
            status_code=HTTPStatus.FORBIDDEN,
            error='WRONG_CSRF_TOKEN',
            comment='Stop trying CSRF attacks!'
        )
    except ExpiredCSRFToken:
        raise ApiException(
            status_code=HTTPStatus.FORBIDDEN,
            error='EXPIRED_CSRF_TOKEN',
            comment='Refresh the page (or stop trying CSRF attacks!)'
        )

    return user

class InvalidCSRFToken(Exception):
    pass


class ExpiredCSRFToken(Exception):
    pass

class NoUser(Exception):
    pass
